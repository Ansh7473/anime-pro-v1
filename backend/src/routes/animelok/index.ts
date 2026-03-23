import { Hono } from "hono";
import * as cheerio from "cheerio";
import { log } from "../../config/logger.js";
import { cache } from "../../config/cache.js";
import type { ServerContext } from "../../config/context.js";

const animelokRouter = new Hono<ServerContext>();

const BASE_URL = "https://animelok.site";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchHtml(url: string, retries = 3): Promise<string> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Referer": BASE_URL,
                    "Origin": BASE_URL,
                },
                signal: AbortSignal.timeout(30000),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.text();
        } catch (error) {
            lastError = error as Error;
            log.warn(`Fetch attempt ${i + 1} failed for ${url}: ${lastError.message}`);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 500));
            }
        }
    }

    throw lastError || new Error("Failed to fetch after retries");
}

// Internal API fetch for Animelok (requires specific headers)
async function fetchApi(url: string): Promise<any> {
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": USER_AGENT,
                "Accept": "application/json, text/plain, */*",
                "Referer": BASE_URL,
                "Origin": BASE_URL,
                "X-Requested-With": "XMLHttpRequest",
                "Accept-Encoding": "identity"
            },
            redirect: "manual",
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) return null;
        const text = await response.text();

        // Handle the "dirty JSON" prefix if present (e.g., B0AdSERP)
        if (text.trim().startsWith("B0AdSERP") || !text.trim().startsWith("{")) {
            const firstBrace = text.indexOf('{');
            const lastBrace = text.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                try {
                    return JSON.parse(text.substring(firstBrace, lastBrace + 1));
                } catch (e) {
                    log.warn(`[Animelok] JSON extraction failed for prefixed response. Snapshot: ${text.substring(0, 50)}`);
                }
            }
        }

        try {
            return JSON.parse(text);
        } catch (e) {
            log.error(`[Animelok] JSON parse failed. Raw text snippet: ${text.substring(0, 100)}`);
            return null;
        }
    } catch (error) {
        log.warn(`[Animelok] API fetch failed for ${url}: ${error}`);
        return null;
    }
}

