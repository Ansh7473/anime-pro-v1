import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

export async function searchAnimeHindiDubbed(query: string) {
    try {
        const url = `https://animehindidubbed.in/wp-json/wp/v2/posts?search=${encodeURIComponent(query)}&per_page=10`;
        const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        if (!res.ok) return [];

        const data = await res.json() as any[];
        const results: any[] = [];

        for (const post of data) {
            const title = post.title?.rendered || '';
            const link = post.link || '';
            const id = post.id?.toString() || '';
            const slug = link.split('/anime/')[1]?.replace(/\/$/, '') || '';

            // Extract image from content
            const content = post.content?.rendered || '';
            const $ = cheerio.load(content);
            const image = $('img').first().attr('src') || '';

            if (title && id) {
                results.push({ id, title, slug, image });
            }
        }

        return results;
    } catch (e) {
        console.error('[AnimeHindiDubbed Search Error]', e);
    }
    return [];
}

export async function getAnimeHindiDubbedInfo(id: string): Promise<{ id: any; title: any; synopsis: string; image: string; link: any; episodes: any[] } | null> {
    try {
        const url = `https://animehindidubbed.in/wp-json/wp/v2/posts/${id}`;
        const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        if (!res.ok) return null;

        const data = await res.json() as any;
        const content = data.content?.rendered || '';
        const $ = cheerio.load(content);

        // Extract synopsis
        const synopsis = $('p').first().text().trim() || '';

        // Extract image
        const image = $('img').first().attr('src') || '';

        // Extract video data from JavaScript
        const scriptContent = $('script').filter((_, el) => {
            const scriptText = $(el).html() || '';
            return scriptText.includes('serverVideos');
        }).html() || '';

        let episodes: any[] = [];
        let videoData: any = { bysewihe: [], servabyss: [], vidgroud: [] };

        // Parse serverVideos object - handle trailing comma issue
        // Use brace counting to capture the complete object
        const match = scriptContent.match(/const serverVideos = /);
        if (match && match.index !== undefined) {
            try {
                const startIndex = match.index + match[0].length;

                // Count braces to find the end of the object
                let braceCount = 0;
                let endIndex = -1;
                let inString = false;
                let escapeNext = false;
                let foundFirstBrace = false;

                for (let i = startIndex; i < scriptContent.length; i++) {
                    const char = scriptContent[i];

                    if (escapeNext) {
                        escapeNext = false;
                        continue;
                    }

                    if (char === '\\') {
                        escapeNext = true;
                        continue;
                    }

                    if (char === '"' || char === "'" || char === '`') {
                        inString = !inString;
                        continue;
                    }

                    if (!inString) {
                        if (char === '{') {
                            if (!foundFirstBrace) {
                                foundFirstBrace = true;
                            }
                            braceCount++;
                        } else if (char === '}') {
                            braceCount--;
                            if (braceCount === 0 && foundFirstBrace) {
                                endIndex = i + 1;
                                break;
                            }
                        }
                    }
                }

                if (endIndex === -1) {
                    console.log('[AnimeHindiDubbed] Could not find complete object');
                    return [];
                }

                const rawJson = scriptContent.substring(startIndex, endIndex);
                console.log('[AnimeHindiDubbed] Raw match length:', rawJson.length);
                console.log('[AnimeHindiDubbed] Raw match preview:', rawJson.substring(0, 300));

                // Clean the JavaScript object to make it valid JSON
                let jsonStr = rawJson;

                // Step 1: Remove comments before processing
                jsonStr = jsonStr.replace(/\/\/.*$/gm, '');
                jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '');

                // Step 2: Quote unquoted property names (keys) - more robust pattern
                // This pattern matches: { or , followed by whitespace, then an unquoted property name, then :
                jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

                // Step 3: Remove trailing commas before closing braces/brackets
                jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

                // Step 4: Handle single quotes (convert to double quotes)
                // But be careful not to convert single quotes inside already quoted strings
                jsonStr = jsonStr.replace(/'/g, '"');

                // Step 5: Remove any remaining trailing commas
                jsonStr = jsonStr.replace(/,(\s*})/g, '}');
                jsonStr = jsonStr.replace(/,(\s*])/g, ']');

                // Step 6: Handle any remaining issues with empty objects/arrays
                jsonStr = jsonStr.replace(/\{\s*\}/g, '{}');
                jsonStr = jsonStr.replace(/\[\s*\]/g, '[]');

                // DO NOT remove newlines - they are needed for proper JSON parsing
                // The JSON.parse() function can handle newlines in JSON

                console.log('[AnimeHindiDubbed] Cleaned JSON string length:', jsonStr.length);
                console.log('[AnimeHindiDubbed] Cleaned JSON preview:', jsonStr.substring(0, 300));

                // Try to parse with better error handling
                try {
                    videoData = JSON.parse(jsonStr);
                } catch (parseError) {
                    console.error('[AnimeHindiDubbed] JSON parse error:', parseError);
                    console.error('[AnimeHindiDubbed] Problematic JSON snippet:', jsonStr.substring(0, 500));
                    throw parseError;
                }

                // Extract episodes from bysewihe (primary server)
                if (videoData.bysewihe && Array.isArray(videoData.bysewihe)) {
                    episodes = videoData.bysewihe.map((ep: any) => ({
                        name: ep.name || '',
                        url: ep.url || '',
                        server: 'bysewihe'
                    }));
                }

                // Also include episodes from other servers
                if (videoData.servabyss && Array.isArray(videoData.servabyss)) {
                    videoData.servabyss.forEach((ep: any) => {
                        if (!episodes.find((e: any) => e.name === ep.name)) {
                            episodes.push({
                                name: ep.name || '',
                                url: ep.url || '',
                                server: 'servabyss'
                            });
                        }
                    });
                }

                if (videoData.vidgroud && Array.isArray(videoData.vidgroud)) {
                    videoData.vidgroud.forEach((ep: any) => {
                        if (!episodes.find((e: any) => e.name === ep.name)) {
                            episodes.push({
                                name: ep.name || '',
                                url: ep.url || '',
                                server: 'vidgroud'
                            });
                        }
                    });
                }
            } catch (e) {
                console.error('[AnimeHindiDubbed] Failed to parse video data:', e);
            }
        }

        return {
            id: data.id?.toString() || id,
            title: data.title?.rendered || '',
            synopsis,
            image,
            link: data.link || '',
            episodes
        };
    } catch (e) {
        console.error('[AnimeHindiDubbed Info Error]', e);
    }
    return null;
}

