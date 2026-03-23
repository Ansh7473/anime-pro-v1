import { Hono } from "hono";
import { cache } from "../../config/cache.js";
import type { ServerContext } from "../../config/context.js";
import { log } from "../../config/logger.js";
import crypto from "crypto";

const anilistHindiRouter = new Hono<ServerContext>();

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const TECHINMIND_HEADERS: Record<string, string> = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "User-Agent": USER_AGENT,
  Referer: "https://stream.techinmind.space/",
  Origin: "https://stream.techinmind.space",
};

const FILE_SLUG_API_KEY = "e11a7debaaa4f5d25b671706ffe4d2acb56efbd4";

// ── AniList → TMDB Mapping ─────────────────────────────────────────────
interface AnimeListEntry {
  tmdbId: string;
  tmdbType: "tv" | "movie";
  season: number | null;
  type: string;
  offset: number | null;
}

let mappingCache: Map<string, AnimeListEntry> | null = null;
let mappingLoadedAt = 0;

async function loadMapping(): Promise<Map<string, AnimeListEntry>> {
  const cacheAge = Date.now() - mappingLoadedAt;
  if (mappingCache && cacheAge < 24 * 60 * 60 * 1000) return mappingCache;

  const sources = [
    "https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json",
    "https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-full.json",
  ];

  let data: any[] | null = null;
  for (const url of sources) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) continue;
      const json = await res.json();
      data = Array.isArray(json) ? json : json?.list ?? null;
      if (data) break;
    } catch { /* try next */ }
  }

  if (!data) throw new Error("Failed to load anime-lists mapping");

  const map = new Map<string, AnimeListEntry>();
  for (const entry of data) {
    const al = entry.anilist_id ?? entry.idAL ?? entry.al_id;
    if (!al) continue;
    let tmdbId = entry.themoviedb_id ?? entry.tmdb_id ?? entry.tmdbtv ?? entry.tmdb_show_id ?? entry.tmdb_movie_id;
    if (!tmdbId) continue;
    if (typeof tmdbId === "string" && tmdbId.includes(",")) tmdbId = tmdbId.split(",")[0].trim();
    if (Array.isArray(tmdbId)) tmdbId = tmdbId[0];
    const season = entry.season?.tmdb ?? entry.tmdbseason ?? null;
    const type = entry.type ?? null;
    const offset = entry.tmdboffset ?? entry.tmdb_offset ?? null;
    const isTv = season != null || (type && type.toUpperCase() !== "MOVIE");
    map.set(String(al), {
      tmdbId: String(tmdbId),
      tmdbType: isTv ? "tv" : "movie",
      season: isTv ? (season ?? 1) : null,
      type: type ?? (isTv ? "TV" : "MOVIE"),
      offset: typeof offset === "number" ? offset : null,
    });
  }

  mappingCache = map;
  mappingLoadedAt = Date.now();
  log.info(`[AnilistHindi] Loaded mapping with ${map.size} entries`);
  return map;
}

async function mapAnilistToTmdb(anilistId: string): Promise<AnimeListEntry> {
  const map = await loadMapping();
  const rec = map.get(anilistId);
  if (!rec) throw Object.assign(new Error("AniList ID not found in mapping"), { code: "NOT_FOUND" });
  return rec;
}

// ── Step 1: File Slug ──────────────────────────────────────────────────
async function getFileSlug(tmdbId: string, season: string, episode: string, type = "series"): Promise<string> {
  const isMovie = type === "movie";
  const base = isMovie
    ? "https://stream.techinmind.space/mymovieapi"
    : "https://stream.techinmind.space/myseriesapi";

  const params = new URLSearchParams({ tmdbid: tmdbId, key: FILE_SLUG_API_KEY });
  if (!isMovie) { params.set("season", season); params.set("epname", episode); }

  const url = `${base}?${params}`;
  log.info(`[AnilistHindi] Step1 slug fetch: ${url}`);

  let res = await fetch(url, { headers: TECHINMIND_HEADERS, signal: AbortSignal.timeout(12000) });
  if (res.status === 403) {
    log.warn("[AnilistHindi] Step1 403, trying CORS proxy");
    res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(12000),
    });
  }
  if (!res.ok) throw new Error(`[NOT_FOUND] Slug API returned ${res.status}`);

  const data: any = await res.json();
  if (Array.isArray(data.data) && data.data[0]?.fileslug) return data.data[0].fileslug;
  if (data.data?.fileslug) return data.data.fileslug;
  throw new Error("[NOT_FOUND] fileslug not found in response");
}