// Extract Anilist ID from slug (format: slug-anilistId)
function extractAnilistId(slug: string): number | null {
    const match = slug.match(/-(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
}

let burstLinkDb: any[] | null = null;
async function fetchBurstLink() {
    if (burstLinkDb) return burstLinkDb;
    try {
        log.info("Fetching BurstLink database for ID normalization...");
        const res = await fetch("https://raw.githubusercontent.com/soruly/burstlink/master/burstlink.json");
        burstLinkDb = await res.json();
        return burstLinkDb || [];
    } catch (e: any) {
        log.error(`Failed to fetch BurstLink DB: ${e.message}`);
        return [];
    }
}

async function enrichWithIds(item: any) {
    if (!item.anilistId) return item;
    const db = await fetchBurstLink();
    if (!db) return item;
    const mapping = db.find((entry: any) => entry.anilist === item.anilistId);
    if (mapping) {
        return {
            ...item,
            malId: mapping.mal || item.malId,
            anidbId: mapping.anidb,
            annId: mapping.ann
        };
    }
    return item;
}

// Validate anime item before adding
function validateAnimeItem(item: any): boolean {
    return !!(item.id && item.title);
}

// ========== HOME ==========
animelokRouter.get("/home", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");

    const data = await cache.getOrSet(async () => {
        log.info(`Fetching Animelok home: ${BASE_URL}/home`);
        const html = await fetchHtml(`${BASE_URL}/home`);
        const $ = cheerio.load(html);

        const sections: any[] = [];

        // Primary selector: section elements with h2 titles
        // Fallback: any section-like container
        const sectionSelectors = ["section", "[class*='section']", "div[class*='container'] > div"];

        for (const selector of sectionSelectors) {
            const found = $(selector);
            if (found.length > 0) {
                found.each((i, section) => {
                    // Try multiple title selectors
                    const title = $(section).find("h2").first().text().trim() ||
                        $(section).find("h3").first().text().trim() ||
                        $(section).find("[class*='title']").first().text().trim();

                    if (!title) return;

                    const items: any[] = [];

                    // Primary: semantic selector for anime links
                    // Fallback: any link containing /anime/
                    let animeLinks = $(section).find("a[href^='/anime/']");
                    if (animeLinks.length === 0) {
                        // Collect fallback links - use any[] for cheerio elements
                        const fallbackLinks: any[] = [];
                        $(section).find("a").each((_, link) => {
                            const href = $(link).attr("href");
                            if (href && href.includes("/anime/")) {
                                fallbackLinks.push(link);
                            }
                        });
                        animeLinks = $(fallbackLinks);
                    }

                    animeLinks.each((_, link) => {
                        try {
                            const url = $(link).attr("href");
                            if (!url || !url.includes("/anime/")) return;

                            const slug = url.split("/").pop() || "";
                            const anilistId = extractAnilistId(slug);

                            // Try multiple image selectors
                            const poster = $(link).find("img").attr("src") ||
                                $(link).find("img").attr("data-src") ||
                                $(link).find("img").attr("data-lazy-src") ||
                                $(link).find("img").attr("srcset")?.split(" ")[0] ||
                                $(link).find("img").attr("data-srcset")?.split(" ")[0];

                            // Try multiple title selectors
                            const animeTitle = $(link).find("h3").first().text().trim() ||
                                $(link).find(".font-bold").first().text().trim() ||
                                $(link).find("[class*='title']").first().text().trim() ||
                                $(link).find("span").first().text().trim();

                            // Extract rank/number
                            const rankText = $(link).find("span").first().text().trim();
                            const rank = rankText && !isNaN(parseInt(rankText)) ? parseInt(rankText) : undefined;

                            // Check for dub badge
                            const linkText = $(link).text().toLowerCase();
                            const dubBadge = linkText.includes("dub") || linkText.includes("dubbed");

                            const item = {
                                id: slug, // Use full slug
                                anilistId,
                                malId: anilistId,
                                title: animeTitle,
                                poster: poster?.startsWith("http") ? poster : (poster ? `${BASE_URL}${poster}` : undefined),
                                url: url.startsWith("http") ? url : `${BASE_URL}${url}`,
                                rank,
                                isDub: dubBadge
                            };

                            if (validateAnimeItem(item)) {
                                items.push(item);
                            }
                        } catch (error) {
                            log.warn(`Failed to parse anime item: ${error}`);
                        }
                    });

                    if (items.length > 0) {
                        sections.push({
                            title,
                            items
                        });
                    }
                });
                break; // Use first working selector
            }
        }

        if (sections.length === 0) {
            log.error("No sections found on Animelok home page");
        }

        return { sections };
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data });
});

// ========== SEARCH ==========
animelokRouter.get("/search", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const query = c.req.query("q") || c.req.query("keyword");

    if (!query) return c.json({ provider: "Tatakai", status: 400, error: "Missing query" }, 400);

    const data = await cache.getOrSet(async () => {
        log.info(`Searching Animelok: ${BASE_URL}/search?keyword=${encodeURIComponent(query)}`);
        const html = await fetchHtml(`${BASE_URL}/search?keyword=${encodeURIComponent(query)}`);
        const $ = cheerio.load(html);

        const animes: any[] = [];

        // Find results - usually in a grid or list
        $("a[href^='/anime/']").each((_, link) => {
            try {
                const url = $(link).attr("href");
                if (!url) return;

                const slug = url.split("/").pop() || "";
                const anilistId = extractAnilistId(slug);

                const title = $(link).find("h3, h4").first().text().trim() ||
                    $(link).find("[class*='title']").first().text().trim() ||
                    $(link).text().trim().split("\n")[0].trim();

                const poster = $(link).find("img").attr("src") ||
                    $(link).find("img").attr("data-src");

                if (title && slug) {
                    animes.push({
                        id: slug, // Use full slug as ID for API compatibility
                        anilistId,
                        malId: anilistId,
                        title,
                        poster: poster?.startsWith("http") ? poster : (poster ? `${BASE_URL}${poster}` : undefined),
                        url: url.startsWith("http") ? url : `${BASE_URL}${url}`
                    });
                }
            } catch (error) {
                log.warn(`Failed to parse search result: ${error}`);
            }
        });

        // Deduplicate
        const uniqueAnimes = Array.from(new Map(animes.map(a => [a.id, a])).values());

        return { animes: uniqueAnimes };
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data });
});

