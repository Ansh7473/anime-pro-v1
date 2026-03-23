import { Hono } from "hono";
import * as cheerio from "cheerio";
import { cache } from "../../config/cache.js";
import type { ServerContext } from "../../config/context.js";
import { log } from "../../config/logger.js";

const hindiDubbedRouter = new Hono<ServerContext>();

const BASE_URL = "https://animehindidubbed.in";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface ServerVideo {
    name: string;
    url: string;
}

interface EpisodeServer {
    name: string;
    url: string;
    language: string;
}

interface Episode {
    number: number;
    title: string;
    servers: EpisodeServer[];
}

interface AnimePageData {
    title: string;
    slug: string;
    thumbnail?: string;
    description?: string;
    rating?: string;
    episodes: Episode[];
}

interface SearchResult {
    animeList: Array<{
        title: string;
        slug: string;
        url: string;
        thumbnail?: string;
        categories?: string[];
    }>;
    totalFound: number;
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
    let lastError: Error | null = null;

    for (let i = 0; i <retries; i++) {
        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Referer": BASE_URL,
                },
                signal: AbortSignal.timeout(30000),
            });

            if (response.ok || (response.status >= 400 && response.status <500 && response.status !== 429)) {
                return response;
            }

            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (error) {
            lastError = error as Error;
            log.warn(`Fetch attempt ${i + 1} failed: ${lastError.message}`);
        }

        if (i <retries - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 500));
        }
    }

    throw lastError || new Error("Failed to fetch after retries");
}

