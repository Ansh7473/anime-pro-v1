/**
 * Anime API Cache Worker
 *
 * Cloudflare Worker that sits between the frontend and AniList/Jikan APIs.
 * Caches responses in two layers:
 *   1. Cache API (caches.default) — free, per-datacenter, no daily limits
 *   2. KV (CACHE namespace) — global, durable, but writes capped at 1000/day
 *      on the free plan, so the Cache API front-loads most reads.
 *
 * Routes:
 *   POST /anilist          → proxy to AniList GraphQL (cached by query hash)
 *   GET  /jikan/*          → proxy to Jikan REST v4 (cached by URL)
 *   GET  /health           → health check
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",");
    const corsOrigin = allowed.includes(origin) ? origin : allowed[0] || "*";
    const ttl = parseInt(env.CACHE_TTL || "1800", 10);
    const edgeCache = caches.default;

    const corsHeaders = {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Access-Control-Max-Age": "86400",
    };

    // Cache headers for successful responses — tells Cloudflare edge to cache
    const cacheHeaders = {
      "Cache-Control": `public, max-age=120, s-maxage=${ttl}, stale-while-revalidate=86400, stale-if-error=86400`,
      "CDN-Cache-Control": `public, s-maxage=${ttl}, stale-while-revalidate=86400, stale-if-error=86400`,
      Vary: "Origin",
    };

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health
    if (url.pathname === "/health") {
      return json({ status: "ok", cache: "edge+kv" }, corsHeaders);
    }

    try {
      // ─── AniList GraphQL ────────────────────────────────────────
      if (url.pathname === "/anilist" && request.method === "POST") {
        const body = await request.text();
        const key = "al:" + (await sha256(body));

        // Cache API key — synthetic GET request (Cache API only matches GET)
        const cacheReq = new Request(`https://edge.cache/anilist/${key}`, { method: "GET" });

        // 1. Edge cache (free, per-datacenter)
        const edgeHit = await edgeCache.match(cacheReq);
        if (edgeHit) {
          return new Response(await edgeHit.text(), {
            headers: { "Content-Type": "application/json", ...corsHeaders, "X-Cache": "EDGE-HIT", ...cacheHeaders },
          });
        }

        // 2. KV cache (global, durable)
        const kvHit = await env.CACHE.get(key);
        if (kvHit) {
          // Backfill edge cache so subsequent requests in this datacenter hit edge.
          ctx.waitUntil(edgeCache.put(cacheReq, new Response(kvHit, {
            headers: { "Content-Type": "application/json", ...cacheHeaders },
          })));
          return json(JSON.parse(kvHit), corsHeaders, {
            "X-Cache": "KV-HIT",
            ...cacheHeaders,
          });
        }

        // 3. Forward to AniList (POST — no cf cache options apply)
        const res = await fetch(env.ANILIST_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body,
        });

        if (!res.ok) {
          // Cache 404s briefly — non-existent anime won't appear 60s later.
          if (res.status === 404) {
            const data = await res.text();
            ctx.waitUntil(Promise.all([
              edgeCache.put(cacheReq, new Response(data, {
                headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=60" },
              })),
              env.CACHE.put(key, data, { expirationTtl: 60 }),
            ]));
            return new Response(data, {
              status: 404,
              headers: { "Content-Type": "application/json", ...corsHeaders, "X-Cache": "MISS-404", "Cache-Control": "public, max-age=30, s-maxage=60" },
            });
          }
          return new Response(res.body, {
            status: res.status,
            headers: {
              ...corsHeaders,
              "X-Cache": "ERROR",
              "Cache-Control": "no-store",
            },
          });
        }

        const data = await res.text();
        // 4. Store in edge cache + KV (async, non-blocking)
        ctx.waitUntil(Promise.all([
          edgeCache.put(cacheReq, new Response(data, {
            headers: { "Content-Type": "application/json", ...cacheHeaders },
          })),
          env.CACHE.put(key, data, { expirationTtl: ttl }),
        ]));
        return new Response(data, {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
            "X-Cache": "MISS",
            ...cacheHeaders,
          },
        });
      }

      // ─── Jikan REST ─────────────────────────────────────────────
      if (url.pathname.startsWith("/jikan/")) {
        const jikanPath = url.pathname.slice(7); // strip "/jikan/"
        const qs = url.search || "";
        const key = "jk:" + (await sha256(jikanPath + qs));

        const cacheReq = new Request(`https://edge.cache/jikan/${key}`, { method: "GET" });

        // 1. Edge cache (free, per-datacenter)
        const edgeHit = await edgeCache.match(cacheReq);
        if (edgeHit) {
          return new Response(await edgeHit.text(), {
            headers: { "Content-Type": "application/json", ...corsHeaders, "X-Cache": "EDGE-HIT", ...cacheHeaders },
          });
        }

        // 2. KV cache (global, durable)
        const kvHit = await env.CACHE.get(key);
        if (kvHit) {
          ctx.waitUntil(edgeCache.put(cacheReq, new Response(kvHit, {
            headers: { "Content-Type": "application/json", ...cacheHeaders },
          })));
          return json(JSON.parse(kvHit), corsHeaders, {
            "X-Cache": "KV-HIT",
            ...cacheHeaders,
          });
        }

        // 3. Forward to Jikan (GET — add cf options to cache origin at edge)
        const jikanUrl = `${env.JIKAN_URL}/${jikanPath}${qs}`;
        const res = await fetch(jikanUrl, {
          headers: { Accept: "application/json" },
          cf: { cacheEverything: true, cacheTtl: ttl },
        });

        if (!res.ok) {
          // Cache 404s briefly — non-existent anime won't appear 60s later.
          if (res.status === 404) {
            const data = await res.text();
            ctx.waitUntil(Promise.all([
              edgeCache.put(cacheReq, new Response(data, {
                headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=60" },
              })),
              env.CACHE.put(key, data, { expirationTtl: 60 }),
            ]));
            return new Response(data, {
              status: 404,
              headers: { "Content-Type": "application/json", ...corsHeaders, "X-Cache": "MISS-404", "Cache-Control": "public, max-age=30, s-maxage=60" },
            });
          }
          return new Response(res.body, {
            status: res.status,
            headers: {
              ...corsHeaders,
              "X-Cache": "ERROR",
              "Cache-Control": "no-store",
            },
          });
        }

        const data = await res.text();
        // 4. Store in edge cache + KV (async, non-blocking)
        ctx.waitUntil(Promise.all([
          edgeCache.put(cacheReq, new Response(data, {
            headers: { "Content-Type": "application/json", ...cacheHeaders },
          })),
          env.CACHE.put(key, data, { expirationTtl: ttl }),
        ]));
        return new Response(data, {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
            "X-Cache": "MISS",
            ...cacheHeaders,
          },
        });
      }

      return json(
        { error: "Not found. Use /anilist (POST) or /jikan/* (GET)" },
        corsHeaders,
        {},
        404,
      );
    } catch (err) {
      return json(
        { error: err.message },
        corsHeaders,
        { "Cache-Control": "no-store" },
        500,
      );
    }
  },
};

// ─── Helpers ────────────────────────────────────────────────────────

async function sha256(text) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

function json(data, corsHeaders, extra = {}, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders, ...extra },
  });
}
