/**
 * AnimeHindiDubbed Provider - WordPress API Version
 * Uses the WordPress REST API to fetch anime data and video sources
 * API Endpoint: https://animehindidubbed.in/wp-json/wp/v2/posts?search={query}
 */

export interface AnimeHindiDubbedSearchResult {
    id: number;
    title: { rendered: string };
    slug: string;
    link: string;
    content: { rendered: string };
}

export interface AnimeHindiDubbedEpisode {
    name: string;
    url: string;
}

export interface AnimeHindiDubbedInfo {
    id: number;
    title: string;
    slug: string;
    link: string;
    episodes: AnimeHindiDubbedEpisode[];
    servers: string[];
}

export interface AnimeHindiDubbedSource {
    url: string;
    type: 'iframe' | 'direct';
    quality?: string;
    server: string;
    provider: string;
    language: string;
}

const BASE_URL = 'https://animehindidubbed.in';
const API_BASE = `${BASE_URL}/wp-json/wp/v2/posts`;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Search for anime using WordPress API
 */
export async function searchAnimeHindiDubbedWP(query: string): Promise<AnimeHindiDubbedSearchResult[]> {
    try {
        console.log('[AnimeHindiDubbed-WP] Searching for:', query);

        const url = `${API_BASE}?search=${encodeURIComponent(query)}&per_page=10`;
        console.log('[AnimeHindiDubbed-WP] Fetching URL:', url);

        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('[AnimeHindiDubbed-WP] Search failed:', response.status, response.statusText);
            return [];
        }

        const data = await response.json() as any[];
        console.log('[AnimeHindiDubbed-WP] Found', data.length, 'results');

        return (data as any[]).map((post: any) => ({
            id: post.id,
            title: { rendered: post.title.rendered },
            slug: post.slug,
            link: post.link,
            content: { rendered: post.content.rendered },
        }));
    } catch (error) {
        console.error('[AnimeHindiDubbed-WP] Search error:', error);
        return [];
    }
}

/**
 * Extract serverVideos object from HTML content
 */
function extractServerVideos(html: string): Record<string, AnimeHindiDubbedEpisode[]> | null {
    try {
        // Look for the serverVideos object in the HTML
        const match = html.match(/const\s+serverVideos\s*=\s*(\{[\s\S]*?\});/);

        if (!match) {
            console.log('[AnimeHindiDubbed-WP] No serverVideos object found in HTML');
            return null;
        }

        const jsonStr = match[1];
        console.log('[AnimeHindiDubbed-WP] Extracted serverVideos string length:', jsonStr.length);

        // Parse the JavaScript object
        const serverVideos = eval(`(${jsonStr})`);

        if (!serverVideos || typeof serverVideos !== 'object') {
            console.log('[AnimeHindiDubbed-WP] Invalid serverVideos object');
            return null;
        }

        console.log('[AnimeHindiDubbed-WP] Found servers:', Object.keys(serverVideos));
        return serverVideos;
    } catch (error) {
        console.error('[AnimeHindiDubbed-WP] Error extracting serverVideos:', error);
        return null;
    }
}

/**
 * Get anime info including episodes from WordPress API
 */