async function searchAnime(title: string): Promise<SearchResult> {
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
    log.info(`Searching Hindi dubbed: ${title}`);

    const response = await fetchWithRetry(searchUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    const animeList: SearchResult["animeList"] = [];

    // Select common WordPress/Elementor post article structures
    $("article, .post, .type-post").each((_, element) => {
        const titleEl = $(element).find(".entry-title a, .post-title a, h2 a").first();
        const title = titleEl.text().trim();
        const link = titleEl.attr("href");

        // Image usually in a figure or div
        const img = $(element).find("img").attr("src")
            || $(element).find("img").attr("data-src")
            || $(element).find("img").attr("data-lazy-src");

        // Categories
        const categories: string[] = [];
        $(element).find(".cat-links a, .post-categories a").each((_, cat) => {
            categories.push($(cat).text().trim());
        });

        // Slug extraction
        const slug = link?.match(/animehindidubbed\.in\/([^/]+)\/?/)?.[1];

        if (title && link && slug) {
            animeList.push({
                title,
                slug,
                url: link,
                thumbnail: img,
                categories
            });
        }
    });

    log.info(`Hindi dubbed search found ${animeList.length} results for: ${title}`);

    return {
        animeList,
        totalFound: animeList.length,
    };
}

async function getAnimePage(slug: string): Promise<AnimePageData> {
    const animeUrl = `${BASE_URL}/${slug}/`;
    log.info(`Fetching Hindi dubbed anime: ${slug}`);

    const response = await fetchWithRetry(animeUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $("h1").first().text().trim() || slug.replace(/-/g, " ");
    const thumbnail = $('img[src*="wp-content"]').first().attr("src") ||
        $('meta[property="og:image"]').attr("content");
    const description = $("#short-desc").text().trim() ||
        $('meta[property="og:description"]').attr("content");
    const rating = $(".rating, [class*='rating']").first().text().trim();

    const servers = {
        filemoon: [] as ServerVideo[],
        servabyss: [] as ServerVideo[],
        vidgroud: [] as ServerVideo[],
    };

    // Extract serverVideos from JavaScript
    $("script").each((_, script) => {
        const scriptContent = $(script).html() || "";

        if (scriptContent.includes("serverVideos")) {
            try {
                const serverVideosMatch = scriptContent.match(/const\s+serverVideos\s*=\s*({[\s\S]*?});/);

                if (serverVideosMatch) {
                    let serverVideosStr = serverVideosMatch[1].replace(/'/g, '"');

                    try {
                        const serverData = JSON.parse(serverVideosStr);

                        if (serverData.filemoon) servers.filemoon = serverData.filemoon;
                        if (serverData.servabyss) servers.servabyss = serverData.servabyss;
                        if (serverData.vidgroud) servers.vidgroud = serverData.vidgroud;
                    } catch {
                        // Fallback to regex extraction
                        const extractEpisodes = (serverName: string): ServerVideo[] => {
                            const pattern = new RegExp(`${serverName}:\\s*\\[([\\s\\S]*?)\\]`, "i");
                            const match = serverVideosStr.match(pattern);

                            if (match) {
                                const episodesStr = match[1];
                                const episodes: ServerVideo[] = [];

                                const episodeMatches = episodesStr.matchAll(/\{\s*"name":\s*"([^"]+)"\s*,\s*"url":\s*"([^"]+)"\s*\}/g);

                                for (const epMatch of episodeMatches) {
                                    episodes.push({
                                        name: epMatch[1],
                                        url: epMatch[2],
                                    });
                                }

                                return episodes;
                            }

                            return [];
                        };

                        servers.filemoon = extractEpisodes("filemoon");
                        servers.servabyss = extractEpisodes("servabyss");
                        servers.vidgroud = extractEpisodes("vidgroud");
                    }
                }
            } catch (error) {
                log.error(`Error extracting serverVideos: ${error}`);
            }
        }
    });

    // Consolidate servers into episode-centric structure
    const episodeMap = new Map<number, { number: number; title: string; servers: Array<{ name: string; url: string; language: string }> }>();

    const processServerList = (list: ServerVideo[], serverName: string) => {
        list.forEach(item => {
            let epNum = 0;

            // Handle S{season}E{episode} format (e.g. "S5E12")
            const seMatch = item.name.match(/S(\d+)E(\d+)/i);
            if (seMatch) {
                epNum = parseInt(seMatch[2], 10); // Use EPISODE number, not season
            } else {
                const numMatch = item.name.match(/(\d+)/);
                if (numMatch) {
                    epNum = parseInt(numMatch[1], 10);
                } else {
                    return;
                }
            }

            if (!episodeMap.has(epNum)) {
                episodeMap.set(epNum, {
                    number: epNum,
                    title: `Episode ${epNum}`,
                    servers: []
                });
            }

            episodeMap.get(epNum)!.servers.push({
                name: serverName,
                url: item.url,
                language: "Hindi"
            });
        });
    };

    processServerList(servers.filemoon, "Filemoon");
    processServerList(servers.servabyss, "Servabyss");
    processServerList(servers.vidgroud, "Vidgroud");

    const episodes = Array.from(episodeMap.values()).sort((a, b) => a.number - b.number);
    const totalEpisodes = episodes.length;
    log.info(`Found Hindi dubbed anime: ${title} with ${totalEpisodes} total episodes`);

    return {
        title,
        slug,
        thumbnail,
        description,
        rating,
        episodes,
    };
}

// Routes

// ========== HOME ==========
hindiDubbedRouter.get("/home", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");

    const data = await cache.getOrSet(async () => {
        const response = await fetchWithRetry(BASE_URL);
        const html = await response.text();
        const $ = cheerio.load(html);

        const featured: any[] = [];

        // Parse Elementor figure/figcaption structure
        $("figure.wp-caption").each((_, figure) => {
            const $fig = $(figure);
            const link = $fig.find("a").attr("href");
            const img = $fig.find("img").attr("src") || $fig.find("img").attr("data-lazy-src");
            const caption = $fig.find("figcaption").text().trim();
            const slug = link?.match(/animehindidubbed\.in\/([^\/]+)/)?.[1];

            if (link && slug) {
                featured.push({
                    title: caption || slug.replace(/-/g, " "),
                    slug,
                    poster: img,
                    url: link,
                });
            }
        });

        return { featured };
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data });
});

// ========== CATEGORY ==========
hindiDubbedRouter.get("/category/:name", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const name = c.req.param("name");

    const data = await cache.getOrSet(async () => {
        const response = await fetchWithRetry(`${BASE_URL}/category/${name}/`);
        const html = await response.text();
        const $ = cheerio.load(html);

        const anime: any[] = [];
        $("article").each((_, article) => {
            const title = $(article).find("a").first().text().trim();
            const link = $(article).find("a").first().attr("href");
            const img = $(article).find("img").attr("src") || $(article).find("img").attr("data-lazy-src");
            const slug = link?.match(/animehindidubbed\.in\/([^\/]+)/)?.[1];

            if (title && slug) {
                anime.push({ title, slug, poster: img, url: link });
            }
        });

        return { category: name, anime };
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data });
});

// /api/v1/hindidubbed/search?title={title}
hindiDubbedRouter.get("/search", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const title = c.req.query("title");

    if (!title) {
        return c.json({ provider: "Tatakai", status: 400, error: "Missing title parameter" }, 400);
    }

    const data = await cache.getOrSet(
        () => searchAnime(title),
        cacheConfig.key,
        cacheConfig.duration
    );

    return c.json({ provider: "Tatakai", status: 200, data }, 200);
});

// /api/v1/hindidubbed/anime/{slug}
hindiDubbedRouter.get("/anime/:slug", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const slug = c.req.param("slug");

    if (!slug) {
        return c.json({ provider: "Tatakai", status: 400, error: "Missing slug parameter" }, 400);
    }

    const data = await cache.getOrSet(
        () => getAnimePage(slug),
        cacheConfig.key,
        cacheConfig.duration
    );

    return c.json({ provider: "Tatakai", status: 200, data }, 200);
});

// ========== ROOT ==========
hindiDubbedRouter.get("/", (c) => {
    return c.json({ provider: "Tatakai",
        status: 200,
        message: "AnimeHindiDubbed Scraper - Hindi Dubbed Anime",
        categories: ["hindi-anime-movies", "cartoon-shows", "love-romantic", "crunchiroll"],
        endpoints: {
            home: "/api/v1/hindidubbed/home",
            category: "/api/v1/hindidubbed/category/:name",
            search: "/api/v1/hindidubbed/search?title={query}",
            anime: "/api/v1/hindidubbed/anime/:slug",
        },
    });
});

export { hindiDubbedRouter };
