
import { Hono } from "hono";
import { type ServerContext } from "../../config/context.js";
import { log } from "../../config/logger.js";
import { env } from "../../config/env.js";
import { cache } from "../../config/cache.js";
import * as cheerio from "cheerio";

const desidubRouter = new Hono<ServerContext>();

const BASE_URL = "https://www.desidubanime.me";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchWithRetry(url: string, options: any = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, {
                ...options,
                signal: AbortSignal.timeout(30000),
            });
            if (res.ok) return res;
            if (res.status === 404) throw new Error("Status 404"); // Don't retry 404s
            throw new Error(`Status ${res.status}`);
        } catch (e) {
            if (i === retries - 1 || (e instanceof Error && e.message === "Status 404")) throw e;
            await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        }
    }
    throw new Error("Failed after retries");
}

// Extract next episode estimation text
function extractNextEpisodeEstimate(html: string, $: cheerio.CheerioAPI): Array<{ lang?: string; server?: string; label: string; iso?: string }> {
    const estimates: Array<{ lang?: string; server?: string; label: string; iso?: string }> = [];

    // Look for "Estimated the next episode will come at" or similar text
    const estimateSelectors = [
        "[class*='estimate']",
        "[class*='next-episode']",
        "div:contains('Estimated')",
        "div:contains('next episode')",
        "span:contains('Estimated')"
    ];

    for (const selector of estimateSelectors) {
        $(selector).each((_, el) => {
            const text = $(el).text().trim();
            const estimateMatch = text.match(/estimated.*?next.*?episode.*?will.*?come.*?at\s*(.+)/i);

            if (estimateMatch) {
                // Try to extract language/server from parent context
                const parent = $(el).closest("div, section");
                const serverName = parent.find("button, [class*='server']").first().text().trim();
                const langText = parent.find("[class*='lang'], [class*='dub']").first().text().trim();

                estimates.push({
                    lang: langText || undefined,
                    server: serverName || undefined,
                    label: estimateMatch[1].trim(),
                    iso: undefined // Could parse date if needed
                });
            }
        });
    }

    return estimates;
}

desidubRouter.get("/test", async (c) => {
    try {
        const response = await fetchWithRetry(`${BASE_URL}/wp-json/wp/v2/anime?per_page=1`, {
            headers: { "User-Agent": USER_AGENT },
        });
        return c.json({ status: response.status, ok: response.ok });
    } catch (e) {
        return c.json({ error: String(e) }, 500);
    }
});

