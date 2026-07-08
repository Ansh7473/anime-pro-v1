/**
 * Anime API Cache Worker
 *
 * Cloudflare Worker that sits between the frontend and AniList/Jikan APIs.
 * Caches all responses in KV so users never hit rate limits.
 *
 * Routes:
 *   POST /anilist          → proxy to AniList GraphQL (cached by query hash)
 *   GET  /jikan/*          → proxy to Jikan REST v4 (cached by URL)
 *   GET  /health           → health check
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",");
    const corsOrigin = allowed.includes(origin) ? origin : allowed[0] || "*";
    const ttl = parseInt(env.CACHE_TTL || "1800", 10);

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
      return json({ status: "ok", cache: "kv" }, corsHeaders);
    }

    try {
      // ─── AniList GraphQL ────────────────────────────────────────
      if (url.pathname === "/anilist" && request.method === "POST") {
        const body = await request.text();
        const key = "al:" + (await sha256(body));

        // Check KV cache
        const cached = await env.CACHE.get(key);
        if (cached) {
          return json(JSON.parse(cached), corsHeaders, {
            "X-Cache": "HIT",
            ...cacheHeaders,
          });
        }

        // Forward to AniList
        const res = await fetch(env.ANILIST_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body,
        });

        if (!res.ok) {
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
        // Cache in KV with TTL
        await env.CACHE.put(key, data, { expirationTtl: ttl });
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

        // Check KV cache
        const cached = await env.CACHE.get(key);
        if (cached) {
          return json(JSON.parse(cached), corsHeaders, {
            "X-Cache": "HIT",
            ...cacheHeaders,
          });
        }

        // Forward to Jikan
        const jikanUrl = `${env.JIKAN_URL}/${jikanPath}${qs}`;
        const res = await fetch(jikanUrl, {
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
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
        await env.CACHE.put(key, data, { expirationTtl: ttl });
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