export async function getAnimeHindiDubbedInfoWP(postId: number): Promise<AnimeHindiDubbedInfo | null> {
    try {
        console.log('[AnimeHindiDubbed-WP] Getting info for post ID:', postId);

        const url = `${API_BASE}/${postId}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            console.error('[AnimeHindiDubbed-WP] Failed to get post:', response.status, response.statusText);
            return null;
        }

        const post = await response.json() as any;
        console.log('[AnimeHindiDubbed-WP] Post title:', post.title.rendered);

        // Extract serverVideos from HTML content
        const serverVideos = extractServerVideos(post.content.rendered);

        if (!serverVideos) {
            console.log('[AnimeHindiDubbed-WP] No video data found');
            return null;
        }

        // Flatten all episodes from all servers
        const allEpisodes: AnimeHindiDubbedEpisode[] = [];
        const servers = Object.keys(serverVideos);

        for (const server of servers) {
            const episodes = serverVideos[server];
            console.log('[AnimeHindiDubbed-WP] Server', server, 'has', episodes.length, 'episodes');
            allEpisodes.push(...episodes);
        }

        console.log('[AnimeHindiDubbed-WP] Total episodes:', allEpisodes.length);

        return {
            id: post.id,
            title: post.title.rendered,
            slug: post.slug,
            link: post.link,
            episodes: allEpisodes,
            servers: servers,
        };
    } catch (error) {
        console.error('[AnimeHindiDubbed-WP] Error getting info:', error);
        return null;
    }
}

/**
 * Get video sources for a specific episode
 */
export async function getAnimeHindiDubbedSourcesWP(
    postId: number,
    episodeName: string
): Promise<AnimeHindiDubbedSource[]> {
    try {
        console.log('[AnimeHindiDubbed-WP] Getting sources for post ID:', postId, 'episode:', episodeName);

        const info = await getAnimeHindiDubbedInfoWP(postId);

        if (!info) {
            console.log('[AnimeHindiDubbed-WP] No info found for post');
            return [];
        }

        // Find matching episodes
        const matchingEpisodes = info.episodes.filter(ep => {
            const epNameLower = ep.name.toLowerCase();
            const targetLower = episodeName.toLowerCase();

            // Try various matching patterns
            return epNameLower.includes(targetLower) ||
                epNameLower.includes(`episode ${episodeName}`) ||
                epNameLower.includes(`ep ${episodeName}`) ||
                epNameLower.includes(`s1e${episodeName}`) ||
                epNameLower.includes(`s01e${episodeName}`) ||
                epNameLower.includes(`s1e0${episodeName}`) ||
                epNameLower.includes(`s01e0${episodeName}`);
        });

        console.log('[AnimeHindiDubbed-WP] Found', matchingEpisodes.length, 'matching episodes');

        if (matchingEpisodes.length === 0) {
            console.log('[AnimeHindiDubbed-WP] No matching episodes found');
            return [];
        }

        // Convert to source format
        const sources: AnimeHindiDubbedSource[] = matchingEpisodes.map(ep => {
            // Determine server from URL
            let server = 'unknown';
            if (ep.url.includes('bysewihe.com')) server = 'bysewihe';
            else if (ep.url.includes('short.icu')) server = 'servabyss';
            else if (ep.url.includes('listeamed.net')) server = 'vidgroud';
            else if (ep.url.includes('filemoon')) server = 'filemoon';
            else if (ep.url.includes('mixdrop')) server = 'mixdrop';

            return {
                url: ep.url,
                type: 'iframe',
                quality: '720p',
                server: server,
                provider: 'AnimeHindiDubbed',
                language: 'hindi',
            };
        });

        console.log('[AnimeHindiDubbed-WP] Returning', sources.length, 'sources');
        return sources;
    } catch (error) {
        console.error('[AnimeHindiDubbed-WP] Error getting sources:', error);
        return [];
    }
}

/**
 * Get all sources for a specific episode number from all servers
 */
export async function getAnimeHindiDubbedAllSourcesWP(
    postId: number,
    episodeNumber: number
): Promise<AnimeHindiDubbedSource[]> {
    try {
        console.log('[AnimeHindiDubbed-WP] Getting all sources for post ID:', postId, 'episode:', episodeNumber);

        // Extract serverVideos directly from post
        const serverVideos = await extractServerVideosFromPost(postId);

        if (!serverVideos) {
            console.log('[AnimeHindiDubbed-WP] No serverVideos found');
            return [];
        }

        const sources: AnimeHindiDubbedSource[] = [];
        const servers = Object.keys(serverVideos);
        console.log('[AnimeHindiDubbed-WP] Found servers:', servers);

        // Iterate through all servers
        for (const server of servers) {
            const episodes = serverVideos[server];
            console.log('[AnimeHindiDubbed-WP] Server', server, 'has', episodes.length, 'episodes');

            // Find matching episode
            const matchingEpisodes = episodes.filter(ep => {
                const epNameLower = ep.name.toLowerCase();
                const epNumStr = episodeNumber.toString();
                const epNumStrPadded = episodeNumber.toString().padStart(2, '0');

                return epNameLower.includes(`episode ${epNumStr}`) ||
                    epNameLower.includes(`episode ${epNumStrPadded}`) ||
                    epNameLower.includes(`ep ${epNumStr}`) ||
                    epNameLower.includes(`ep ${epNumStrPadded}`) ||
                    epNameLower.includes(`s1e${epNumStr}`) ||
                    epNameLower.includes(`s01e${epNumStr}`) ||
                    epNameLower.includes(`s1e${epNumStrPadded}`) ||
                    epNameLower.includes(`s01e${epNumStrPadded}`) ||
                    epNameLower.includes(`e${epNumStr}`) ||
                    epNameLower.includes(`e${epNumStrPadded}`);
            });

            console.log('[AnimeHindiDubbed-WP] Server', server, 'found', matchingEpisodes.length, 'matching episodes');

            for (const ep of matchingEpisodes) {
                // Determine language based on server
                let language = 'hindi';
                let quality = '720p';

                if (server === 'bysewihe') {
                    // bysewihe has multi-audio (Hindi-Tamil-Telugu-English-Japanese)
                    language = 'multi';
                    quality = '1080p';
                } else if (server === 'servabyss') {
                    language = 'multi';
                } else if (server === 'vidgroud') {
                    language = 'multi';
                }

                sources.push({
                    url: ep.url,
                    type: 'iframe',
                    quality: quality,
                    server: server,
                    provider: 'AnimeHindiDubbed',
                    language: language,
                });
            }
        }

        console.log('[AnimeHindiDubbed-WP] Returning', sources.length, 'sources from', servers.length, 'servers');
        return sources;
    } catch (error) {
        console.error('[AnimeHindiDubbed-WP] Error getting all sources:', error);
        return [];
    }
}

/**
 * Helper function to extract serverVideos from a post
 */
async function extractServerVideosFromPost(postId: number): Promise<Record<string, AnimeHindiDubbedEpisode[]> | null> {
    try {
        const url = `${API_BASE}/${postId}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            return null;
        }

        const post = await response.json() as any;
        return extractServerVideos(post.content.rendered);
    } catch (error) {
        console.error('[AnimeHindiDubbed-WP] Error extracting serverVideos from post:', error);
        return null;
    }
}