// ========== SCHEDULE (Global) ==========
animelokRouter.get("/schedule", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");

    const data = await cache.getOrSet(async () => {
        log.info(`Fetching Animelok schedule: ${BASE_URL}/schedule`);
        const html = await fetchHtml(`${BASE_URL}/schedule`);
        const $ = cheerio.load(html);

        const schedule: any[] = [];
        const dayNames = ["Yesterday", "Today", "Tomorrow", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

        const sections = $("section").toArray();
        for (const section of sections) {
            const dayTitle = $(section).find("h2").first().text().trim();
            if (!dayTitle) continue;

            const dayMatch = dayNames.find(d => dayTitle.toLowerCase().includes(d.toLowerCase()));
            if (!dayMatch) continue;

            const anime: any[] = [];
            $(section).find("a[href^='/anime/']").each((_, link) => {
                try {
                    const url = $(link).attr("href");
                    if (!url) return;

                    const slug = url.split("/").pop() || "";
                    const anilistId = extractAnilistId(slug);

                    const title = $(link).find("h3, h4, span").first().text().trim() ||
                        $(link).text().trim().split("\n")[0].trim();

                    const timeMatch = $(link).find("div, span").filter((_, el) => !!$(el).text().match(/\d{1,2}:\d{2}/)).first().text().match(/(\d{1,2}:\d{2})/);
                    const time = timeMatch ? timeMatch[1] : undefined;

                    const poster = $(link).find("img").attr("src") ||
                        $(link).find("img").attr("data-src") ||
                        $(link).find("img").attr("data-lazy-src");

                    if (title && slug) {
                        anime.push({
                            id: anilistId?.toString() || slug,
                            anilistId,
                            malId: anilistId,
                            title,
                            time,
                            poster: poster?.startsWith("http") ? poster : (poster ? `${BASE_URL}${poster}` : undefined),
                            url: url.startsWith("http") ? url : `${BASE_URL}${url}`
                        });
                    }
                } catch (error) {
                    log.warn(`Failed to parse schedule item: ${error}`);
                }
            });

            if (anime.length > 0) {
                const uniqueAnime = Array.from(new Map(anime.map(a => [a.id, a])).values());
                const enrichedAnime = await Promise.all(uniqueAnime.map(a => enrichWithIds(a)));
                schedule.push({ day: dayMatch, anime: enrichedAnime });
            }
        }

        return { schedule };
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data });
});

// ========== REGIONAL SCHEDULE ==========
animelokRouter.get("/regional-schedule", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");

    const data = await cache.getOrSet(async () => {
        log.info(`Fetching Animelok regional schedule: ${BASE_URL}/regional-schedule`);
        const html = await fetchHtml(`${BASE_URL}/regional-schedule`);
        const $ = cheerio.load(html);

        const schedule: any[] = [];
        const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

        // Find all day headings regardless of nesting
        const headings = $("h2, h3").toArray();
        for (const heading of headings) {
            const dayTitle = $(heading).text().trim();
            const dayMatch = dayNames.find(d => dayTitle.toLowerCase() === d.toLowerCase() || dayTitle.toLowerCase().includes(d.toLowerCase() + " schedule"));

            if (dayMatch) {
                const anime: any[] = [];
                // Look for links in the same section or following container
                const container = $(heading).closest("section, div.mb-10, div.pb-12");

                container.find("a[href^='/anime/']").each((_, link) => {
                    try {
                        const url = $(link).attr("href");
                        if (!url) return;

                        const slug = url.split("/").pop() || "";
                        const anilistId = extractAnilistId(slug);

                        const title = $(link).find("h3, h4, span").first().text().trim() ||
                            $(link).text().trim().split("\n")[0].trim();

                        const timeMatch = $(link).find("div, span").filter((_, el) => !!$(el).text().match(/\d{1,2}:\d{2}/)).first().text().match(/(\d{1,2}:\d{2})/);
                        const time = timeMatch ? timeMatch[1] : undefined;

                        const poster = $(link).find("img").attr("src") ||
                            $(link).find("img").attr("data-src") ||
                            $(link).find("img").attr("data-lazy-src");

                        if (title && slug) {
                            anime.push({
                                id: anilistId?.toString() || slug,
                                anilistId,
                                malId: anilistId,
                                title,
                                time,
                                poster: poster?.startsWith("http") ? poster : (poster ? `${BASE_URL}${poster}` : undefined),
                                url: url.startsWith("http") ? url : `${BASE_URL}${url}`
                            });
                        }
                    } catch (error) {
                        log.warn(`Failed to parse regional schedule item: ${error}`);
                    }
                });

                if (anime.length > 0) {
                    const uniqueAnime = Array.from(new Map(anime.map(a => [a.id, a])).values());
                    const enrichedAnime = await Promise.all(uniqueAnime.map(a => enrichWithIds(a)));
                    schedule.push({ day: dayMatch, anime: enrichedAnime });
                }
            }
        }

        return { schedule };
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data });
});

