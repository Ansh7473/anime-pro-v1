import { Hono } from "hono";
import * as cheerio from "cheerio";
import { log } from "../../config/logger.js";
import { cache } from "../../config/cache.js";
import type { ServerContext } from "../../config/context.js";

const aniworldRouter = new Hono<ServerContext>();

const BASE_URL = "https://aniworld.to";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchHtml(url: string, retries = 3): Promise<string> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
                    "Referer": BASE_URL,
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

// Normalize language from German text
function normalizeLanguage(langText: string): { name: string; code: string; isDub: boolean } {
    const lower = langText.toLowerCase();

    if (lower.includes("deutsch") || lower.includes("german")) {
        return { name: "German", code: "de", isDub: true };
    } else if (lower.includes("ger-sub") || lower.includes("german sub")) {
        return { name: "German Sub", code: "de-sub", isDub: false };
    } else if (lower.includes("englisch") || lower.includes("english")) {
        return { name: "English", code: "en", isDub: true };
    } else if (lower.includes("japanisch") || lower.includes("japanese")) {
        return { name: "Japanese", code: "ja", isDub: false };
    }

    return { name: langText, code: "und", isDub: false };
}

// ========== ANIME INFO ==========
// Use wildcard to handle slugs with slashes
aniworldRouter.get("/info/*", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const path = c.req.path.replace("/api/v1/aniworld/info/", "");
    const slug = path; // e.g., "fire-force/staffel-3"

    const data = await cache.getOrSet(async () => {
        log.info(`Fetching Aniworld anime info: ${BASE_URL}/anime/stream/${slug}`);
        const html = await fetchHtml(`${BASE_URL}/anime/stream/${slug}`);
        const $ = cheerio.load(html);

        // Extract title
        const title = $("h1").first().text().trim() ||
            $("meta[property='og:title']").attr("content")?.trim() ||
            "";

        // Extract description
        const description = $("[class*='description']").first().text().trim() ||
            $("meta[property='og:description']").attr("content")?.trim() ||
            $("p").filter((_, el) => $(el).text().length > 100).first().text().trim() ||
            "";

        // Extract poster
        const poster = $("img[class*='cover']").attr("src") ||
            $("img[class*='poster']").attr("src") ||
            $("meta[property='og:image']").attr("content") ||
            "";

        // Extract metadata (year, genres, etc.)
        const yearMatch = $("body").text().match(/(\d{4})/);
        const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

        const genres: string[] = [];
        $("a[href*='/genre/'], [class*='genre'] a").each((_, el) => {
            const genre = $(el).text().trim();
            if (genre) genres.push(genre);
        });

        // Extract Staffeln (seasons)
        const seasons: any[] = [];
        $("a[href*='/staffel-']").each((_, link) => {
            try {
                const seasonUrl = $(link).attr("href");
                const seasonTitle = $(link).text().trim();
                const seasonMatch = seasonUrl?.match(/staffel-(\d+)/i);
                const seasonNum = seasonMatch ? parseInt(seasonMatch[1], 10) : undefined;

                if (seasonUrl && seasonNum) {
                    seasons.push({
                        number: seasonNum,
                        title: seasonTitle || `Staffel ${seasonNum}`,
                        url: seasonUrl.startsWith("http") ? seasonUrl : `${BASE_URL}${seasonUrl}`
                    });
                }
            } catch (error) {
                log.warn(`Failed to parse season: ${error}`);
            }
        });

        // Extract Episoden (episodes) from table
        const episodes: any[] = [];
        $("table tr, [class*='episode']").each((_, row) => {
            try {
                const episodeLink = $(row).find("a[href*='/episode-']").first();
                const episodeUrl = episodeLink.attr("href");

                if (episodeUrl) {
                    const episodeMatch = episodeUrl.match(/episode-(\d+)/i);
                    const episodeNum = episodeMatch ? parseInt(episodeMatch[1], 10) : undefined;

                    const episodeTitle = episodeLink.text().trim() ||
                        $(row).find("td").eq(1).text().trim() ||
                        `Episode ${episodeNum}`;

                    // Extract available languages from table
                    const languages: string[] = [];
                    $(row).find("img[alt*='Deutsch'], img[alt*='German'], img[alt*='English']").each((_, img) => {
                        const alt = $(img).attr("alt") || "";
                        if (alt) languages.push(alt);
                    });

                    if (episodeNum) {
                        episodes.push({
                            number: episodeNum,
                            title: episodeTitle,
                            url: episodeUrl.startsWith("http") ? episodeUrl : `${BASE_URL}${episodeUrl}`,
                            languages: languages.length > 0 ? languages : undefined
                        });
                    }
                }
            } catch (error) {
                log.warn(`Failed to parse episode: ${error}`);
            }
        });

        return {
            slug,
            title,
            description,
            poster: poster?.startsWith("http") ? poster : (poster ? `${BASE_URL}${poster}` : undefined),
            year,
            genres: genres.length > 0 ? genres : undefined,
            seasons: seasons.length > 0 ? seasons : undefined,
            episodes: episodes.length > 0 ? episodes.sort((a, b) => a.number - b.number) : undefined
        };
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data });
});

