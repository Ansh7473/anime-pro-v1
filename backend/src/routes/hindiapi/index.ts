import { Hono } from "hono";
import { cache } from "../../config/cache.js";
import type { ServerContext } from "../../config/context.js";
import { log } from "../../config/logger.js";
import crypto from "crypto";

const hindiApiRouter = new Hono<ServerContext>();

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

const URL_SUFFIXES_EMBED: Record<string, string> = {
  plrx: "/",
  stmrb: ".html",
  strmtp: "/",
  dpld: "?srv10.dropload.io/i/01/00118/uv0mx9c9xicj",
};

const FILE_SLUG_API_KEY = "e11a7debaaa4f5d25b671706ffe4d2acb56efbd4";

// ── Types ──────────────────────────────────────────────────────────────
interface EmbedStream {
  provider: string;
  id: string;
  url: string;
  dhls?: string;  // direct HLS
  phls?: string;  // proxied HLS
  headers?: Record<string, string>;
}

interface HindiApiResult {
  meta: {
    tmdbId: string;
    season: string;
    episode: string;
    slug: string;
  };
  streams: EmbedStream[];
}

// ── Step 1: Get File Slug ──────────────────────────────────────────────
async function getFileSlug(
  tmdbId: string,
  season: string,
  episode: string,
  type: string = "series"
): Promise<string> {
  const isMovie = type === "movie";
  const baseUrl = isMovie
    ? "https://stream.techinmind.space/mymovieapi"
    : "https://stream.techinmind.space/myseriesapi";

  const params = new URLSearchParams({ tmdbid: tmdbId, key: FILE_SLUG_API_KEY });
  if (!isMovie) {
    params.set("season", season);
    params.set("epname", episode);
  }

  const url = `${baseUrl}?${params.toString()}`;
  log.info(`[HindiAPI] Step 1 - Fetching file slug: ${url}`);

  let response = await fetch(url, {
    headers: TECHINMIND_HEADERS,
    signal: AbortSignal.timeout(10000),
  });

  // 403 fallback via CORS proxy
  if (response.status === 403) {
    log.warn("[HindiAPI] Step 1 - 403, trying CORS proxy");
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    response = await fetch(proxyUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
  }

  if (!response.ok) {
    throw new Error(`[NOT_FOUND] File slug API returned ${response.status}`);
  }

  const data: any = await response.json();

  if (Array.isArray(data.data) && data.data.length > 0 && data.data[0].fileslug) {
    return data.data[0].fileslug;
  }
  if (data.data?.fileslug) return data.data.fileslug;

  throw new Error("[NOT_FOUND] File slug not found in response");
}

// ── Step 2: Get Embed Data ─────────────────────────────────────────────
async function getEmbedData(fileSlug: string): Promise<any> {
  const url = "https://ssn.techinmind.space/embedhelper.php";

  const referrerDomain = "pro.iqsmartgames.com";
  const embedderDomainJson = JSON.stringify([referrerDomain, referrerDomain]);

  const body = new URLSearchParams();
  body.append("sid", fileSlug);
  body.append("UserFavSite", "");
  body.append("currentDomain", embedderDomainJson);

  log.info(`[HindiAPI] Step 2 - Fetching embed data for slug: ${fileSlug}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      Referer: "https://pro.iqsmartgames.com/",
      Origin: "https://pro.iqsmartgames.com",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: body.toString(),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Embed API returned ${response.status}`);
  }

  const data: any = await response.json();
  if (!data.mresult) {
    throw new Error("No mresult in embed response");
  }

  return data;
}