export async function getAnimeHindiDubbedSources(id: string, episodeName: string) {
    try {
        const info = await getAnimeHindiDubbedInfo(id);
        if (!info || !info.episodes) return [];

        const sources: any[] = [];

        // Find the episode by name
        let episode = info.episodes.find((ep: any) =>
            ep.name.toLowerCase() === episodeName.toLowerCase() ||
            ep.name.toLowerCase().includes(episodeName.toLowerCase())
        );

        if (!episode) {
            // Try to find by episode number pattern (S1E1, S2E5, etc.)
            const epPattern = episodeName.match(/S(\d+)E(\d+)/i);
            if (epPattern) {
                const season = epPattern[1];
                const epNum = epPattern[2];
                const pattern = `S${season}E${epNum}`;
                const matchedEp = info.episodes.find((ep: any) =>
                    ep.name.toLowerCase().includes(pattern.toLowerCase())
                );
                if (matchedEp) {
                    episode = matchedEp;
                }
            }
        }

        if (!episode) return [];

        // Add source based on server type
        const isEmbed = episode.server !== 'bysewihe';

        sources.push({
            name: episode.server === 'bysewihe' ? 'Bysewihe' :
                episode.server === 'servabyss' ? 'Abysscdn' : 'Listeamed',
            url: episode.url,
            category: 'hindi',
            language: 'Hindi',
            isM3U8: false,
            isEmbed: isEmbed
        });

        return sources;
    } catch (e) {
        console.error('[AnimeHindiDubbed Sources Error]', e);
    }
    return [];
}

// Helper function to get all sources for an anime (all episodes)
export async function getAnimeHindiDubbedAllSources(id: string) {
    try {
        const info = await getAnimeHindiDubbedInfo(id);
        if (!info || !info.episodes) return [];

        const sources: any[] = [];

        for (const episode of info.episodes) {
            const isEmbed = episode.server !== 'bysewihe';

            sources.push({
                name: episode.server === 'bysewihe' ? 'Bysewihe' :
                    episode.server === 'servabyss' ? 'Abysscdn' : 'Listeamed',
                url: episode.url,
                episode: episode.name,
                category: 'hindi',
                language: 'Hindi',
                isM3U8: false,
                isEmbed: isEmbed
            });
        }

        return sources;
    } catch (e) {
        console.error('[AnimeHindiDubbed All Sources Error]', e);
    }
    return [];
}
