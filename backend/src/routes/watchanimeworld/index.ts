import { Hono } from "hono";
import { cache } from "../../config/cache.js";
import type { ServerContext } from "../../config/context.js";
import { log } from "../../config/logger.js";
import { env } from "../../config/env.js";
import * as cheerio from "cheerio";

const watchawRouter = new Hono<ServerContext>();

export interface ParsedEpisodeUrl {
    slug: string;
    animeSlug: string;
    season: number;
    episode: number;
    fullUrl: string;
}

export interface LanguageInfo {
    name: string;
    code: string; // ISO 639-1 code
    isDub: boolean;
}

export interface WatchAnimeWorldServer {
    language: string;
    link: string;
    providerName?: string;
}

export interface ResolvedSource {
    url: string;
    isM3U8: boolean;
    quality?: string;
    language?: string;
    langCode?: string;
    isDub?: boolean;
    providerName?: string;
    needsHeadless?: boolean;
}

export interface Subtitle {
    lang: string;
    url: string;
    label?: string;
}

// Language mapping: normalize to canonical names and ISO codes
const LANGUAGE_MAP: Record<string, LanguageInfo> = {
    'hindi': { name: 'Hindi', code: 'hi', isDub: true },
    'tamil': { name: 'Tamil', code: 'ta', isDub: true },
    'telugu': { name: 'Telugu', code: 'te', isDub: true },
    'malayalam': { name: 'Malayalam', code: 'ml', isDub: true },
    'bengali': { name: 'Bengali', code: 'bn', isDub: true },
    'marathi': { name: 'Marathi', code: 'mr', isDub: true },
    'kannada': { name: 'Kannada', code: 'kn', isDub: true },
    'english': { name: 'English', code: 'en', isDub: true },
    'japanese': { name: 'Japanese', code: 'ja', isDub: false },
    'korean': { name: 'Korean', code: 'ko', isDub: true },
    'chinese': { name: 'Chinese', code: 'zh', isDub: true },
    'und': { name: 'Unknown', code: 'und', isDub: false },
};

/**
 * Normalize language string to canonical LanguageInfo
 */
export function normalizeLanguage(lang: string): LanguageInfo {
    const normalized = lang.toLowerCase().trim();
    return LANGUAGE_MAP[normalized] || {
        name: lang,
        code: 'und',
        isDub: normalized !== 'japanese' && normalized !== 'jpn',
    };
}

/**
 * Parse episode URL to extract anime slug, season, and episode
 * @param urlOrSlug - Full URL or slug like "naruto-shippuden-1x1"
 * @returns Parsed episode information
 */
export function parseEpisodeUrl(urlOrSlug: string): ParsedEpisodeUrl | null {
    try {
        let slug = urlOrSlug;
        let fullUrl = urlOrSlug;

        // If it's a full URL, extract the slug
        if (urlOrSlug.startsWith('http')) {
            const url = new URL(urlOrSlug);
            const pathMatch = url.pathname.match(/\/episode\/([^\/]+)\/?$/);
            if (!pathMatch) return null;
            slug = pathMatch[1];
            fullUrl = urlOrSlug;
        } else {
            fullUrl = `https://watchanimeworld.net/episode/${slug}/`;
        }

        // Extract season and episode: e.g., "naruto-shippuden-1x1"
        const seasonEpisodeMatch = slug.match(/^(.+?)-(\d+)x(\d+)$/);
        if (!seasonEpisodeMatch) return null;

        const [, animeSlug, seasonStr, episodeStr] = seasonEpisodeMatch;
        const season = parseInt(seasonStr, 10);
        const episode = parseInt(episodeStr, 10);

        if (isNaN(season) || isNaN(episode)) return null;

        return {
            slug,
            animeSlug,
            season,
            episode,
            fullUrl,
        };
    } catch (error) {
        log.error(`Error parsing episode URL: ${error}`);
        return null;
    }
}


async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3): Promise<Response> {
    let lastError: Error | null = null;

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                ...options,
                signal: AbortSignal.timeout(30000),
            });

            if (response.ok || response.status === 206 || response.status === 302) {
                return response;
            }

            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                // If 404, throw explicitly to avoid retrying if resource really missing
                if (response.status === 404) throw new Error("HTTP 404: Not Found");
                return response;
            }

            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (error) {
            lastError = error as Error;
            log.warn(`Fetch attempt ${i + 1} failed: ${lastError.message}`);
        }

        if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 500));
        }
    }

    throw lastError || new Error("Failed to fetch after retries");
}