// ========== LANGUAGES ==========
animelokRouter.get("/languages", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const page = c.req.query("page") || "1";

    const data = await cache.getOrSet(async () => {
        log.info(`Fetching Animelok languages: ${BASE_URL}/languages?page=${page}`);
        let html = await fetchHtml(`${BASE_URL}/languages?page=${page}`).catch(() => fetchHtml(`${BASE_URL}/home`));
        const $ = cheerio.load(html);

        const languages: any[] = [];

        $("a[href^='/languages/']").each((_, item) => {
            try {
                const link = $(item).attr("href");
                if (!link) return;

                const code = link.split("/").pop();
                if (!code || code === "languages") return;

                const name = $(item).find("span, h3, h2").first().text().trim() ||
                    $(item).text().trim().split("\n")[0].trim();

                const poster = $(item).find("img").attr("src") ||
                    $(item).find("img").attr("data-src") ||
                    $(item).attr("style")?.match(/url\(['"]?([^'"]+)['"]?\)/)?.[1];

                if (name && code) {
                    languages.push({
                        name,
                        code,
                        url: link.startsWith("http") ? link : `${BASE_URL}${link}`,
                        poster: poster?.startsWith("http") ? poster : (poster ? `${BASE_URL}${poster}` : undefined)
                    });
                }
            } catch (error) {
                log.warn(`Failed to parse language item: ${error}`);
            }
        });

        const uniqueLanguages = Array.from(
            new Map(languages.map(l => [l.code, l])).values()
        );

        // Robust pagination detection
        const hasNextPage = $("a, button").filter((_, el) => {
            const text = $(el).text().toLowerCase();
            return (text.includes("next") || text === ">" || text === "»") &&
                !$(el).hasClass("disabled") &&
                !$(el).attr("disabled");
        }).length > 0;

        return { page: parseInt(page), languages: uniqueLanguages, hasNextPage };
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data });
});

// ========== ANIME BY LANGUAGE ==========
animelokRouter.get("/languages/:language", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const language = c.req.param("language");
    const page = c.req.query("page") || "1";

    const data = await cache.getOrSet(async () => {
        log.info(`Fetching Animelok language anime: ${BASE_URL}/languages/${language}?page=${page}`);
        const html = await fetchHtml(`${BASE_URL}/languages/${language}?page=${page}`);
        const $ = cheerio.load(html);

        const anime: any[] = [];

        $("a[href^='/anime/']").each((_, item) => {
            try {
                const url = $(item).attr("href");
                if (!url) return;

                const slug = url.split("/").pop() || "";
                const anilistId = extractAnilistId(slug);

                const title = $(item).find("h3, h4, .title").first().text().trim() ||
                    $(item).text().trim().split("\n")[0].trim();

                const poster = $(item).find("img").attr("src") ||
                    $(item).find("img").attr("data-src") ||
                    $(item).find("img").attr("data-lazy-src");

                const rating = $(item).find("[class*='rating'], [class*='score']").text().trim();
                const year = $(item).find("span").filter((_, el) => !!$(el).text().match(/^\d{4}$/)).text().trim();
                const eps = $(item).find("span").filter((_, el) => !!$(el).text().match(/\d+ EPS/i)).text().trim();

                if (title && slug && !["Home", "Movies", "TV Series"].includes(title)) {
                    anime.push({
                        id: anilistId?.toString() || slug,
                        anilistId,
                        malId: anilistId,
                        title,
                        poster: poster?.startsWith("http") ? poster : (poster ? `${BASE_URL}${poster}` : undefined),
                        url: url.startsWith("http") ? url : `${BASE_URL}${url}`,
                        rating: rating ? parseFloat(rating) : undefined,
                        year,
                        episodes: eps
                    });
                }
            } catch (error) {
                log.warn(`Failed to parse language anime item: ${error}`);
            }
        });

        const uniqueAnime = Array.from(
            new Map(anime.filter(a => a.id && a.title).map(a => [a.id, a])).values()
        );

        const enrichedAnime = await Promise.all(uniqueAnime.map(a => enrichWithIds(a)));

        // Robust pagination detection
        const hasNextPage = $("a, button").filter((_, el) => {
            const text = $(el).text().toLowerCase();
            return (text.includes("next") || text === ">" || text === "»") &&
                !$(el).hasClass("disabled") &&
                !$(el).attr("disabled");
        }).length > 0;

        return { language, page: parseInt(page), anime: enrichedAnime, hasNextPage };
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data });
});