// ── Step 3: Process Embed Data ─────────────────────────────────────────
function processEmbedData(data: any): EmbedStream[] {
  const { mresult, siteUrls, siteFriendlyNames } = data;

  let decodedMresult: Record<string, string>;
  try {
    const buffer = Buffer.from(mresult, "base64");
    decodedMresult = JSON.parse(buffer.toString("utf-8"));
  } catch {
    log.error("[HindiAPI] Failed to decode mresult");
    return [];
  }

  const results: EmbedStream[] = [];
  for (const [key, id] of Object.entries(decodedMresult)) {
    const name =
      siteFriendlyNames && siteFriendlyNames[key] ? siteFriendlyNames[key] : key;
    const baseUrl = siteUrls && siteUrls[key] ? siteUrls[key] : "";
    const suffix = URL_SUFFIXES_EMBED[key] || "";

    if (baseUrl) {
      results.push({
        provider: name,
        id,
        url: `${baseUrl}${id}${suffix}`,
      });
    }
  }

  return results;
}

// ── Universal HLS Extraction helpers ───────────────────────────────────
const UPNS_KEY_HEX = "6b69656d7469656e6d75613931316361";

function decryptUpns(encryptedHexStr: string, keyHex: string): string | null {
  try {
    const keyBytes = Buffer.from(keyHex, "hex");
    const fullPayload = Buffer.from(encryptedHexStr.trim(), "hex");
    if (fullPayload.length < 16) return null;

    const iv = fullPayload.subarray(0, 16);
    const ciphertext = fullPayload.subarray(16);

    const decipher = crypto.createDecipheriv("aes-128-cbc", keyBytes, iv);
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString("utf-8");
  } catch {
    return null;
  }
}

