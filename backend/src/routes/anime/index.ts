import { Hono } from "hono";
import * as cheerio from "cheerio";
import { cache } from "../../config/cache.js";
import type { ServerContext } from "../../config/context.js";

const animeRouter = new Hono<ServerContext>();

// Helper to fetch and parse
async function fetchHtml(url: string) {
    const response = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
    });
    return response.text();
}

// ========== GOGOANIME PORT ==========
const GOGO_URL = "https://gogoanime3.co";

animeRouter.get("/gogoanime/:query", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const query = c.req.param("query");

    const results = await cache.getOrSet(async () => {
        const html = await fetchHtml(`${GOGO_URL}/search.html?keyword=${encodeURIComponent(query)}`);
        const $ = cheerio.load(html);
        const list: any[] = [];

        $(".main_body .last_episodes ul li").each((_, el) => {
            const title = $(el).find(".name a").text().trim();
            const link = $(el).find(".name a").attr("href");
            const img = $(el).find(".img a img").attr("src");
            const released = $(el).find(".released").text().trim();

            if (title && link) {
                list.push({ title, link, img, released });
            }
        });

        return list;
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data: results });
});

// ========== CHIA-ANIME PORT ==========
const CHIA_URL = "https://chia-anime.su";

animeRouter.get("/chia-anime/:query", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const query = c.req.param("query");

    const results = await cache.getOrSet(async () => {
        const html = await fetchHtml(`${CHIA_URL}/search/${encodeURIComponent(query)}`);
        const $ = cheerio.load(html);
        const list: any[] = [];

        $(".main-content .post-container .post-item").each((_, el) => {
            const title = $(el).find(".post-title a").text().trim();
            const link = $(el).find(".post-title a").attr("href");
            const img = $(el).find(".post-thumb img").attr("src");

            if (title && link) {
                list.push({ title, link, img });
            }
        });

        return list;
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data: results });
});

// ========== ANIME-FREAK PORT ==========
const FREAK_URL = "https://www.animefreak.video";

animeRouter.get("/anime-freak/:query", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const query = c.req.param("query");

    const results = await cache.getOrSet(async () => {
        try {
            const res = await fetch(`${FREAK_URL}/search/topSearch?q=${encodeURIComponent(query)}`);
            if (!res.ok) return [];
            const json = await res.json() as any;
            return (json.data || []).map((element: any) => ({
                title: element.name,
                link: element.seo_name ? `${FREAK_URL}/watch/${element.seo_name}` : null,
                img: element.image
            }));
        } catch {
            return [];
        }
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data: results });
});

// ========== ANIMELAND PORT ==========
const LAND_URL = "https://www.animeland.tv";

animeRouter.get("/animeland/:query", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const query = c.req.param("query");

    const results = await cache.getOrSet(async () => {
        const html = await fetchHtml(`${LAND_URL}/?s=${encodeURIComponent(query)}`);
        const $ = cheerio.load(html);
        const list: any[] = [];

        $(".video_thumb_content .imagelist .title a").each((_, el) => {
            const title = $(el).text().trim();
            const link = $(el).attr("href");
            if (title && link) {
                list.push({ title, link });
            }
        });

        return list;
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data: results });
});

// Root for /anime
animeRouter.get("/", (c) => {
    return c.json({ provider: "Tatakai",
        status: 200,
        message: "External Anime Scrapers Ported from ANIME-API",
        providers: ["gogoanime", "chia-anime", "anime-freak", "animeland"]
    });
});

export { animeRouter };