// ========== WATCH (Episode Sources) ==========
// Use wildcard to handle slugs with slashes
aniworldRouter.get("/watch/*", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const path = c.req.path;
    // Extract slug and episode from path like "/api/v1/aniworld/watch/fire-force/staffel-3/episode/1"
    const match = path.match(/\/watch\/(.+?)\/episode\/(\d+)$/);
    if (!match) {
        return c.json({ provider: "Tatakai", status: 400, error: "Invalid URL format. Expected: /watch/:slug/episode/:num" }, 400);
    }
    let slug = match[1];
    const episodeNum = match[2];

    // Ensure slug contains staffel info. If not, default to staffel-1
    if (!slug.includes('staffel-')) {
        slug = `${slug}/staffel-1`;
    }

    const data = await cache.getOrSet(async () => {
        const watchUrl = `${BASE_URL}/anime/stream/${slug}/episode-${episodeNum}`;
        log.info(`Fetching Aniworld watch: ${watchUrl}`);
        const html = await fetchHtml(watchUrl);
        const $ = cheerio.load(html);

        // Extract episode title
        const title = $("h1, h2").filter((_, el) => {
            const text = $(el).text().toLowerCase();
            return text.includes("episode") || text.includes("folge");
        }).first().text().trim() ||
            $("[class*='episode-title']").first().text().trim() ||
            `Episode ${episodeNum}`;

        // 1. Map data-lang-key to language names from the UI
        const langMap: Record<string, { name: string; code: string; isDub: boolean }> = {};
        $(".changeLanguageBox img").each((_, img) => {
            const key = $(img).attr("data-lang-key");
            const titleAttr = $(img).attr("title") || "";
            const altAttr = $(img).attr("alt") || "";

            if (key) {
                const langInfo = normalizeLanguage(titleAttr || altAttr);
                langMap[key] = langInfo;
            }
        });

        const sources: any[] = [];

        // 2. Extract all redirect links with their language keys
        $("li[data-lang-key][data-link-target]").each((_, li) => {
            try {
                const langKey = $(li).attr("data-lang-key");
                const redirectUrl = $(li).attr("data-link-target");
                const hosterName = $(li).find("h4").text().trim() ||
                    $(li).find(".icon").attr("title")?.replace("Hoster ", "") ||
                    "Unknown";

                if (redirectUrl && langKey) {
                    const langInfo = langMap[langKey] || { name: "Unknown", code: "und", isDub: false };

                    sources.push({
                        name: hosterName,
                        url: redirectUrl.startsWith("http") ? redirectUrl : `${BASE_URL}${redirectUrl}`,
                        language: langInfo.name,
                        langCode: langInfo.code,
                        isDub: langInfo.isDub,
                        isEmbed: true,
                        needsHeadless: false
                    });
                }
            } catch (error) {
                log.warn(`Failed to parse Aniworld hoster: ${error}`);
            }
        });

        // 3. Fallback: search for any /redirect/ links if primary method found nothing
        if (sources.length === 0) {
            $("a[href*='/redirect/']").each((_, link) => {
                try {
                    const redirectUrl = $(link).attr("href");
                    const parent = $(link).closest("li, div");
                    const langKey = parent.attr("data-lang-key");

                    const hosterName = $(link).find("h4").text().trim() ||
                        $(link).text().trim().split("\n")[0].trim() ||
                        "Unknown";

                    if (redirectUrl) {
                        const langInfo = langKey ? langMap[langKey] : normalizeLanguage(parent.text());
                        sources.push({
                            name: hosterName,
                            url: redirectUrl.startsWith("http") ? redirectUrl : `${BASE_URL}${redirectUrl}`,
                            language: langInfo?.name || "Unknown",
                            langCode: langInfo?.code || "und",
                            isDub: langInfo?.isDub || false,
                            isEmbed: true,
                            needsHeadless: false
                        });
                    }
                } catch (error) {
                    log.warn(`Failed to parse fallback Aniworld hoster: ${error}`);
                }
            });
        }

        // Extract available languages
        const availableLanguages: string[] = [];
        $("img[alt*='Deutsch'], img[alt*='German'], img[alt*='English']").each((_, img) => {
            const alt = $(img).attr("alt") || "";
            if (alt && !availableLanguages.includes(alt)) {
                availableLanguages.push(alt);
            }
        });

        return {
            slug,
            episode: episodeNum,
            title,
            sources,
            availableLanguages: availableLanguages.length > 0 ? availableLanguages : undefined,
            headers: {
                Referer: `${BASE_URL}/anime/stream/${slug}/episode-${episodeNum}`,
                "User-Agent": USER_AGENT
            }
        };
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data });
});