// ── Step 2: Embed Data ─────────────────────────────────────────────────
async function getEmbedData(fileSlug: string): Promise<any> {
  const url = "https://ssn.techinmind.space/embedhelper.php";
  const referer = "https://pro.iqsmartgames.com/";
  const embedderDomainJson = JSON.stringify(["pro.iqsmartgames.com", "pro.iqsmartgames.com"]);

  const params = new URLSearchParams();
  params.append("sid", fileSlug);
  params.append("UserFavSite", "");
  params.append("currentDomain", embedderDomainJson);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      Referer: referer,
      Origin: "https://pro.iqsmartgames.com",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: params.toString(),
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) throw new Error(`Embed API returned ${res.status}`);
  const data: any = await res.json();
  if (!data.mresult) throw new Error("No mresult in embed response");
  return data;
}

// ── Step 3: Process Embed ─────────────────────────────────────────────
const URL_SUFFIXES: Record<string, string> = {
  plrx: "/",
  stmrb: ".html",
  strmtp: "/",
  dpld: "?srv10.dropload.io/i/01/00118/uv0mx9c9xicj",
};

function processEmbedData(data: any): Array<{ provider: string; id: string; url: string }> {
  const { mresult, siteUrls, siteFriendlyNames } = data;
  let decoded: Record<string, string>;
  try {
    decoded = JSON.parse(Buffer.from(mresult, "base64").toString("utf-8"));
  } catch { return []; }

  return Object.entries(decoded).map(([key, id]) => {
    const name = (siteFriendlyNames?.[key]) || key;
    const base = (siteUrls?.[key]) || "";
    const suffix = URL_SUFFIXES[key] || "";
    return { provider: name, id: String(id), url: base ? `${base}${id}${suffix}` : "" };
  }).filter(s => s.url);
}

// ── Step 4: Universal HLS Extraction ─────────────────────────────────
interface HlsResult {
  streamUrl: string;
  headers: Record<string, string>;
}

const EXTRACTOR_PATTERNS: Array<{
  test: (url: string) => boolean;
  extract: (url: string) => Promise<HlsResult | null>;
}> = [
  // StreamWish / FileMoon pattern
  {
    test: (u) => /streamwish|filemoon|fmoonembed/i.test(u),
    extract: async (url) => {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Referer: url },
        signal: AbortSignal.timeout(10000),
      });
      const html = await res.text();
      const m = html.match(/file:\s*"(https?:\/\/[^"]+\.m3u8[^"]*)"/);
      if (!m) return null;
      return { streamUrl: m[1], headers: { Referer: url, "User-Agent": USER_AGENT } };
    },
  },
  // Generic m3u8 in page
  {
    test: () => true,
    extract: async (url) => {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": USER_AGENT, Referer: url },
          signal: AbortSignal.timeout(8000),
        });
        const html = await res.text();
        const m = html.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)/);
        if (!m) return null;
        return { streamUrl: m[1], headers: { Referer: url, "User-Agent": USER_AGENT } };
      } catch { return null; }
    },
  },
];

async function extractHls(url: string): Promise<HlsResult | null> {
  for (const extractor of EXTRACTOR_PATTERNS) {
    if (!extractor.test(url)) continue;
    try {
      const result = await extractor.extract(url);
      if (result) return result;
    } catch { /* try next */ }
  }
  return null;
}