// ========== ANIME INFO ==========
animelokRouter.get("/anime/:id", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const id = c.req.param("id");

    const data = await cache.getOrSet(async () => {
        log.info(`Fetching Animelok anime info: ${BASE_URL}/anime/${id}`);
        const html = await fetchHtml(`${BASE_URL}/anime/${id}`);
        const $ = cheerio.load(html);

        const anilistId = extractAnilistId(id);

        // Extract title - try multiple selectors
        const title = $("h1").first().text().trim() ||
            $("meta[property='og:title']").attr("content")?.split(" - Animelok")[0]?.trim() ||
            $("meta[name='title']").attr("content")?.trim() ||
            "";

        // Extract description - try multiple selectors
        const description = $("[class*='description']").first().text().trim() ||
            $("[class*='synopsis']").first().text().trim() ||
            $("meta[property='og:description']").attr("content")?.trim() ||
            $("p").filter((_, el) => $(el).text().length > 100).first().text().trim() ||
            "";

        // Extract poster - try multiple selectors
        const poster = $("img[class*='poster']").attr("src") ||
            $("img[class*='cover']").attr("src") ||
            $("meta[property='og:image']").attr("content") ||
            $("img").filter((_, el) => {
                const src = $(el).attr("src") || "";
                return src.includes("anilist") || src.includes("cover");
            }).first().attr("src") ||
            "";

        // Extract rating
        const ratingText = $("[class*='rating']").first().text().trim() ||
            $("[class*='score']").first().text().trim();
        const rating = ratingText ? parseFloat(ratingText) : undefined;

        // Extract genres
        const genres: string[] = [];
        $("a[href*='/genres/'], [class*='genre'] a").each((_, el) => {
            const genre = $(el).text().trim();
            if (genre) genres.push(genre);
        });

        // Extract seasons from "Seasons of this Anime" section
        const seasons: any[] = [];
        const seasonsSection = $("h2, h3").filter((_, el) => {
            return $(el).text().toLowerCase().includes("season");
        }).first();

        if (seasonsSection.length > 0) {
            seasonsSection.parent().find("a[href^='/anime/']").each((_, link) => {
                try {
                    const seasonUrl = $(link).attr("href");
                    const seasonSlug = seasonUrl?.split("/").pop();
                    const seasonTitle = $(link).find("h3, h4").first().text().trim() ||
                        $(link).text().trim();
                    const seasonPoster = $(link).find("img").attr("src") ||
                        $(link).find("img").attr("data-src");

                    if (seasonSlug && seasonTitle) {
                        seasons.push({
                            id: seasonSlug,
                            title: seasonTitle,
                            poster: seasonPoster?.startsWith("http") ? seasonPoster : (seasonPoster ? `${BASE_URL}${seasonPoster}` : undefined),
                            url: seasonUrl?.startsWith("http") ? seasonUrl : (seasonUrl ? `${BASE_URL}${seasonUrl}` : undefined)
                        });
                    }
                } catch (error) {
                    log.warn(`Failed to parse season: ${error}`);
                }
            });
        }

        // Try to extract episodes from HTML if available
        // Fallback to API only if HTML doesn't have episodes
        let episodes: any[] = [];
        const episodesInHtml = $("a[href*='/watch/']").length;

        if (episodesInHtml > 0) {
            // Episodes are in HTML
            $("a[href*='/watch/']").each((_, link) => {
                try {
                    const epUrl = $(link).attr("href");
                    const epMatch = epUrl?.match(/ep[=\/](\d+)/i);
                    const epNum = epMatch ? parseInt(epMatch[1], 10) : undefined;

                    if (epNum) {
                        const epTitle = $(link).text().trim() || `Episode ${epNum}`;
                        const epImage = $(link).find("img").attr("src") ||
                            $(link).find("img").attr("data-src");

                        episodes.push({
                            number: epNum,
                            title: epTitle,
                            url: epUrl?.startsWith("http") ? epUrl : (epUrl ? `${BASE_URL}${epUrl}` : undefined),
                            image: epImage?.startsWith("http") ? epImage : (epImage ? `${BASE_URL}${epImage}` : undefined)
                        });
                    }
                } catch (error) {
                    log.warn(`Failed to parse episode from HTML: ${error}`);
                }
            });
        } else {
            // Fallback to API for episodes
            log.info(`No episodes in HTML for ${id}, trying API fallback`);
            const apiData = await fetchApi(`${BASE_URL}/api/anime/${id}/episodes-range?page=0&lang=JAPANESE&pageSize=100`);
            if (apiData && apiData.episodes) {
                apiData.episodes.forEach((ep: any) => {
                    episodes.push({
                        number: ep.number,
                        title: ep.name || `Episode ${ep.number}`,
                        url: `${BASE_URL}/watch/${id}?ep=${ep.number}`,
                        image: ep.img,
                        isFiller: ep.isFiller
                    });
                });
            }
        }

        // Group episodes into seasons if we have multiple seasons
        const groupedSeasons = seasons.length > 0 ? seasons.map(s => ({
            ...s,
            episodes: episodes.filter(e => e.url?.includes(s.id))
        })) : (episodes.length > 0 ? [{ title: "Season 1", episodes }] : []);

        return {
            id,
            anilistId,
            malId: anilistId,
            title,
            description,
            poster: poster?.startsWith("http") ? poster : (poster ? `${BASE_URL}${poster}` : undefined),
            rating,
            genres: genres.length > 0 ? genres : undefined,
            seasons: groupedSeasons
        };
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data });
});