desidubRouter.get("/home", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");

    try {
        const data = await cache.getOrSet(
            async () => {
                const response = await fetchWithRetry(BASE_URL, {
                    headers: { "User-Agent": USER_AGENT },
                });
                const html = await response.text();
                const $ = cheerio.load(html);

                const featured: any[] = [];

                // Verified selector: .swiper-slide (Spotlight)
                $(".swiper-slide").each((_, element) => {
                    // Title logic: h2 > span[data-en-title] or h2
                    let title = $(element).find("h2 span[data-en-title]").text().trim();
                    if (!title) title = $(element).find("h2").text().trim();

                    const url = $(element).find("a").attr("href");
                    const img = $(element).find("img").attr("data-src") || $(element).find("img").attr("src");

                    let slug = "";
                    if (url) {
                        const match = url.match(/\/(?:anime|series)\/([^\/]+)\/?$/);
                        if (match) slug = match[1];
                    }

                    if (title && slug && url) {
                        featured.push({
                            title,
                            slug,
                            url,
                            poster: img,
                            type: "series"
                        });
                    }
                });

                const uniqueFeatured = Array.from(new Map(featured.map(item => [item.slug, item])).values()).slice(0, 20);

                // Enhancement 1: Fetch reliable posters via REST API for featured items
                const enrichedFeatured = await Promise.all(uniqueFeatured.map(async (item) => {
                    if (item.poster && !item.poster.includes("placeholder")) return item;

                    try {
                        const metaUrl = `${BASE_URL}/wp-json/wp/v2/anime?slug=${item.slug}&_embed`;
                        const metaRes = await fetchWithRetry(metaUrl, { headers: { "User-Agent": USER_AGENT } });
                        const metaData = await metaRes.json() as any[];

                        if (metaData && metaData.length > 0) {
                            const post = metaData[0];
                            let poster = post.jetpack_featured_media_url || "";
                            if (!poster && post._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
                                poster = post._embedded['wp:featuredmedia'][0].source_url;
                            }
                            if (poster) return { ...item, poster };
                        }
                    } catch (e) {
                        log.warn(`Metadata enrichment failed for ${item.slug}`);
                    }
                    return item;
                }));

                // Enhancement 2: Fetch Jikan Sections, Category rows, and Schedule
                let trendingGlobal: any[] = [];
                let topAnime: any[] = [];
                let recommendations: any[] = [];
                let latest: any[] = [];
                let tvShows: any[] = [];
                let movies: any[] = [];
                let todaySchedule: any[] = [];

                // New Top Lists
                let topAiring: any[] = [];
                let mostPopular: any[] = [];
                let topCompleted: any[] = [];

                try {
                    const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
                    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

                    // Sequential fetch of Jikan sections but with smaller delay and better grouping
                    const jikanFetches = [
                        { key: 'trending', url: "https://api.jikan.moe/v4/seasons/now?limit=10" },
                        { key: 'top', url: "https://api.jikan.moe/v4/top/anime?limit=10" },
                        { key: 'rec', url: "https://api.jikan.moe/v4/recommendations/anime" },
                        { key: 'airing', url: "https://api.jikan.moe/v4/top/anime?filter=airing&limit=5" },
                        { key: 'popular', url: "https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=5" },
                        { key: 'completed', url: "https://api.jikan.moe/v4/top/anime?status=complete&type=tv&limit=5" },
                        { key: 'sched', url: `https://api.jikan.moe/v4/schedules?filter=${today}` }
                    ];

                    const jikanResults: Record<string, any> = {};

                    // Process Jikan in small batches to respect rate limits while saving time
                    for (let i = 0; i < jikanFetches.length; i += 2) {
                        const batch = jikanFetches.slice(i, i + 2);
                        const results = await Promise.all(batch.map(async (item) => {
                            try {
                                const res = await fetchWithRetry(item.url);
                                return { key: item.key, data: await res.json() };
                            } catch (e) {
                                log.warn(`Jikan fetch failed for ${item.key}: ${e}`);
                                return { key: item.key, data: null };
                            }
                        }));

                        results.forEach(r => jikanResults[r.key] = r.data);
                        if (i + 2 < jikanFetches.length) await delay(1000); // 1s delay between batches
                    }

                    // Parallelize DesiDub WP-API fetches (DesiDub usually has no strict rate limit for REST)
                    const [latestRes, tvRes, movRes] = await Promise.all([
                        fetchWithRetry(`${BASE_URL}/wp-json/wp/v2/anime?per_page=10&_embed`).then(r => r.json()).catch(() => []),
                        fetchWithRetry(`${BASE_URL}/wp-json/wp/v2/anime?anime_type=10&per_page=10&_embed`).then(r => r.json()).catch(() => []),
                        fetchWithRetry(`${BASE_URL}/wp-json/wp/v2/anime?anime_type=77&per_page=10&_embed`).then(r => r.json()).catch(() => [])
                    ]);

                    // Normalize Jikan Top List Item
                    const normalizeJikanList = (item: any) => ({
                        title: item.title_english || item.title,
                        slug: item.title.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, ""),
                        poster: item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url,
                        type: item.type || "TV",
                        episodes: item.episodes || "?",
                        score: item.score || "N/A",
                        duration: item.duration || "24M",
                        members: item.members || "0"
                    });

                    if (jikanResults.trending?.data) trendingGlobal = jikanResults.trending.data.map(normalizeJikanList);
                    if (jikanResults.top?.data) topAnime = jikanResults.top.data.map(normalizeJikanList);
                    if (jikanResults.airing?.data) topAiring = jikanResults.airing.data.map(normalizeJikanList);
                    if (jikanResults.popular?.data) mostPopular = jikanResults.popular.data.map(normalizeJikanList);
                    if (jikanResults.completed?.data) topCompleted = jikanResults.completed.data.map(normalizeJikanList);

                    if (jikanResults.rec?.data) {
                        recommendations = jikanResults.rec.data.slice(0, 10).map((item: any) => ({
                            title: item.entry[0].title,
                            slug: item.entry[0].title.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, ""),
                            poster: item.entry[0].images?.webp?.large_image_url || item.entry[0].images?.jpg?.large_image_url,
                            type: "series"
                        }));
                    }

                    // DesiDub Categories
                    const normalizeWP = (items: any[]) => (Array.isArray(items) ? items : []).map(item => ({
                        title: item.title?.rendered?.replace(/&#8217;/g, "'") || "Unknown",
                        slug: item.slug,
                        poster: item.jetpack_featured_media_url || item._embedded?.['wp:featuredmedia']?.[0]?.source_url || "",
                        type: "series"
                    }));

                    latest = normalizeWP(latestRes);
                    tvShows = normalizeWP(tvRes);
                    movies = normalizeWP(movRes);

                    if (jikanResults.sched?.data) {
                        todaySchedule = jikanResults.sched.data.slice(0, 10).map(normalizeJikanList);
                    }

                } catch (e) {
                    log.error("Serious error in home section fetch: " + (e instanceof Error ? e.message : String(e)));
                }

                return {
                    featured: enrichedFeatured,
                    trendingGlobal,
                    topAnime,
                    recommendations,
                    latest,
                    tvShows,
                    movies,
                    todaySchedule,
                    topAiring,
                    mostPopular,
                    topCompleted
                };
            },
            `${cacheConfig.key}_home_v7`,
            cacheConfig.duration
        );

        return c.json({ provider: "Tatakai", status: 200, data });
    } catch (error) {
        // Cast error to safely read message
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error("DesiDubAnime Home Error: " + errorMessage);
        return c.json({ provider: "Tatakai", status: 500, error: "Failed to fetch data: " + errorMessage }, 500);
    }
});