// Direct HTML scraper for WatchAnimeWorld (fallback when Supabase unavailable)
async function getEpisodeSourcesDirect(episodeIdentifier: string): Promise<any> {
    const parsed = parseEpisodeUrl(episodeIdentifier);
    if (!parsed) {
        throw new Error("Invalid episode URL/slug format");
    }

    log.info(`Fetching WatchAnimeWorld episode directly: ${parsed.fullUrl}`);

    const response = await fetchWithRetry(parsed.fullUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        },
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    const sources: ResolvedSource[] = [];
    const subtitles: Subtitle[] = [];

    // Extract iframe with player1.php data
    const player1Match = html.match(/iframe[^>]+data-src="([^"]*\/api\/player1\.php\?data=([^"]+))"/i);

    if (player1Match) {
        const player1Data = player1Match[2];

        try {
            // Decode base64 data
            const decoded = atob(player1Data);
            const servers = JSON.parse(decoded);

            log.info(`Found ${servers.length} servers in player1 data`);

            // Process each server
            const langCounts: Record<string, number> = {};
            for (const server of servers) {
                const language = server.language || 'Unknown';
                const link = server.link || '';

                if (!link) continue;

                const langInfo = normalizeLanguage(language);
                const langKey = langInfo.name.toUpperCase();
                langCounts[langKey] = (langCounts[langKey] || 0) + 1;
                const variant = langCounts[langKey] === 1 ? 'I' : 'II';

                // Assign familiar character names
                let charName = 'Z-Fighter';
                if (langKey === 'HINDI') charName = 'Goku';
                else if (langKey === 'TAMIL') charName = 'Vegeta';
                else if (langKey === 'TELUGU') charName = 'Gohan';
                else if (langKey === 'MALAYALAM') charName = 'Piccolo';
                else if (langKey === 'BENGALI') charName = 'Trunks';
                else if (langKey === 'ENGLISH') charName = 'Luffy';
                else if (langKey === 'JAPANESE') charName = 'Zoro';
                else charName = 'Kira';

                const providerName = `${charName} ${variant} (${langInfo.code.toUpperCase()})`;

                // Try to resolve the link and extract m3u8
                try {
                    const providerResponse = await fetchWithRetry(link, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': parsed.fullUrl,
                        },
                    }, 1);

                    const providerHtml = await providerResponse.text();

                    // Check if Cloudflare challenge
                    if (providerHtml.includes('challenge-platform') || providerHtml.includes('Just a moment')) {
                        sources.push({
                            url: link,
                            isM3U8: false,
                            language: langInfo.name,
                            langCode: langInfo.code,
                            isDub: langInfo.isDub,
                            needsHeadless: true,
                            providerName: providerName,
                        });
                        continue;
                    }

                    // Extract m3u8 links
                    const m3u8Regex = /(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/gi;
                    const m3u8Matches = providerHtml.match(m3u8Regex);

                    if (m3u8Matches && m3u8Matches.length > 0) {
                        for (const m3u8Url of m3u8Matches.slice(0, 2)) {
                            sources.push({
                                url: m3u8Url,
                                isM3U8: true,
                                language: langInfo.name,
                                langCode: langInfo.code,
                                isDub: langInfo.isDub,
                                quality: 'HD',
                                providerName: providerName,
                            });
                        }
                    } else {
                        // No direct m3u8 found, mark as needing headless
                        sources.push({
                            url: link,
                            isM3U8: false,
                            language: langInfo.name,
                            langCode: langInfo.code,
                            isDub: langInfo.isDub,
                            needsHeadless: true,
                            providerName: providerName,
                        });
                    }
                } catch (error) {
                    log.warn(`Failed to fetch provider for ${language}: ${error}`);
                    // Add as unresolved source
                    sources.push({
                        url: link,
                        isM3U8: false,
                        language: langInfo.name,
                        langCode: langInfo.code,
                        isDub: langInfo.isDub,
                        needsHeadless: true,
                        providerName: providerName,
                    });
                }
            }
        } catch (error) {
            log.error(`Failed to parse player1 data: ${error}`);
        }
    }

    return {
        headers: {
            Referer: parsed.fullUrl,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        sources,
        subtitles,
        anilistID: null,
        malID: null,
    };
}

async function getEpisodeSources(episodeIdentifier: string): Promise<any> {
    const parsed = parseEpisodeUrl(episodeIdentifier);
    if (!parsed) {
        throw new Error("Invalid episode URL/slug format");
    }

    // Try Supabase first, fallback to direct scraping
    const SUPABASE_URL = env.SUPABASE_URL;
    const AUTH_KEY = env.SUPABASE_AUTH_KEY;

    if (SUPABASE_URL && AUTH_KEY) {
        try {
            log.info(`Fetching WatchAnimeWorld episode via Supabase: ${parsed.slug}`);
            const response = await fetchWithRetry(`${SUPABASE_URL}/functions/v1/watchanimeworld-scraper?episodeUrl=${parsed.slug}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${AUTH_KEY}`,
                    "apikey": AUTH_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ name: "TatakaAPI Proxy" })
            });

            const data = await response.json();

            // Supabase function returns the formatted source object directly
            return data;
        } catch (error) {
            log.warn(`Supabase proxy failed, trying direct scraping: ${error}`);
        }
    }

    // Fallback to direct HTML scraping
    return getEpisodeSourcesDirect(episodeIdentifier);
}