// ========== SEARCH ==========
aniworldRouter.get("/search", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const query = c.req.query("q") || c.req.query("keyword");

    if (!query) return c.json({ provider: "Tatakai", status: 400, error: "Missing query" }, 400);

    const data = await cache.getOrSet(async () => {
        log.info(`Searching Aniworld (AJAX): ${BASE_URL}/ajax/search | Query: ${query}`);

        // Aniworld uses a POST JSON API for search suggestions
        const response = await fetch(`${BASE_URL}/ajax/search`, {
            method: "POST",
            headers: {
                "User-Agent": USER_AGENT,
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "X-Requested-With": "XMLHttpRequest",
                "Referer": `${BASE_URL}/search`,
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            body: `keyword=${encodeURIComponent(query)}`
        });

        log.info(`Aniworld AJAX search response status: ${response.status}`);
        let json: any = [];
        try {
            const text = await response.text();
            log.info(`Aniworld AJAX search response text snippet: ${text.substring(0, 100)}`);

            const firstBrace = text.indexOf('[');
            const lastBrace = text.lastIndexOf(']');
            if (firstBrace !== -1 && lastBrace !== -1) {
                json = JSON.parse(text.substring(firstBrace, lastBrace + 1));
            } else {
                log.warn(`No JSON array found in Aniworld AJAX search response`);
                throw new Error("No JSON found");
            }
        } catch (e) {
            log.warn(`Aniworld AJAX search parsing failed: ${e}. Falling back to HTML.`);
            // Fallback to HTML search
            try {
                const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;
                log.info(`Fetching Aniworld HTML search: ${searchUrl}`);
                const htmlResponse = await fetch(searchUrl, { headers: { "User-Agent": USER_AGENT } });
                if (!htmlResponse.ok) {
                    log.error(`Aniworld HTML search failed with status: ${htmlResponse.status}`);
                    return { results: [] };
                }
                const html = await htmlResponse.text();
                const $ = cheerio.load(html);
                const htmlResults: any[] = [];

                $("a[href*='/stream/']").each((_, el) => {
                    const title = $(el).find("h3").text().trim() || $(el).text().trim();
                    const url = $(el).attr("href");
                    if (url && title) {
                        const slug = url.split("/stream/").pop()?.split("/")[0];
                        if (slug) {
                            htmlResults.push({
                                title,
                                slug,
                                url: url.startsWith("http") ? url : `${BASE_URL}${url}`
                            });
                        }
                    }
                });
                return { results: htmlResults };
            } catch (htmlError) {
                log.error(`Aniworld HTML search crashed: ${htmlError}`);
                return { results: [] };
            }
        }

        const results = (Array.isArray(json) ? json : []).map((item: any) => ({
            title: item.title?.replace(/<[^>]*>?/gm, "") || "", // Remove HTML tags
            slug: item.link?.split("/").pop() || "",
            url: item.link?.startsWith("http") ? item.link : `${BASE_URL}${item.link}`,
            description: item.description?.replace(/<[^>]*>?/gm, "") || ""
        }));

        return { results };
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Tatakai", status: 200, data });
});
aniworldRouter.get("/", (c) => {
    return c.json({
        provider: "Tatakai",
        status: 200,
        message: "Aniworld Scraper - German Dubbed Anime",
        endpoints: {
            info: "/api/v1/aniworld/info/:slug",
            watch: "/api/v1/aniworld/watch/:slug/episode/:num",
        },
    });
});

export { aniworldRouter };