// ========== WATCH (Episode Sources) ==========
animelokRouter.get("/watch/:id", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const id = c.req.param("id");
    const ep = c.req.query("ep") || "1";
    const force = c.req.query("force") === "true";

    if (force) {
        await cache.invalidate(`animelok:watch:${id}:${ep}`);
    }

    const data = await cache.getOrSet(async () => {
        log.info(`Fetching Animelok watch (API-only): ${id} ep ${ep}`);

        // 1. Fetch main episode data from API
        // Format: /api/anime/:id/episodes/:ep
        let apiUrl = `${BASE_URL}/api/anime/${id}/episodes/${ep}`;
        let apiData = await fetchApi(apiUrl);

        // Smart Retry: If API fails (likely 404 due to wrong ID meaning it's missing the suffix), try to find the correct ID via search
        if (!apiData || !apiData.episode) {
            log.info(`[Animelok] Direct API fetch failed for ${id}. Attempting to resolve correct ID via search...`);
            try {
                // Search using the ID (which is usually the slug, e.g., "naruto-shippuden")
                // Convert hyphens to spaces for better search results
                const query = id.replace(/-/g, " ");
                const searchHtml = await fetchHtml(`${BASE_URL}/search?keyword=${encodeURIComponent(query)}`);
                const $ = cheerio.load(searchHtml);

                // Find first result
                const firstLink = $("a[href^='/anime/']").first();
                const firstUrl = firstLink.attr("href");

                if (firstUrl) {
                    const realId = firstUrl.split("/").pop(); // e.g., "naruto-shippuden-1735"
                    if (realId && realId !== id) {
                        log.info(`[Animelok] Resolved real ID: ${realId} (was ${id}). Retrying fetch...`);
                        apiUrl = `${BASE_URL}/api/anime/${realId}/episodes/${ep}`;
                        apiData = await fetchApi(apiUrl);
                    }
                }
            } catch (searchError) {
                log.warn(`[Animelok] ID resolution failed: ${searchError}`);
            }
        }

        if (!apiData || !apiData.episode) {
            log.warn(`[Animelok] API failed to return data for ${id} ep ${ep} (after retry)`);
            return { id, episode: ep, servers: [], subtitles: [] };
        }

        const episodeData = apiData.episode;
        const title = episodeData.name || `Episode ${ep}`;

        // Helper function to parse servers from API response
        const parseServers = (raw: any) => {
            if (typeof raw === 'string') {
                try {
                    const firstBrace = raw.indexOf('[');
                    const lastBrace = raw.lastIndexOf(']');
                    if (firstBrace !== -1 && lastBrace !== -1) {
                        raw = JSON.parse(raw.substring(firstBrace, lastBrace + 1));
                    } else {
                        return [];
                    }
                } catch (e) {
                    return [];
                }
            }
            if (!Array.isArray(raw)) return [];

            return raw.map((s: any) => {
                let language = s.languages?.[0] || s.language;
                const langCode = s.langCode || "";

                // Map langCode to descriptive names
                if (langCode.includes("TAM")) language = "Tamil";
                else if (langCode.includes("MAL")) language = "Malayalam";
                else if (langCode.includes("TEL")) language = "Telugu";
                else if (langCode.includes("KAN")) language = "Kannada";
                else if (langCode.includes("HIN") || s.name?.toLowerCase().includes("cloud") || s.tip?.toLowerCase().includes("cloud")) language = "Hindi";
                else if (langCode.includes("ENG") || langCode.includes("EN")) language = "English";
                else if (langCode.includes("JAP")) language = "Japanese";

                if (!language || language.trim() === "") language = "Other";

                // Ensure English and Eng are merged by normalizing to "English"
                if (language.toLowerCase() === "eng" || language.toLowerCase() === "english") {
                    language = "English";
                }

                language = language.charAt(0).toUpperCase() + language.slice(1).toLowerCase();

                let url = s.url;
                let isM3U8 = s.isM3U8 || (typeof url === "string" && url.toLowerCase().includes(".m3u8"));

                if (typeof url === 'string' && url.trim().startsWith('[')) {
                    try {
                        const parsedUrl = JSON.parse(url);
                        if (Array.isArray(parsedUrl) && parsedUrl.length > 0) {
                            url = parsedUrl[0].url || url;
                            isM3U8 = true;
                        }
                    } catch (e) { }
                }

                // Proxy all m3u8 files as requested by user to fix playback issues
                if (isM3U8 && typeof url === 'string' && !url.includes("localhost:4000")) {
                    url = `http://localhost:4000/api/v1/animelok/proxy?url=${encodeURIComponent(url)}`;
                }

                return {
                    name: s.name,
                    url: url,
                    language: language,
                    tip: s.tip,
                    isM3U8: isM3U8
                };
            }).filter(s => s.url);
        };

        let servers = parseServers(episodeData.servers);
        let rawSubtitles = episodeData.subtitles || [];

        // If no servers found, try explicitly fetching with lang=dub and lang=sub
        if (servers.length === 0) {
            log.info(`[Animelok] No servers found for ${id} ep ${ep}. Trying lang=dub and lang=sub...`);
            const [dubData, subData] = await Promise.all([
                fetchApi(`${BASE_URL}/api/anime/${id}/episodes/${ep}?lang=dub`),
                fetchApi(`${BASE_URL}/api/anime/${id}/episodes/${ep}?lang=sub`)
            ]);

            const dubServers = parseServers(dubData?.episode?.servers).map(s => ({ ...s, language: s.language === "Other" ? "Dub" : s.language }));
            const subServers = parseServers(subData?.episode?.servers).map(s => ({ ...s, language: s.language === "Other" ? "Sub" : s.language }));

            // Merge and deduplicate
            const seenUrls = new Set();
            for (const s of [...dubServers, ...subServers]) {
                if (!seenUrls.has(s.url)) {
                    servers.push(s);
                    seenUrls.add(s.url);
                }
            }

            // Merge subtitles from fallback results if initial ones were empty
            if (rawSubtitles.length === 0) {
                rawSubtitles = [...(dubData?.episode?.subtitles || []), ...(subData?.episode?.subtitles || [])];
            }
        }

        // Map and deduplicate subtitles
        const seenSubs = new Set();
        const subtitles = (Array.isArray(rawSubtitles) ? rawSubtitles : []).map((sub: any) => ({
            label: sub.name || sub.label || "English",
            src: sub.url || sub.src
        })).filter(sub => {
            if (!sub.src || seenSubs.has(sub.src)) return false;
            seenSubs.add(sub.src);
            return true;
        });

        // 2. Fetch episode list for navigation
        let episodes: any[] = [];
        try {
            const allEpisodesData = await fetchApi(`${BASE_URL}/api/anime/${id}/episodes-range?page=0&lang=JAPANESE&pageSize=1000`);
            if (allEpisodesData && allEpisodesData.episodes) {
                episodes = allEpisodesData.episodes.map((epItem: any) => ({
                    number: epItem.number,
                    title: epItem.name || `Episode ${epItem.number}`,
                    url: `${BASE_URL}/watch/${id}?ep=${epItem.number}`,
                    image: epItem.img,
                    isFiller: epItem.isFiller
                }));
            }
        } catch (e) {
            log.warn(`[Animelok] Episodes list fetch failed for ${id}`);
        }

        const animeTitle = apiData.anime?.title || "Unknown Anime";

        return {
            id,
            anilistId: apiData.anime?.id || extractAnilistId(id),
            malId: apiData.anime?.id || extractAnilistId(id),
            animeTitle,
            episode: ep,
            title, // Episode title
            servers,
            subtitles,
            episodes: episodes.length > 0 ? episodes : undefined
        };
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data });
});