desidubRouter.get("/search", async (c) => {
    const query = c.req.query("q");
    if (!query) return c.json({ error: "Query required" }, 400);

    const cacheConfig = c.get("CACHE_CONFIG");

    try {
        const data = await cache.getOrSet(
            async () => {
                const searchUrl = `${BASE_URL}/wp-admin/admin-ajax.php?action=instant_search&query=${encodeURIComponent(query)}`;
                const response = await fetchWithRetry(searchUrl, {
                    headers: { "User-Agent": USER_AGENT },
                });
                const json = await response.json();

                if (!json.success || !json.data || !json.data.html) {
                    return { results: [] };
                }

                const $ = cheerio.load(json.data.html);
                const results: any[] = [];

                $("a").each((_, element) => {
                    const title = $(element).attr("title") || $(element).find("h3").text().trim();
                    const url = $(element).attr("href");
                    const img = $(element).find("img").attr("src") || $(element).find("img").attr("data-src");

                    if (url && title) {
                        const slugMatch = url.match(/\/anime\/([^\/]+)\/?$/);
                        if (slugMatch) {
                            results.push({
                                title,
                                slug: slugMatch[1],
                                poster: img
                            });
                        }
                    }
                });
                return { results };
            },
            cacheConfig.key,
            cacheConfig.duration
        );

        return c.json({ provider: "Tatakai", status: 200, data });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error("DesiDubAnime Search Error: " + errorMessage);
        return c.json({ provider: "Tatakai", status: 500, error: "Failed to search" }, 500);
    }
});

