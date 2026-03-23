import { Hono } from "hono";
import * as cheerio from "cheerio";
import { cache } from "../../config/cache.js";
import type { ServerContext } from "../../config/context.js";
import { log } from "../../config/logger.js";

const toonWorldRouter = new Hono<ServerContext>();

const BASE_URL = "https://archive.toonworld4all.me";
const HLS_CDN_BASE = "https://hlsx3cdn.echovideo.to";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ── Types ─────────────────────────────────────────────────────────────
interface ToonWorldSource {
  provider: string;
  url: string;
  type: "iframe" | "hls";
  isM3U8: boolean;
  quality?: string;
  langCode?: string;
}

interface ToonWorldResult {
  slug: string;
  season: number;
  episode: number;
  pageUrl: string;
  sources: ToonWorldSource[];
}

// ── Helpers ────────────────────────────────────────────────────────────
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: BASE_URL,
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      log.warn(`[ToonWorld] HTTP ${res.status} for ${url}`);
      return null;
    }
    return res.text();
  } catch (e: any) {
    log.warn(`[ToonWorld] Fetch failed for ${url}: ${e.message}`);
    return null;
  }
}

// ── Episode Sources ───────────────────────────────────────────────────
async function getEpisodeSources(
  animeSlug: string,
  season: number,
  episode: number
): Promise<ToonWorldResult> {
  const episodeSlug = `${animeSlug}-${season}x${episode}`;
  const pageUrl = `${BASE_URL}/episode/${episodeSlug}`;

  log.info(`[ToonWorld] Fetching episode: ${pageUrl}`);

  const sources: ToonWorldSource[] = [];

  // ── Direct HLS (EchoVideo CDN — hardsubbed) ──────────────────────────
  const hlsUrl = `${HLS_CDN_BASE}/${animeSlug}/${episode}/master.m3u8`;
  sources.push({
    provider: "EchoVideo CDN (Hard Subs)",
    url: hlsUrl,
    type: "hls",
    isM3U8: true,
    quality: "HD",
    langCode: "toonworld-hls",
  });

  // ── Iframe extraction ─────────────────────────────────────────────────
  const html = await fetchPage(pageUrl);
  if (html) {
    const $ = cheerio.load(html);

    // Madara theme: iframe in .entry-content, .video-content, or #watch-online
    const iframeSources: string[] = [];

    // Primary: iframe with allowfullscreen attr (the embed player)
    $("iframe[allowfullscreen], iframe[src]").each((_, el) => {
      const src = $(el).attr("src") || "";
      if (src && !src.startsWith("#") && !src.startsWith("javascript")) {
        iframeSources.push(src);
      }
    });

    // Fallback: data-src lazy loaded iframes
    $("iframe[data-src]").each((_, el) => {
      const src = $(el).attr("data-src") || "";
      if (src) iframeSources.push(src);
    });

    // Also look for direct m3u8 in page scripts
    const scriptContent = $("script").map((_, el) => $(el).html() || "").get().join("\n");
    const m3u8Match = scriptContent.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)/);
    if (m3u8Match) {
      sources.push({
        provider: "ToonWorld4ALL (Direct)",
        url: m3u8Match[1],
        type: "hls",
        isM3U8: true,
        quality: "HD",
        langCode: "toonworld-direct",
      });
    }

    // Deduplicate and add iframes
    const seenIframes = new Set<string>();
    iframeSources.forEach((src, idx) => {
      if (seenIframes.has(src)) return;
      seenIframes.add(src);
      sources.push({
        provider: idx === 0 ? "ToonWorld4ALL" : `ToonWorld4ALL [Mirror ${idx + 1}]`,
        url: src,
        type: "iframe",
        isM3U8: false,
        langCode: `toonworld-iframe-${idx}`,
      });
    });

    log.info(`[ToonWorld] Found ${sources.length} sources from page (${iframeSources.length} iframes)`);
  }

  return { slug: episodeSlug, season, episode, pageUrl, sources };
}