// ========== ANIME SEASONS ==========
animelokRouter.get("/anime/:id/seasons", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const id = c.req.param("id");

    const data = await cache.getOrSet(async () => {
        log.info(`Fetching Animelok anime seasons: ${BASE_URL}/anime/${id}`);
        const html = await fetchHtml(`${BASE_URL}/anime/${id}`);
        const $ = cheerio.load(html);

        const seasons: any[] = [];

        // Look for "Seasons of this Anime" or similar section
        const seasonsSection = $("h2, h3").filter((_, el) => {
            const text = $(el).text().toLowerCase();
            return text.includes("season") || text.includes("related");
        }).first();

        if (seasonsSection.length > 0) {
            seasonsSection.parent().find("a[href^='/anime/']").each((_, link) => {
                try {
                    const seasonUrl = $(link).attr("href");
                    const seasonSlug = seasonUrl?.split("/").pop();
                    const seasonTitle = $(link).find("h3, h4").first().text().trim() ||
                        $(link).text().trim();
                    const seasonPoster = $(link).find("img").attr("src") ||
                        $(link).find("img").attr("data-src");
                    const seasonAnilistId = seasonSlug ? extractAnilistId(seasonSlug) : null;

                    if (seasonSlug && seasonTitle) {
                        seasons.push({
                            id: seasonAnilistId?.toString() || seasonSlug,
                            anilistId: seasonAnilistId,
                            malId: seasonAnilistId,
                            title: seasonTitle,
                            poster: seasonPoster?.startsWith("http") ? seasonPoster : (seasonPoster ? `${BASE_URL}${seasonPoster}` : undefined),
                            url: seasonUrl?.startsWith("http") ? seasonUrl : (seasonUrl ? `${BASE_URL}${seasonUrl}` : undefined)
                        });
                    }
                } catch (error) {
                    log.warn(`Failed to parse season: ${error}`);
                }
            });
        }

        return { id, anilistId: extractAnilistId(id), malId: extractAnilistId(id), seasons };
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data });
});