// Routes

// ========== HOME ==========
watchawRouter.get("/home", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const data = await cache.getOrSet(async () => {
        const response = await fetchWithRetry("https://watchanimeworld.net/", {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html",
            },
        });
        const html = await response.text();
        const $ = cheerio.load(html);
        const featured: any[] = [];

        // Parse "Newest Drops" or similar sections
        $(".latest-ep-swiper-slide article.post, article.post.movies").each((_, element) => {
            const title = $(element).find(".entry-title").text().trim();
            const link = $(element).find("a.lnk-blk").attr("href");
            const img = $(element).find("img").attr("src") || $(element).find("img").attr("data-src") || "";

            // Extract slug from URL
            let slug = "";
            if (link) {
                const match = link.match(/\/series\/([^\/]+)\/?$/) || link.match(/\/episode\/([^\/]+)\/?$/);
                if (match) slug = match[1];
            }

            if (title && slug) {
                featured.push({
                    title,
                    slug,
                    url: link,
                    poster: img.startsWith("//") ? "https:" + img : img
                });
            }
        });

        return { featured: featured.slice(0, 20) };
    }, cacheConfig.key, cacheConfig.duration);
    return c.json({ provider: "Tatakai", status: 200, data });
});

// ========== SEARCH ==========
watchawRouter.get("/search", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const query = c.req.query("q");
    if (!query) return c.json({ provider: "Tatakai", status: 400, error: "Missing q parameter" }, 400);

    const data = await cache.getOrSet(async () => {
        const response = await fetchWithRetry(`https://watchanimeworld.net/?s=${encodeURIComponent(query)}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html",
            },
        });
        const html = await response.text();
        const $ = cheerio.load(html);
        const results: any[] = [];

        $("article.post").each((_, element) => {
            const title = $(element).find(".entry-title").text().trim();
            const link = $(element).find("a.lnk-blk").attr("href");
            const img = $(element).find("img").attr("src") || $(element).find("img").attr("data-src") || "";

            // Extract slug from URL
            let slug = "";
            if (link) {
                const match = link.match(/\/series\/([^\/]+)\/?$/) || link.match(/\/episode\/([^\/]+)\/?$/);
                if (match) slug = match[1];
            }

            if (title && slug) {
                results.push({
                    title,
                    slug,
                    url: link,
                    poster: img.startsWith("//") ? "https:" + img : img
                });
            }
        });

        return { results };
    }, cacheConfig.key, cacheConfig.duration);
    return c.json({ provider: "Tatakai", status: 200, data });
});

// ========== PARSE SLUG ==========
watchawRouter.get("/parse/:slug", (c) => {
    const slug = c.req.param("slug");
    const parsed = parseEpisodeUrl(slug);
    if (!parsed) return c.json({ provider: "Tatakai", status: 400, error: "Invalid slug format" }, 400);
    return c.json({ provider: "Tatakai", status: 200, data: parsed });
});

// /api/v1/watchaw/episode?id={naruto-shippuden-1x1} OR ?episodeUrl={url}
watchawRouter.get("/episode", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const episodeUrl = c.req.query("episodeUrl");
    const id = c.req.query("id");

    const identifier = id || episodeUrl;

    if (!identifier) {
        return c.json({ provider: "Tatakai", status: 400, error: "Missing id or episodeUrl parameter" }, 400);
    }

    const data = await cache.getOrSet(
        () => getEpisodeSources(identifier),
        cacheConfig.key,
        cacheConfig.duration
    );
    return c.json({ provider: "Tatakai", status: 200, data }, 200);
});

// ========== ROOT ==========
watchawRouter.get("/", (c) => {
    return c.json({
        provider: "Tatakai",
        status: 200,
        message: "WatchAnimeWorld Scraper - Multi-Language Dubbed Anime",
        endpoints: {
            home: "/api/v1/watchaw/home",
            search: "/api/v1/watchaw/search?q={query}",
            parse: "/api/v1/watchaw/parse/:slug",
            episode: "/api/v1/watchaw/episode?id={slug}",
        },
    });
});

export { watchawRouter };
