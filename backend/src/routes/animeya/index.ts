import { Hono } from "hono";
import { cache } from "../../config/cache.js";
import type { ServerContext } from "../../config/context.js";

const animeyaRouter = new Hono<ServerContext>();

// Helper to extract Next.js RSC data
function parseRSCStream(html: string): any[] {
    const rawLines: any[] = [];
    const regex = /self\.__next_f\.push\(\[(\d+|0),"((?:[^"\\]|\\.)*)"\]\)/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
        let rawContent = match[2];
        try {
            rawContent = JSON.parse(`"${rawContent}"`);
        } catch (e) {
            rawContent = rawContent
                .replace(/\\"/g, '"')
                .replace(/\\n/g, '\n')
                .replace(/\\\\/g, '\\');
        }

        // rawContent SHOULD be a string here (from JSON.parse of a string literal)
        // But let's be safe
        if (typeof rawContent !== 'string') {
            try {
                rawContent = JSON.stringify(rawContent);
            } catch (e) {
                continue;
            }
        }

        // Parse "id:value" lines
        const splitIndex = rawContent.indexOf(':');
        if (splitIndex > -1) {
            const value = rawContent.substring(splitIndex + 1);
            try {
                if (value.trim().startsWith('[') || value.trim().startsWith('{')) {
                    rawLines.push(JSON.parse(value));
                } else {
                    rawLines.push(value);
                }
            } catch (e) {
                rawLines.push(value);
            }
        }
    }
    return rawLines;
}

// Deep search helper
function deepSearch(obj: any, predicate: (val: any) => boolean, results: any[] = []) {
    if (!obj || typeof obj !== 'object') return results;

    try {
        if (predicate(obj)) {
            results.push(obj);
        }

        if (Array.isArray(obj)) {
            for (const item of obj) deepSearch(item, predicate, results);
        } else {
            for (const key in obj) {
                deepSearch(obj[key], predicate, results);
            }
        }
    } catch (e) {
        // Ignore errors during deep search to prevent crashes
    }
    return results;
}

function extractAnimeCard(node: any): any | null {
    try {
        // Expected structure: object with href starting with /watch/ 
        // AND children that contain title/cover info.
        if (!node.href || typeof node.href !== 'string' || !node.href.startsWith('/watch/')) return null;

        // The slug is the part after /watch/
        const slug = node.href.split('/watch/')[1];
        if (!slug) return null;

        // Traverse children to find props
        const props = { slug, title: "Unknown", cover: "", type: "TV" };

        // Find cover
        const coverNode = deepSearch(node, (o) => o && o.cover && (o.cover.large || o.cover.medium)).find(x => x);
        if (coverNode) {
            props.cover = coverNode.cover.large || coverNode.cover.medium;
        }

        // Find title
        const titleNode = deepSearch(node, (o) => o && o.title && (o.title.english || o.title.romaji)).find(x => x);
        if (titleNode) {
            props.title = titleNode.title.english || titleNode.title.romaji || titleNode.title.native;
        }

        // Find type (e.g., TV, ONA) - textual 
        const typeNode = deepSearch(node, (o) => o && o.children === "TV" || o.children === "ONA" || o.children === "MOVIE").find(x => x);
        if (typeNode) {
            props.type = typeNode.children;
        }

        if (!props.cover && !props.title) return null; // Likely not a card

        return props;
    } catch (e) {
        console.error("Error extracting anime card", e);
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
                headers: {
                    ...options.headers,
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                }
            });
            if (response.ok) return response;
            if (response.status === 404) throw new Error("Status 404");
            lastError = new Error(`Status ${response.status}`);
        } catch (error) {
            if (error instanceof Error && error.message === "Status 404") throw error;
            lastError = error as Error;
        }
        if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw lastError || new Error("Failed to fetch");
}

// Routes

// ========== HOME ==========
animeyaRouter.get("/home", async (c) => {
    try {
        const cacheConfig = c.get("CACHE_CONFIG");
        const data = await cache.getOrSet(async () => {
            const response = await fetchWithRetry("https://animeya.cc/home");
            const html = await response.text();
            const rscObjects = parseRSCStream(html);

            const animeCards: any[] = [];
            // Traverse everything to find cards
            rscObjects.forEach(obj => {
                const cards = deepSearch(obj, (o) => o && o.href && typeof o.href === 'string' && o.href.startsWith('/watch/'));
                cards.forEach(cardNode => {
                    const extracted = extractAnimeCard(cardNode);
                    if (extracted) {
                        // Avoid duplicates
                        if (!animeCards.find(a => a.slug === extracted.slug)) {
                            animeCards.push(extracted);
                        }
                    }
                });
            });

            return {
                featured: animeCards.slice(0, 20),
                trending: animeCards.slice(20, 40)
            };
        }, cacheConfig.key, cacheConfig.duration);

        return c.json({ provider: "Animeya", status: 200, data });
    } catch (e: any) {
        console.error("Error in /animeya/home:", e);
        return c.json({ provider: "Animeya", status: 500, error: e.message, stack: e.stack }, 500);
    }
});