// ========== CLEAR CACHE ==========
animelokRouter.get("/clear-cache", async (c) => {
    await cache.invalidatePattern("animelok:*");
    return c.json({ message: "Animelok cache cleared" });
});

// ========== PROXY ==========
animelokRouter.get("/proxy", async (c) => {
    const url = c.req.query("url");
    if (!url) return c.json({ error: "Missing url" }, 400);

    try {
        log.info(`[Animelok] Proxying: ${url}`);
        const response = await fetch(url, {
            headers: {
                "User-Agent": USER_AGENT,
                "Referer": "https://animelok.site/",
                "Origin": "https://animelok.site"
            }
        });

        if (!response.ok) {
            log.warn(`[Animelok] Proxy fetch failed with status ${response.status} for ${url}`);
        }

        const body = await response.arrayBuffer();
        const contentType = response.headers.get("Content-Type") || (url.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t");

        return new Response(body, {
            status: response.status,
            headers: {
                "Content-Type": contentType,
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=3600"
            }
        });
    } catch (e) {
        log.error(`[Animelok] Proxy error for ${url}: ${e}`);
        return c.json({ error: "Proxy failed", details: String(e) }, 500);
    }
});

// ========== ROOT ==========
animelokRouter.get("/", (c) => {
    return c.json({
        provider: "Tatakai",
        status: 200,
        message: "Animelok Scraper - HTML-Only with API Fallback for Watch Page",
        endpoints: {
            home: "/api/v1/animelok/home",
            schedule: "/api/v1/animelok/schedule",
            regionalSchedule: "/api/v1/animelok/regional-schedule",
            languages: "/api/v1/animelok/languages",
            languageDetails: "/api/v1/animelok/languages/:language?page=1",
            anime: "/api/v1/animelok/anime/:id",
            animeSeasons: "/api/v1/animelok/anime/:id/seasons",
            watch: "/api/v1/animelok/watch/:id?ep=1",
        },
    });
});

export { animelokRouter };