async function extractFromUpns(playerUrl: string) {
  try {
    const urlObj = new URL(playerUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    const headers = { "User-Agent": USER_AGENT, Referer: `${baseUrl}/` };

    let videoId: string | null = null;
    const hashMatch = playerUrl.match(/#([a-zA-Z0-9]+)$/);
    if (hashMatch) videoId = hashMatch[1];
    if (!videoId) {
      videoId = urlObj.searchParams.get("id") || urlObj.searchParams.get("video");
    }
    if (!videoId) {
      const pathMatch = playerUrl.match(/\/([a-zA-Z0-9]{5,})(?:\/|$|#)/);
      if (pathMatch) videoId = pathMatch[1];
    }
    if (!videoId) return null;

    const apiUrl = `${baseUrl}/api/v1/video?id=${videoId}&w=1920&h=1200&r=`;
    const res = await fetch(apiUrl, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();

    const decrypted = decryptUpns(text, UPNS_KEY_HEX);
    if (!decrypted) return null;

    const sourceMatch = decrypted.match(/"source"\s*:\s*"([^"]+)"/);
    if (!sourceMatch) return null;

    let streamUrl = sourceMatch[1].replace(/\\\//g, "/");
    if (!streamUrl.startsWith("http")) streamUrl = new URL(streamUrl, baseUrl).toString();

    return { streamUrl, headers: { ...headers, Origin: baseUrl } };
  } catch {
    return null;
  }
}

function decodePrintable95(encodedHexStr: string, shift: number): string {
  try {
    const intermediate = Buffer.from(encodedHexStr, "hex").toString("latin1");
    let decoded = "";
    for (let i = 0; i < intermediate.length; i++) {
      const s = intermediate.charCodeAt(i) - 32;
      const r = (s - shift - i) % 95;
      decoded += String.fromCharCode(r + 32);
    }
    return decoded;
  } catch {
    return "";
  }
}

async function extractFromStrmup(playerUrl: string) {
  try {
    const res = await fetch(playerUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    const urlObj = new URL(playerUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

    let streamUrl: string | null = null;

    if (html.includes("decodePrintable95")) {
      const encodedMatch = html.match(/decodePrintable95\("([a-f0-9]+)"/);
      const shiftMatch = html.match(/__enc_shift\s*=\s*(\d+)/);
      if (encodedMatch && shiftMatch) {
        streamUrl = decodePrintable95(encodedMatch[1], parseInt(shiftMatch[1]));
      }
    }

    if (!streamUrl) {
      const mediaId = playerUrl.split("/").pop();
      try {
        const sRes = await fetch(`${baseUrl}/ajax/stream?filecode=${mediaId}`, {
          headers: { "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(5000),
        });
        const sJson: any = await sRes.json();
        if (sJson?.streaming_url) streamUrl = sJson.streaming_url;
      } catch {}
    }

    if (streamUrl) {
      return {
        streamUrl,
        headers: { "User-Agent": USER_AGENT, Referer: `${baseUrl}/`, Origin: baseUrl },
      };
    }
    return null;
  } catch {
    return null;
  }
}

function ft(e: string): Buffer {
  let t = e.replace(/-/g, "+").replace(/_/g, "/");
  const r = t.length % 4 === 0 ? 0 : 4 - (t.length % 4);
  return Buffer.from(t + "=".repeat(r), "base64");
}

function xn(parts: string[]): Buffer {
  return Buffer.concat(parts.map((p) => ft(p)));
}

async function extractFromBsye(url: string) {
  try {
    const match = url.match(/\/(?:e|d)\/([0-9a-zA-Z]+)/);
    if (!match) return null;
    const mediaId = match[1];
    const parsedUrl = new URL(url);
    const host = parsedUrl.host;
    const apiUrl = `https://${host}/api/videos/${mediaId}/embed/playback`;

    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: url,
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });
    const json: any = await res.json();

    let sources = json?.sources;
    if (!sources && json?.playback) {
      try {
        const pd = json.playback;
        const iv = ft(pd.iv);
        const key = xn(pd.key_parts);
        const payload = ft(pd.payload);
        const tagLen = 16;
        const ciphertext = payload.subarray(0, payload.length - tagLen);
        const tag = payload.subarray(payload.length - tagLen);
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv) as crypto.DecipherGCM;
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(ciphertext);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        sources = JSON.parse(decrypted.toString("utf8")).sources;
      } catch {}
    }

    if (sources?.length > 0) {
      const hlsSource =
        sources.find((s: any) => (s.file || s.url || s.src || "").includes(".m3u8")) || sources[0];
      const fileUrl = hlsSource.file || hlsSource.url || hlsSource.src;
      if (fileUrl) {
        return {
          streamUrl: fileUrl,
          headers: { "User-Agent": USER_AGENT, Referer: `https://${host}/`, Origin: `https://${host}` },
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function unpack(packed: string): string | null {
  try {
    const argsStart = packed.indexOf("}('");
    if (argsStart === -1) return null;
    const splitIndex = packed.lastIndexOf(".split('|')");
    if (splitIndex === -1) return null;
    const argsBody = packed.substring(argsStart + 2, splitIndex);
    const separatorRegex = /',(\d+),(\d+),'/g;
    let m: RegExpExecArray | null;
    let lastMatch: RegExpExecArray | null = null;
    while ((m = separatorRegex.exec(argsBody)) !== null) lastMatch = m;
    if (!lastMatch) return null;
    const radix = parseInt(lastMatch[1]);
    const count = parseInt(lastMatch[2]);
    const payload = argsBody.substring(0, lastMatch.index);
    const keywordsPart = argsBody.substring(lastMatch.index + lastMatch[0].length);
    const keywords = keywordsPart.substring(0, keywordsPart.length - 1).split("|");

    const decode = (c: number): string =>
      (c < radix ? "" : decode(Math.floor(c / radix))) +
      ((c = c % radix) > 35 ? String.fromCharCode(c + 29) : c.toString(36));

    let unpacked = payload;
    for (let i = count - 1; i >= 0; i--) {
      if (keywords[i]) {
        unpacked = unpacked.replace(new RegExp("\\b" + decode(i) + "\\b", "g"), keywords[i]);
      }
    }
    return unpacked;
  } catch {
    return null;
  }
}

async function extractFromSwish(playerUrl: string) {
  try {
    const res = await fetch(playerUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    let streamUrl: string | null = null;

    const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\).*?\.split\('\|'\)\)\)/);
    if (packedMatch) {
      const unpacked = unpack(packedMatch[0]);
      if (unpacked) {
        const m3u8 = unpacked.match(/https?:\/\/[^"']+\.m3u8[^"']*/);
        if (m3u8) streamUrl = m3u8[0];
      }
    }
    if (!streamUrl) {
      const m3u8 = html.match(/https?:\/\/[^"']+\.m3u8[^"']*/);
      if (m3u8) streamUrl = m3u8[0];
    }

    if (streamUrl) {
      return {
        streamUrl: streamUrl.replace(/\\/g, ""),
        headers: { "User-Agent": USER_AGENT, Referer: playerUrl, Origin: new URL(playerUrl).origin },
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function extractGeneric(playerUrl: string) {
  try {
    const res = await fetch(playerUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    const html = (await res.text())
      .replace(/\\u002F/g, "/")
      .replace(/\\\//g, "/")
      .replace(/&amp;/g, "&");
    const m = html.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/);
    if (m) return { streamUrl: m[1], headers: { "User-Agent": USER_AGENT, Referer: playerUrl } };
    return null;
  } catch {
    return null;
  }
}

async function extractUniversal(playerUrl: string) {
  if (!playerUrl) return null;
  try {
    const hostname = new URL(playerUrl).hostname;

    if (
      hostname.includes("uns.bio") ||
      hostname.includes("upns.one") ||
      hostname.includes("rpmhub.site") ||
      hostname.includes("p2pplay.pro")
    ) {
      return await extractFromUpns(playerUrl);
    }
    if (hostname.includes("strmup") || hostname.includes("streamup")) {
      return await extractFromStrmup(playerUrl);
    }
    if (hostname.includes("multimoviesshg.com")) {
      const r = await extractFromSwish(playerUrl);
      if (r) return r;
    }
    if (playerUrl.includes("/e/") || playerUrl.includes("/d/")) {
      const r = await extractFromBsye(playerUrl);
      if (r) return r;
    }
    return await extractGeneric(playerUrl);
  } catch {
    return null;
  }
}

// ── TMDB ID Resolution ─────────────────────────────────────────────────
async function resolveToTmdbId(params: {
  tmdbId?: string;
  malId?: string;
  anilistId?: string;
}): Promise<string | null> {
  if (params.tmdbId) return params.tmdbId;

  // Use arm.haglund.dev to map MAL/AniList → TMDB
  try {
    let armUrl: string;
    if (params.malId) {
      armUrl = `https://arm.haglund.dev/api/v2/ids?source=myanimelist&id=${params.malId}`;
    } else if (params.anilistId) {
      armUrl = `https://arm.haglund.dev/api/v2/ids?source=anilist&id=${params.anilistId}`;
    } else {
      return null;
    }

    log.info(`[HindiAPI] Resolving TMDB ID via arm.haglund.dev: ${armUrl}`);
    const res = await fetch(armUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data: any = await res.json();
    if (data.thetvdb) {
      // arm.haglund.dev returns thetvdb, not tmdb directly
      // But techinmind uses TMDB IDs. Try the TMDB find API with thetvdb
      // Actually arm returns `themoviedb` field
    }
    if (data.themoviedb) return String(data.themoviedb);

    // Fallback: try searching by anime name if provided
    return null;
  } catch (err: any) {
    log.warn(`[HindiAPI] TMDB ID resolution failed: ${err?.message}`);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════════════════════════════════════

// GET /api/v1/hindiapi/episode?tmdbId=...&season=...&episode=...&type=series|movie
// Also accepts: malId, anilistId (auto-resolves to TMDB ID)
hindiApiRouter.get("/episode", async (c) => {
  const cacheConfig = c.get("CACHE_CONFIG");
  const tmdbIdParam = c.req.query("tmdbId");
  const malId = c.req.query("malId");
  const anilistId = c.req.query("anilistId");
  const season = c.req.query("season") || "1";
  const episode = c.req.query("episode") || "1";
  const type = c.req.query("type") || "series";

  if (!tmdbIdParam && !malId && !anilistId) {
    return c.json({ provider: "Tatakai", status: 400, error: "Provide tmdbId, malId, or anilistId" }, 400);
  }

  if (type !== "movie" && (!season || !episode)) {
    return c.json({ provider: "Tatakai", status: 400, error: "Missing season or episode" }, 400);
  }

  try {
    const data = await cache.getOrSet(
      async () => {
        // Step 0: Resolve TMDB ID from malId/anilistId if needed
        const tmdbId = await resolveToTmdbId({ tmdbId: tmdbIdParam, malId, anilistId });
        if (!tmdbId) {
          throw new Error("Could not resolve TMDB ID from provided identifiers");
        }

        // Step 1: Get file slug
        const fileSlug = await getFileSlug(tmdbId, season, episode, type);

        // Step 2: Get embed data
        const embedData = await getEmbedData(fileSlug);

        // Step 3: Process embed URLs
        const streams = processEmbedData(embedData);

        // Step 4: Try HLS extraction in parallel (with timeout per stream)
        const enriched = await Promise.all(
          streams.map(async (stream) => {
            try {
              const hlsData = await extractUniversal(stream.url);
              if (hlsData) {
                return {
                  ...stream,
                  dhls: hlsData.streamUrl,
                  headers: hlsData.headers,
                };
              }
            } catch (err: any) {
              log.warn(`[HindiAPI] HLS extraction failed for ${stream.provider}: ${err?.message}`);
            }
            return stream;
          })
        );

        return {
          meta: { tmdbId, season, episode, slug: fileSlug },
          streams: enriched,
        } satisfies HindiApiResult;
      },
      cacheConfig.key,
      cacheConfig.duration
    );

    return c.json({ provider: "Tatakai", status: 200, data });
  } catch (error: any) {
    const msg = error?.message || "HindiAPI upstream error";
    const isNotFound = msg.includes("[NOT_FOUND]") || msg.includes("Could not resolve TMDB ID");
    const status = isNotFound ? 404 : 502;
    if (isNotFound) {
      log.info(`[HindiAPI] Content not found: ${msg}`);
    } else {
      log.error(`[HindiAPI] Episode route error: ${msg}`);
    }
    return c.json(
      { provider: "Tatakai", status, error: msg.replace(/\[NOT_FOUND\]\s*/, '') },
      status
    );
  }
});

// ── M3U8 / Segment Proxy ───────────────────────────────────────────────
// OPTIONS preflight for CORS
hindiApiRouter.options("/proxy", (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range, Content-Type, Accept, Accept-Encoding",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
      "Access-Control-Max-Age": "86400",
    },
  });
});

// GET /api/v1/hindiapi/proxy?url=...&referer=...
hindiApiRouter.get("/proxy", async (c) => {
  const rawUrl = c.req.query("url");
  const rawReferer = c.req.query("referer");

  if (!rawUrl) {
    return c.json({ error: "url parameter required" }, 400);
  }

  // Decode helpers
  const safeDecode = (v: string) => {
    try { return decodeURIComponent(v); } catch { return v; }
  };
  const sanitize = (v: string) => v.trim().replace(/^[`"']+|[`"']+$/g, "");

  let decodedUrl = sanitize(safeDecode(rawUrl));
  if (decodedUrl.startsWith("//")) decodedUrl = `https:${decodedUrl}`;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(decodedUrl);
  } catch {
    return c.json({ error: "Invalid URL" }, 400);
  }

  const decodedReferer = rawReferer
    ? sanitize(safeDecode(rawReferer))
    : `${parsedUrl.origin}/`;

  let derivedOrigin = parsedUrl.origin;
  try { derivedOrigin = new URL(decodedReferer).origin; } catch {}

  const upstreamHeaders: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Referer: decodedReferer,
    Origin: derivedOrigin,
    Accept: "*/*",
  };

  // Forward Range header for segment requests
  const rangeHeader = c.req.header("range");
  if (rangeHeader) upstreamHeaders["Range"] = rangeHeader;

  try {
    const upstream = await fetch(decodedUrl, {
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(30000),
    });

    if (!upstream.ok && upstream.status >= 500) {
      return new Response(`Upstream error: ${upstream.status}`, { status: upstream.status });
    }

    const contentType =
      upstream.headers.get("content-type") || "application/vnd.apple.mpegurl";
    const isM3U8 = contentType.includes("mpegurl") || decodedUrl.endsWith(".m3u8");

    // Build proxy base URL for rewriting m3u8 segment URLs
    const host = c.req.header("host") || "localhost:4000";
    const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
    const proto = c.req.header("x-forwarded-proto") || (isLocalhost ? "http" : "https");
    const proxyBase = `${proto}://${host}/api/v1/hindiapi/proxy`;

    const toProxyUrl = (inputUrl: string): string => {
      let resolved: string;
      try {
        resolved = new URL(inputUrl, decodedUrl).toString();
      } catch {
        return inputUrl;
      }
      if (!resolved.startsWith("http")) return inputUrl;
      return `${proxyBase}?url=${encodeURIComponent(resolved)}&referer=${encodeURIComponent(decodedReferer)}`;
    };

    const responseHeaders = new Headers();
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    responseHeaders.set(
      "Access-Control-Allow-Headers",
      "Range, Content-Type, Accept, Accept-Encoding"
    );
    responseHeaders.set(
      "Access-Control-Expose-Headers",
      "Content-Length, Content-Range, Accept-Ranges, Cache-Control"
    );
    responseHeaders.set("Content-Type", contentType);

    const cl = upstream.headers.get("content-length");
    if (cl) responseHeaders.set("Content-Length", cl);
    const cr = upstream.headers.get("content-range");
    if (cr) responseHeaders.set("Content-Range", cr);
    responseHeaders.set(
      "Accept-Ranges",
      upstream.headers.get("accept-ranges") || "bytes"
    );

    // Cache: segments immutable, playlists no-cache
    if (decodedUrl.endsWith(".ts") || decodedUrl.endsWith(".m4s")) {
      responseHeaders.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (isM3U8) {
      responseHeaders.set("Cache-Control", "no-cache");
    }

    if (isM3U8) {
      // Rewrite m3u8 content — proxy all segment/key URLs through us
      const body = await upstream.text();
      const rewritten = body
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return trimmed;
          if (trimmed.startsWith("#")) {
            // Rewrite URI="..." in tags like #EXT-X-KEY, #EXT-X-MAP
            return trimmed
              .replace(/URI="([^"]+)"/g, (_, uri) => `URI="${toProxyUrl(uri)}"`)
              .replace(/URI=([^",\s]+)/g, (_, uri) => `URI=${toProxyUrl(uri)}`);
          }
          // Segment line — resolve relative and proxy
          return toProxyUrl(trimmed);
        })
        .join("\n");

      return new Response(rewritten, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    // Binary passthrough (.ts, .m4s, .key, etc.)
    const status = cr ? 206 : upstream.status;
    return new Response(upstream.body, { status, headers: responseHeaders });
  } catch (err: any) {
    log.error(`[HindiAPI Proxy] ${err?.message}`);
    return new Response(`Proxy error: ${err?.message}`, { status: 502 });
  }
});

// Root info
hindiApiRouter.get("/", (c) => {
  return c.json({
    provider: "Tatakai",
    status: 200,
    message: "HindiAPI - TMDB-based Hindi Streaming (TechInMind)",
    endpoints: {
      episode: "/api/v1/hindiapi/episode?tmdbId=...&season=1&episode=1&type=series",
      episodeByMal: "/api/v1/hindiapi/episode?malId=...&season=1&episode=1",
      episodeByAnilist: "/api/v1/hindiapi/episode?anilistId=...&season=1&episode=1",
      proxy: "/api/v1/hindiapi/proxy?url=...&referer=...",
    },
  });
});

export { hindiApiRouter };