desidubRouter.get("/category/:category", async (c) => {
    const category = c.req.param("category");
    const page = c.req.query("page") || "1";
    const tab = c.req.query("tab") || "all";
    const cacheConfig = c.get("CACHE_CONFIG");

    try {
        const data = await cache.getOrSet(
            async () => {
                let url = `${BASE_URL}/wp-json/wp/v2/anime?per_page=20&page=${page}&_embed`;

                // Category filtering
                if (category === "tv") {
                    url += "&anime_type=10";
                } else if (category === "movie") {
                    url += "&anime_type=77";
                } else {
                    // Default to latest
                    url += "&orderby=date&order=desc";
                }

                // Tab filtering (Sub/Dub)
                if (tab === "dubbed") {
                    url += "&anime_attribute=82,160,81"; // Hindi, English, Multi
                } else if (tab === "subbed") {
                    // Usually everything that isn't dubbed or explicitly subbed
                    // For now we just return all if subbed is selected as there 
                    // isn't a robust "sub-only" taxonomy ID with counts.
                }

                const response = await fetchWithRetry(url, {
                    headers: { "User-Agent": USER_AGENT },
                });
                const posts = (await response.json()) as any[];

                const results = await Promise.all(posts.map(async (post: any) => {
                    let poster = post.jetpack_featured_media_url || "";
                    if (!poster && post._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
                        poster = post._embedded['wp:featuredmedia'][0].source_url;
                    }

                    // Fallback to searching if still no poster (but usually REST API has it)

                    return {
                        title: post.title.rendered.replace(/&#8217;/g, "'").replace(/&#038;/g, "&").trim(),
                        slug: post.slug,
                        poster: poster,
                        type: category === "movie" ? "movie" : "tv"
                    };
                }));

                const totalItems = parseInt(response.headers.get("X-WP-Total") || "0");
                const totalPages = parseInt(response.headers.get("X-WP-TotalPages") || "0");

                return {
                    results,
                    hasNextPage: parseInt(page) < totalPages,
                    total: totalItems
                };
            },
            cacheConfig.key,
            cacheConfig.duration
        );

        return c.json({ provider: "Tatakai", status: 200, data });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error(`DesiDubAnime Category (${category}) Error: ` + errorMessage);
        return c.json({ provider: "Tatakai", status: 500, error: "Failed to fetch category" }, 500);
    }
});

desidubRouter.get("/schedule", async (c) => {
    const dateQuery = c.req.query("date"); // Expected: YYYY-MM-DD
    const cacheConfig = c.get("CACHE_CONFIG");

    try {
        const data = await cache.getOrSet(
            async () => {
                const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
                let dayName;

                if (dateQuery) {
                    // Use UTC to avoid timezone shifts when parsing YYYY-MM-DD
                    const date = new Date(dateQuery + "T12:00:00Z");
                    dayName = days[date.getUTCDay()];
                } else {
                    dayName = days[new Date().getDay()];
                }

                log.info(`Fetching Jikan Schedule for: ${dayName} (Original: ${dateQuery})`);

                // Use Jikan API for reliable schedule
                const jikanUrl = `https://api.jikan.moe/v4/schedules?filter=${dayName}`;
                const response = await fetchWithRetry(jikanUrl);
                const json = await response.json();

                if (!json.data) {
                    log.warn(`Jikan returned no data for ${dayName}`);
                    return { schedule: [] };
                }

                // Normalize Jikan items to Tatakai schedule format
                const schedule = json.data.map((item: any) => ({
                    title: item.title_english || item.title,
                    time: item.broadcast?.time || "TBA",
                    episode: item.episodes ? `Ep ${item.episodes}` : "??",
                    id: item.mal_id.toString(),
                    slug: item.title.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, ""),
                    poster: item.images?.webp?.image_url || item.images?.jpg?.image_url || ""
                }));

                return { schedule };
            },
            cacheConfig.key,
            cacheConfig.duration
        );

        return c.json({ provider: "Tatakai", status: 200, data });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error("DesiDubAnime Schedule (Jikan) Error: " + errorMessage);
        return c.json({ provider: "Tatakai", status: 500, error: "Failed to fetch schedule from Jikan" }, 500);
    }
});

