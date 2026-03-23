import { Hono } from "hono";
import { cache } from "../../config/cache.js";
import type { ServerContext } from "../../config/context.js";

const animeApiRouter = new Hono<ServerContext>();

// ========== ANIMECHAN (Quotes) ==========
animeApiRouter.get("/quotes/random", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const anime = c.req.query("anime");

    const url = anime
        ? `https://animechan.xyz/api/random/anime?title=${encodeURIComponent(anime)}`
        : "https://animechan.xyz/api/random";

    const data = await cache.getOrSet(async () => {
        try {
            const res = await fetch(url);
            if (!res.ok) return { error: "API unavailable" };
            return await res.json();
        } catch {
            return { error: "Failed to fetch" };
        }
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data });
});

// ========== NEKOS.BEST (Images) ==========
animeApiRouter.get("/images/:type", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const type = c.req.param("type"); // e.g., waifu, neko, shinobu

    const data = await cache.getOrSet(async () => {
        const res = await fetch(`https://nekos.best/api/v2/${type}`);
        return res.json();
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data });
});

// ========== TRACE.MOE (Search by image) ==========
animeApiRouter.post("/trace", async (c) => {
    const body = await c.req.json();
    const { imageUrl } = body;

    if (!imageUrl) return c.json({ provider: "Tatakai", status: 400, error: "Missing imageUrl" }, 400);

    const res = await fetch(`https://api.trace.moe/search?url=${encodeURIComponent(imageUrl)}`);
    const data = await res.json();

    return c.json({ provider: "Tatakai", status: 200, data });
});

// ========== ANIME FACTS ==========
animeApiRouter.get("/facts/:anime", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const anime = c.req.param("anime");

    const data = await cache.getOrSet(async () => {
        try {
            const res = await fetch(`https://anime-facts-rest-api.herokuapp.com/api/v1/${anime}`);
            if (!res.ok) return { error: "API unavailable" };
            return await res.json();
        } catch {
            return { error: "Failed to fetch" };
        }
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data });
});

// ========== WAIFU.IM ==========
animeApiRouter.get("/waifu", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const tags = c.req.query("tags");

    const url = new URL("https://api.waifu.im/search");
    if (tags) url.searchParams.set("included_tags", tags);

    const data = await cache.getOrSet(async () => {
        const res = await fetch(url.toString());
        return res.json();
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data });
});

// Root for /anime-api
animeApiRouter.get("/", (c) => {
    return c.json({ provider: "Tatakai",
        status: 200,
        message: "Anime Utility & Meta APIs Ported from anime-api",
        endpoints: {
            quotes: "/api/v1/anime-api/quotes/random",
            images: "/api/v1/anime-api/images/:type",
            trace: "/api/v1/anime-api/trace",
            facts: "/api/v1/anime-api/facts/:anime",
            waifu: "/api/v1/anime-api/waifu"
        }
    });
});

export { animeApiRouter };