// ========== SEARCH ==========
animeyaRouter.get("/search", async (c) => {
    try {
        const cacheConfig = c.get("CACHE_CONFIG");
        const query = c.req.query("q");
        if (!query) return c.json({ provider: "Animeya", status: 400, error: "Missing q parameter" }, 400);

        const data = await cache.getOrSet(async () => {
            const url = `https://animeya.cc/browser?search=${encodeURIComponent(query)}`;
            const response = await fetchWithRetry(url);
            const html = await response.text();
            const rscObjects = parseRSCStream(html);

            const results: any[] = [];
            rscObjects.forEach(obj => {
                const cards = deepSearch(obj, (o) => o && o.href && typeof o.href === 'string' && o.href.startsWith('/watch/'));
                cards.forEach(cardNode => {
                    const extracted = extractAnimeCard(cardNode);
                    if (extracted && !results.find(a => a.slug === extracted.slug)) {
                        results.push(extracted);
                    }
                });
            });

            return results;
        }, cacheConfig.key, cacheConfig.duration);

        return c.json({ provider: "Animeya", status: 200, data });
    } catch (e: any) {
        console.error("Error in /animeya/search:", e);
        return c.json({ provider: "Animeya", status: 500, error: e.message, stack: e.stack }, 500);
    }
});

// ========== INFO/WATCH ==========
animeyaRouter.get("/info/:slug", async (c) => {
    const cacheConfig = c.get("CACHE_CONFIG");
    const slug = c.req.param("slug");

    const data = await cache.getOrSet(async () => {
        const url = `https://animeya.cc/watch/${slug}`;
        const response = await fetchWithRetry(url);
        const html = await response.text();
        const rscObjects = parseRSCStream(html);

        // DETAILS
        let details = {
            id: slug,
            title: slug,
            cover: "",
            description: "",
            episodes: [] as any[]
        };

        // Try to find title in metadata or component
        rscObjects.forEach(obj => {
            // Find episode list: array of objects with episodeNumber
            const episodeLists = deepSearch(obj, (o) => Array.isArray(o) && o.length > 0 && typeof o[0].episodeNumber === 'number');
            if (episodeLists.length > 0) {
                // Sort by length to find the most complete list likely
                episodeLists.sort((a, b) => b.length - a.length);
                details.episodes = episodeLists[0].map((ep: any) => ({
                    id: ep.id,
                    number: ep.episodeNumber,
                    title: ep.title,
                    isFiller: ep.isFiller
                }));
            }

            // Find Details
            if (details.title === slug) {
                const titleNodes = deepSearch(obj, (o) => Array.isArray(o) && o[0] === '$' && o[1] === 'title');
                if (titleNodes.length > 0) {
                    // ["$","title","0",{"children":"ONE PIECE | Animeya"}]
                    const titleText = titleNodes[0][3]?.children;
                    if (titleText) {
                        details.title = titleText.replace(' | Animeya', '');
                    }
                }
            }

            // Search for cover
            if (!details.cover) {
                const coverNode = deepSearch(obj, (o) => o && o.cover && (o.cover.large || o.cover.extraLarge)).find(x => x);
                if (coverNode) {
                    details.cover = coverNode.cover.extraLarge || coverNode.cover.large;
                }
            }

            // Search for description
            if (!details.description) {
                const metaDesc = deepSearch(obj, (o) => Array.isArray(o) && o[0] === '$' && o[1] === 'meta' && o[2] === 'description');
                if (metaDesc.length > 0) {
                    details.description = metaDesc[0][3]?.content || "";
                }
            }
        });

        // Ensure episodes are unique and sorted
        const uniqueEps = new Map();
        details.episodes.forEach(ep => uniqueEps.set(ep.number, ep));
        details.episodes = Array.from(uniqueEps.values()).sort((a, b) => a.number - b.number);

        return details;
    }, cacheConfig.key, cacheConfig.duration);

    return c.json({ provider: "Animeya", status: 200, data });
});

// ========== EPISODE SOURCES ==========
animeyaRouter.get("/watch/:episodeId", async (c) => {
    try {
        const cacheConfig = c.get("CACHE_CONFIG");
        const episodeId = c.req.param("episodeId");

        const data = await cache.getOrSet(async () => {
            // Use the TRPC endpoint direct approach
            const trpcUrl = `https://animeya.cc/api/trpc/episode.getEpisodeFullById?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { "json": parseInt(episodeId, 10) } }))}`;
            const response = await fetchWithRetry(trpcUrl);
            const json = await response.json() as any;

            const episodeData = json[0]?.result?.data?.json;
            if (!episodeData) throw new Error("Episode not found");

            const sources = (episodeData.players || []).map((p: any) => ({
                name: p.name || 'Unknown',
                url: p.url,
                type: p.type || (p.url.includes('.m3u8') ? 'HLS' : 'EMBED'),
                quality: p.quality || '720p',
                langue: p.langue || 'ENG',
                subType: p.subType || 'NONE'
            }));

            return {
                episode: {
                    id: episodeData.id,
                    title: episodeData.title,
                    number: episodeData.episodeNumber
                },
                sources
            };
        }, cacheConfig.key, cacheConfig.duration);

        return c.json({ provider: "Animeya", status: 200, data });
    } catch (e: any) {
        console.error("Error in /animeya/watch:", e);
        const status = e.message === "Status 404" || e.message === "Episode not found" ? 404 : 500;
        return c.json({ provider: "Animeya", status, error: e.message }, status);
    }
});

export { animeyaRouter };