// ── Search ────────────────────────────────────────────────────────────
async function searchAnime(query: string): Promise<Array<{ title: string; slug: string; url: string }>> {
  const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
  const html = await fetchPage(searchUrl);
  if (!html) return [];

  const $ = cheerio.load(html);
  const results: Array<{ title: string; slug: string; url: string }> = [];

  // Madara search results
  $(".search-wrap article, .c-tabs-item__content, article.item-thumb").each((_, el) => {
    const titleEl = $(el).find(".post-title a, h3 a, .h2 a, a[href*='/anime/']").first();
    const title = titleEl.text().trim();
    const url = titleEl.attr("href") || "";
    if (title && url) {
      const slugMatch = url.match(/\/anime\/([^/]+)/);
      const slug = slugMatch?.[1] || slugify(title);
      results.push({ title, slug, url });
    }
  });

  // Alternative pattern
  if (results.length === 0) {
    $("a[href*='/anime/']").each((_, el) => {
      const url = $(el).attr("href") || "";
      const title = $(el).text().trim() || $(el).attr("title") || "";
      if (title && url && !results.some(r => r.url === url)) {
        const slugMatch = url.match(/\/anime\/([^/]+)/);
        results.push({ title, slug: slugMatch?.[1] || slugify(title), url });
      }
    });
  }

  return results.slice(0, 10);
}

// ── Routes ────────────────────────────────────────────────────────────

// GET /toonworld/episode?slug={anime-slug}&season={s}&episode={ep}
// Also supports: ?anime={anime-name}&season={s}&episode={ep}
toonWorldRouter.get("/episode", async (c) => {
  const cacheConfig = c.get("CACHE_CONFIG");

  const slug = c.req.query("slug");
  const animeName = c.req.query("anime");
  const seasonStr = c.req.query("season") || "1";
  const episodeStr = c.req.query("episode");

  if (!slug && !animeName) {
    return c.json({ provider: "Tatakai", error: "Missing slug or anime parameter" }, 400);
  }
  if (!episodeStr) {
    return c.json({ provider: "Tatakai", error: "Missing episode parameter" }, 400);
  }

  let animeSlug = slug || slugify(animeName!);
  const season = parseInt(seasonStr, 10) || 1;
  const episode = parseInt(episodeStr, 10);

  if (isNaN(episode)) {
    return c.json({ provider: "Tatakai", error: "Invalid episode number" }, 400);
  }

  // If only animeName given, search first
  if (!slug && animeName) {
    const searchResults = await searchAnime(animeName);
    if (searchResults.length > 0) {
      animeSlug = searchResults[0].slug;
      log.info(`[ToonWorld] Search found slug: ${animeSlug} for "${animeName}"`);
    }
  }

  const cacheKey = `toonworld:episode:${animeSlug}:${season}:${episode}`;

  try {
    const data = await cache.getOrSet(async () => {
      return getEpisodeSources(animeSlug, season, episode);
    }, cacheKey, Math.min(cacheConfig.duration, 1800));

    if (!data || data.sources.length === 0) {
      return c.json({ provider: "Tatakai", status: 404, error: "No sources found" }, 404);
    }

    return c.json({ provider: "Tatakai", status: 200, data });
  } catch (e: any) {
    log.error(`[ToonWorld] Error: ${e.message}`);
    return c.json({ provider: "Tatakai", error: e.message }, 500);
  }
});

// GET /toonworld/search?q={query}
toonWorldRouter.get("/search", async (c) => {
  const q = c.req.query("q");
  if (!q) return c.json({ provider: "Tatakai", error: "Missing q" }, 400);

  try {
    const results = await searchAnime(q);
    return c.json({ provider: "Tatakai", status: 200, results });
  } catch (e: any) {
    log.error(`[ToonWorld] Search error: ${e.message}`);
    return c.json({ provider: "Tatakai", error: e.message }, 500);
  }
});

export { toonWorldRouter };
