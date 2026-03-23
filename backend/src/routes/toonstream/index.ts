import { Hono } from "hono";
import { cache } from "../../config/cache.js";
import type { ServerContext } from "../../config/context.js";
import { log } from "../../config/logger.js";

const toonStreamRouter = new Hono<ServerContext>();

const TOONSTREAM_API = "https://toonstream-api.ry4n.qzz.io/api";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ── Friendly name map for ToonStream embed servers ──────────────────────
export const TOONSTREAM_SERVER_NAMES: Record<string, string> = {
  short: "Short",
  ruby: "Ruby",
  cloudy: "Cloudy",
  strmup: "Strmup",
  "watch/dl": "Watch/DL",
  turbo: "Turbo",
  moly: "Moly",
  filemoon: "Filemoon",
  streamwish: "StreamWish",
  doodstream: "DoodStream",
  mp4upload: "Mp4Upload",
  vidhide: "VidHide",
  streamtape: "Streamtape",
};

// ── Types ──────────────────────────────────────────────────────────────
interface ToonStreamHomeResponse {
  success: boolean;
  data: {
    latestSeries: Array<{ id: string; title: string; url: string; poster: string }>;
    latestMovies: Array<{ id: string; title: string; url: string; poster: string }>;
    trending: any[];
    schedule: Record<string, any>;
  };
}

interface ToonStreamEpisodeSource {
  type: string;
  url: string;
  quality: string;
}

interface ToonStreamServer {
  name: string;
  id: string;
}

interface ToonStreamEpisodeResponse {
  success: boolean;
  episodeId: string;
  title: string;
  season: number;
  episode: number;
  sources: ToonStreamEpisodeSource[];
  downloads: any[];
  languages: string[];
  servers: ToonStreamServer[];
}

async function fetchToonStream<T>(path: string): Promise<T | null> {
  const url = `${TOONSTREAM_API}${path}`;
  log.info(`[ToonStream] Fetching: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      log.warn(`[ToonStream] Upstream returned ${response.status} for ${path}`);
      return null;
    }

    return response.json() as Promise<T>;
  } catch (error) {
    log.warn(`[ToonStream] Fetch failed for ${path}: ${error}`);
    return null;
  }
}

// ========== HOME ==========
toonStreamRouter.get("/home", async (c) => {
  const cacheConfig = c.get("CACHE_CONFIG");

  try {
    const data = await cache.getOrSet(async () => {
      const res = await fetchToonStream<ToonStreamHomeResponse>("/home");
      if (!res || !res.success) return null;
      return res.data;
    }, cacheConfig.key, cacheConfig.duration);

    if (!data) {
      return c.json({ provider: "Tatakai", status: 404, error: "No data from ToonStream" }, 404);
    }

    return c.json({ provider: "Tatakai", status: 200, data });
  } catch (error) {
    log.warn(`[ToonStream] Home route error: ${error}`);
    return c.json({ provider: "Tatakai", status: 502, error: "ToonStream upstream unavailable" }, 502);
  }
});

// ========== EPISODE SOURCES ==========
// Pattern: /episode/:slug  where slug = animename-{season}x{episode}
// e.g. /episode/an-adventurers-daily-grind-at-age-29-1x3
toonStreamRouter.get("/episode/:slug", async (c) => {
  const cacheConfig = c.get("CACHE_CONFIG");
  const slug = c.req.param("slug");

  if (!slug) {
    return c.json({ provider: "Tatakai", status: 400, error: "Missing episode slug" }, 400);
  }

  try {
    const data = await cache.getOrSet(async () => {
      const res = await fetchToonStream<ToonStreamEpisodeResponse>(`/episode/${slug}`);
      if (!res || !res.success) return null;

      // Map sources to a normalized format with friendly server names
      const servers = res.servers || [];
      const sources = res.sources.map((src, idx) => {
        const serverInfo = servers[idx] || { name: `Server ${idx + 1}`, id: `server-${idx}` };
        const friendlyName =
          TOONSTREAM_SERVER_NAMES[serverInfo.id.toLowerCase()] ||
          TOONSTREAM_SERVER_NAMES[serverInfo.name.toLowerCase()] ||
          serverInfo.name;

        return {
          url: src.url,
          type: src.type,
          quality: src.quality,
          serverName: friendlyName,
          serverId: serverInfo.id,
        };
      });

      return {
        episodeId: res.episodeId,
        title: res.title,
        season: res.season,
        episode: res.episode,
        sources,
        languages: res.languages || [],
        downloads: res.downloads || [],
      };
    }, cacheConfig.key, cacheConfig.duration);

    if (!data) {
      return c.json({ provider: "Tatakai", status: 404, error: "Episode not found on ToonStream" }, 404);
    }

    return c.json({ provider: "Tatakai", status: 200, data });
  } catch (error) {
    log.warn(`[ToonStream] Episode route error for ${slug}: ${error}`);
    return c.json({ provider: "Tatakai", status: 502, error: "ToonStream upstream unavailable" }, 502);
  }
});

// ========== WATCH (combined helper) ==========
// /watch/:animeName?season=1&episode=3
// Builds the slug automatically: animename-{season}x{episode}
toonStreamRouter.get("/watch/:animeName", async (c) => {
  const cacheConfig = c.get("CACHE_CONFIG");
  const animeName = c.req.param("animeName");
  const season = parseInt(c.req.query("season") || "1", 10);
  const episode = parseInt(c.req.query("episode") || "1", 10);

  if (!animeName) {
    return c.json({ provider: "Tatakai", status: 400, error: "Missing animeName" }, 400);
  }

  const slug = `${animeName}-${season}x${episode}`;

  try {
    const data = await cache.getOrSet(async () => {
      const res = await fetchToonStream<ToonStreamEpisodeResponse>(`/episode/${slug}`);
      if (!res || !res.success) return null;

      const servers = res.servers || [];
      const sources = res.sources.map((src, idx) => {
        const serverInfo = servers[idx] || { name: `Server ${idx + 1}`, id: `server-${idx}` };
        const friendlyName =
          TOONSTREAM_SERVER_NAMES[serverInfo.id.toLowerCase()] ||
          TOONSTREAM_SERVER_NAMES[serverInfo.name.toLowerCase()] ||
          serverInfo.name;

        return {
          url: src.url,
          type: src.type,
          quality: src.quality,
          serverName: friendlyName,
          serverId: serverInfo.id,
        };
      });

      return {
        episodeId: res.episodeId,
        title: res.title,
        season: res.season,
        episode: res.episode,
        sources,
        languages: res.languages || [],
        downloads: res.downloads || [],
      };
    }, cacheConfig.key, cacheConfig.duration);

    if (!data) {
      return c.json({ provider: "Tatakai", status: 404, error: "Episode not found on ToonStream" }, 404);
    }

    return c.json({ provider: "Tatakai", status: 200, data });
  } catch (error) {
    log.warn(`[ToonStream] Watch route error for ${slug}: ${error}`);
    return c.json({ provider: "Tatakai", status: 502, error: "ToonStream upstream unavailable" }, 502);
  }
});

// ========== ROOT ==========
toonStreamRouter.get("/", (c) => {
  return c.json({
    provider: "Tatakai",
    status: 200,
    message: "ToonStream API Proxy - Hindi Multi-Language Anime Embeds",
    endpoints: {
      home: "/api/v1/toonstream/home",
      episode: "/api/v1/toonstream/episode/:slug (e.g. anime-name-1x3)",
      watch: "/api/v1/toonstream/watch/:animeName?season=1&episode=3",
    },
    serverNames: TOONSTREAM_SERVER_NAMES,
  });
});

export { toonStreamRouter };