desidubRouter.get("/info/:id", async (c) => {
    const id = c.req.param("id");
    const cacheConfig = c.get("CACHE_CONFIG");

    try {
        const data = await cache.getOrSet(
            async () => {
                log.info(`Fetching DesiDubAnime Info via API: ${id}`);

                // Step 1: Get Post ID and basic metadata from slug
                let searchIdUrl = `${BASE_URL}/wp-json/wp/v2/anime?slug=${id}`;
                let searchIdResponse = await fetchWithRetry(searchIdUrl, {
                    headers: { "User-Agent": USER_AGENT },
                });
                let searchIdData = (await searchIdResponse.json()) as any[];

                if (!searchIdData || searchIdData.length === 0) {
                    // Fallback: Search for the title if slug lookup fails (useful for Jikan slugs)
                    try {
                        log.info(`Slug ${id} not found, falling back to search`);
                        const searchQuery = id.replace(/-/g, " ");
                        const searchUrl = `${BASE_URL}/wp-admin/admin-ajax.php?action=instant_search&query=${encodeURIComponent(searchQuery)}`;
                        const searchRes = await fetchWithRetry(searchUrl, { headers: { "User-Agent": USER_AGENT } });
                        const searchJson = await searchRes.json();

                        if (searchJson.success && searchJson.data?.html) {
                            const $ = cheerio.load(searchJson.data.html);
                            const firstResult = $("a").first();
                            if (firstResult && firstResult.length > 0) {
                                const newUrl = firstResult.attr("href");
                                if (newUrl) {
                                    const newSlugMatch = newUrl.match(/\/anime\/([^\/]+)\/?$/);
                                    if (newSlugMatch) {
                                        const newSlug = newSlugMatch[1];
                                        log.info(`Found fallback slug: ${newSlug} for ${id}`);
                                        // Re-run lookup with the found slug
                                        const fbUrl = `${BASE_URL}/wp-json/wp/v2/anime?slug=${newSlug}`;
                                        const fbRes = await fetchWithRetry(fbUrl, { headers: { "User-Agent": USER_AGENT } });
                                        const fbData = (await fbRes.json()) as any[];
                                        if (fbData && fbData.length > 0) {
                                            searchIdData = fbData;
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        log.warn(`Search fallback failed for ${id}: ${e instanceof Error ? e.message : String(e)}`);
                    }
                }

                if (!searchIdData || searchIdData.length === 0) {
                    // THROW A CUSTOM ERROR TO BE CAUGHT AND RETURNED AS 404
                    const err = new Error(`Anime not found: ${id}`);
                    (err as any).statusCode = 404;
                    throw err;
                }

                const animePost = searchIdData[0];
                const postId = animePost.id;
                const wpTitle = animePost.title?.rendered || id;
                const wpSynopsis = animePost.content?.rendered || "";

                // Step 2: Get Detailed Metadata (Poster) via _embed
                const detailUrl = `${BASE_URL}/wp-json/wp/v2/anime/${postId}?_embed`;
                const detailResponse = await fetchWithRetry(detailUrl, {
                    headers: { "User-Agent": USER_AGENT },
                });
                const detailData = await detailResponse.json() as any;

                let poster = detailData.jetpack_featured_media_url || "";
                if (!poster && detailData._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
                    poster = detailData._embedded['wp:featuredmedia'][0].source_url;
                }

                // Step 3: Get Episodes via AJAX
                const episodesUrl = `${BASE_URL}/wp-admin/admin-ajax.php?action=get_episodes&anime_id=${postId}&page=1&order=asc`;
                const episodesResponse = await fetchWithRetry(episodesUrl, {
                    headers: { "User-Agent": USER_AGENT },
                });
                const episodesJson = await episodesResponse.json() as any;

                const episodes: any[] = [];
                if (episodesJson.success && episodesJson.data?.episodes) {
                    episodesJson.data.episodes.forEach((ep: any) => {
                        const epUrl = ep.url;
                        const match = epUrl.match(/\/watch\/([^\/]+)\/?/);
                        const epId = match ? match[1] : "";

                        episodes.push({
                            id: epId,
                            number: parseFloat(ep.meta_number || "0"),
                            title: ep.number || `Episode ${ep.meta_number}`,
                            url: epUrl,
                            image: ep.thumbnail
                        });
                    });
                }

                // Extract seasons (fallback to search if needed, but for now we use what's in the post content if any)
                // Often Kiranime puts other seasons in the content or as related posts. 
                // For now, we'll keep it simple as the priority is fixing the episode list.

                return {
                    id: id,
                    title: wpTitle.replace(/&#8217;/g, "'").replace(/&#038;/g, "&").trim(),
                    poster: poster,
                    description: wpSynopsis.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim(),
                    episodes: episodes.sort((a, b) => a.number - b.number),
                };
            },
            cacheConfig.key,
            cacheConfig.duration
        );

        return c.json({
            provider: "Tatakai",
            status: 200,
            data
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const statusCode = (error as any).statusCode || 500;
        log.error("DesiDubAnime Info Error: " + errorMessage);
        return c.json({ provider: "Tatakai", status: statusCode, error: errorMessage }, statusCode);
    }
});

desidubRouter.get("/watch/:id", async (c) => {
    const id = c.req.param("id");
    const cacheConfig = c.get("CACHE_CONFIG");

    try {
        const data = await cache.getOrSet(
            async () => {
                log.info(`Fetching Desidubanime watch: ${BASE_URL}/watch/${id}/`);
                const url = `${BASE_URL}/watch/${id}/`;
                const response = await fetchWithRetry(url, {
                    headers: { "User-Agent": USER_AGENT },
                });
                const html = await response.text();
                const $ = cheerio.load(html);

                const sources: any[] = [];
                const nextEpisodeEstimates: Array<{ lang?: string; server?: string; label: string; iso?: string }> = [];

                // Helper to decode base64 safely
                const decodeB64 = (str: string) => {
                    try {
                        // Node.js safe atob
                        return Buffer.from(str, 'base64').toString('utf-8');
                    } catch (e) {
                        return "";
                    }
                };

                // Detect SUB/DUB servers via data-embed-id
                // Format: base64(Name):base64(URL)
                $("span[data-embed-id]").each((_, el) => {
                    try {
                        const embedData = $(el).attr("data-embed-id");
                        if (!embedData) return;

                        const [b64Name, b64Url] = embedData.split(":");
                        if (!b64Name || !b64Url) return;

                        const serverName = decodeB64(b64Name);
                        let finalUrl = decodeB64(b64Url);

                        if (!finalUrl || !serverName) return;

                        // Check if finalUrl is an iframe tag
                        if (finalUrl.includes("<iframe")) {
                            const iframeSrc = finalUrl.match(/src=['"]([^'"]+)['"]/)?.[1];
                            if (iframeSrc) finalUrl = iframeSrc;
                        }

                        if (finalUrl && !finalUrl.includes("googletagmanager")) {
                            const isDub = serverName.toLowerCase().includes("dub") || serverName.toLowerCase().includes("hindi");
                            sources.push({
                                name: serverName.replace(/dub$/i, "").trim(),
                                url: finalUrl.startsWith("//") ? `https:${finalUrl}` : finalUrl,
                                quality: "default",
                                isM3U8: finalUrl.includes(".m3u8"),
                                isEmbed: !finalUrl.includes(".m3u8"),
                                category: isDub ? "dub" : "sub",
                                language: isDub ? "Hindi" : "Japanese"
                            });
                        }
                    } catch (error) {
                        log.warn(`Failed to parse data-embed-id: ${error}`);
                    }
                });

                // Fallback: Primary parsing logic if span[data-embed-id] is missing
                if (sources.length === 0) {
                    $("button, a, [class*='server']").each((_, el) => {
                        try {
                            const text = $(el).text().trim();
                            const serverNames = ["Mirror", "Stream", "p2p", "Abyss", "V Moly", "CLOUD", "No Ads"];
                            const serverName = serverNames.find(name => text.includes(name));

                            if (serverName) {
                                const finalUrl = $(el).attr("data-src") || $(el).attr("data-url") || $(el).attr("href");
                                if (finalUrl && !finalUrl.includes("googletagmanager") && !finalUrl.includes("cdn-cgi")) {
                                    sources.push({
                                        name: serverName,
                                        url: finalUrl.startsWith("//") ? `https:${finalUrl}` : finalUrl,
                                        quality: "default",
                                        isM3U8: finalUrl.includes(".m3u8"),
                                        isEmbed: true,
                                        category: "dub"
                                    });
                                }
                            }
                        } catch (error) {
                            log.warn(`Failed to parse server fallback: ${error}`);
                        }
                    });
                }

                // Extract next episode estimation
                const estimates = extractNextEpisodeEstimate(html, $);
                nextEpisodeEstimates.push(...estimates);

                return {
                    sources,
                    nextEpisodeEstimates: nextEpisodeEstimates.length > 0 ? nextEpisodeEstimates : undefined,
                };
            },
            cacheConfig.key,
            cacheConfig.duration
        );

        return c.json({
            provider: "Tatakai",
            status: 200,
            data
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error("DesiDubAnime Watch Error: " + errorMessage);
        const status = errorMessage.includes("Status 404") ? 404 : 500;
        return c.json({ provider: "Tatakai", status, error: errorMessage.includes("Status 404") ? "Episode not found" : "Failed to fetch stream" }, status);
    }
});

export default desidubRouter;