// ── Main Episode Endpoint ─────────────────────────────────────────────
anilistHindiRouter.get("/episode", async (c) => {
  const cacheConfig = c.get("CACHE_CONFIG");
  const anilistId = c.req.query("anilistId");
  const malId = c.req.query("malId");          // not used directly but accepted for compat
  const episodeStr = c.req.query("episode");
  const seasonOverride = c.req.query("season");
  const typeOverride = c.req.query("type");

  if (!anilistId && !malId) {
    return c.json({ provider: "Tatakai", error: "Missing anilistId parameter" }, 400);
  }
  if (!episodeStr) {
    return c.json({ provider: "Tatakai", error: "Missing episode parameter" }, 400);
  }

  const cacheKey = `anilisthindi:episode:${anilistId || malId}:${seasonOverride || "auto"}:${episodeStr}`;

  try {
    const data = await cache.getOrSet(async () => {
      // 1. AniList → TMDB mapping
      let tmdbId: string;
      let season: string;
      let type: string;
      let episodeNum = parseInt(episodeStr, 10);

      if (anilistId) {
        const mapping = await mapAnilistToTmdb(anilistId);
        tmdbId = mapping.tmdbId;
        type = typeOverride || (mapping.tmdbType === "movie" ? "movie" : "series");
        season = seasonOverride || String(mapping.season ?? 1);
        // Apply episode offset if any
        if (mapping.offset && !isNaN(episodeNum)) {
          episodeNum += mapping.offset;
        }
      } else {
        return null; // malId path not supported here
      }

      const episode = String(episodeNum);

      log.info(`[AnilistHindi] AniList ${anilistId} → TMDB ${tmdbId} (${type}) S${season}E${episode}`);

      // 2. Get file slug
      const fileSlug = await getFileSlug(tmdbId, season, episode, type);
      log.info(`[AnilistHindi] Slug: ${fileSlug}`);

      // 3. Get embed data
      const embedData = await getEmbedData(fileSlug);

      // 4. Process streams
      const rawStreams = processEmbedData(embedData);
      log.info(`[AnilistHindi] ${rawStreams.length} raw streams`);

      // 5. Universal HLS extraction (parallel, with timeout)
      const enrichedStreams = await Promise.all(
        rawStreams.map(async (stream) => {
          try {
            const hlsData = await Promise.race([
              extractHls(stream.url),
              new Promise<null>(resolve => setTimeout(() => resolve(null), 8000)),
            ]);
            if (hlsData) {
              return { ...stream, dhls: hlsData.streamUrl, headers: hlsData.headers };
            }
          } catch { /* fall through */ }
          return stream;
        })
      );

      return {
        meta: { anilistId, tmdbId, season, episode, slug: fileSlug },
        streams: enrichedStreams,
      };
    }, cacheKey, cacheConfig.duration);

    if (!data) {
      return c.json({ provider: "Tatakai", error: "No data found" }, 404);
    }

    return c.json({ provider: "Tatakai", status: 200, data });
  } catch (error: any) {
    const isNotFound = error?.code === "NOT_FOUND" || error?.message?.includes("NOT_FOUND");
    log.warn(`[AnilistHindi] ${isNotFound ? "NOT_FOUND" : "Error"}: ${error?.message}`);
    return c.json(
      { provider: "Tatakai", error: error?.message || "Internal error" },
      isNotFound ? 404 : 500
    );
  }
});

// ── Proxy HLS endpoint (for CORS) ──────────────────────────────────────
anilistHindiRouter.get("/proxy", async (c) => {
  const url = c.req.query("url");
  const referer = c.req.query("referer") || "";
  if (!url) return c.json({ error: "Missing url" }, 400);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        ...(referer ? { Referer: referer } : {}),
      },
      signal: AbortSignal.timeout(15000),
    });
    const body = await res.arrayBuffer();
    return new Response(body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 502);
  }
});

export { anilistHindiRouter };
