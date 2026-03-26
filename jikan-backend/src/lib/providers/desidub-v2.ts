import * as cheerio from 'cheerio';
import { desidubLimiter, delay, retryWithBackoff } from '../rateLimiter.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const decodeB64 = (str: string) => {
    try {
        return Buffer.from(str, 'base64').toString('utf-8');
    } catch (e) { return ""; }
};

export async function searchDesiDub(query: string) {
    try {
        await desidubLimiter.acquire();
        await delay(1000); // Additional delay between requests

        const url = `https://www.desidubanime.me/?s=${encodeURIComponent(query)}`;
        console.log('[DesiDub] Searching:', url);

        const res = await retryWithBackoff(async () => {
            return await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        }, 3, 2000);

        if (!res.ok) {
            console.log('[DesiDub] Response not OK:', res.status);
            return [];
        }

        const html = await res.text();
        console.log('[DesiDub] HTML length:', html.length);
        const $ = cheerio.load(html);
        const results: any[] = [];

        // Try multiple selectors for search results
        const selectors = [
            '.result-item',
            '.items .item',
            '.post',
            'article',
            '[class*="anime"]',
            '[class*="card"]',
            'a[href*="/anime/"]'
        ];

        for (const selector of selectors) {
            const items = $(selector);
            console.log(`[DesiDub] Trying selector "${selector}":`, items.length, 'items');

            if (items.length > 0) {
                items.each((_, el) => {
                    const title = $(el).find('a').first().text().trim() || $(el).find('h1, h2, h3').first().text().trim();
                    const href = $(el).find('a').first().attr('href') || $(el).attr('href');
                    const slug = href?.split('/anime/')[1]?.split('/')[0]?.replace(/\/$/, '');
                    const image = $(el).find('img').first().attr('src') || $(el).find('img').attr('data-src');

                    if (title && slug) {
                        console.log('[DesiDub] Found result:', { title, slug });
                        results.push({ title, slug, image });
                    }
                });

                if (results.length > 0) {
                    console.log('[DesiDub] Total results:', results.length);
                    return results;
                }
            }
        }

        console.log('[DesiDub] No results found with any selector');
        return results;
    } catch (e) {
        console.error('[DesiDub Search Error]', e);
    }
    return [];
}

export async function getDesiDubInfo(slug: string) {
    try {
        await desidubLimiter.acquire();
        await delay(1000);

        const url = `https://www.desidubanime.me/anime/${slug}/`;
        console.log('[DesiDub] Getting info:', url);

        const res = await retryWithBackoff(async () => {
            return await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        }, 3, 2000);

        if (!res.ok) return null;

        const html = await res.text();
        const $ = cheerio.load(html);

        const episodes: any[] = [];

        // Try multiple selectors for episodes
        const episodeSelectors = [
            '.episodios li',
            '.episode-list li',
            '.episodes li',
            '[class*="episode"]',
            'a[href*="/watch/"]'
        ];

        for (const selector of episodeSelectors) {
            const items = $(selector);
            console.log(`[DesiDub] Trying episode selector "${selector}":`, items.length, 'episodes');

            if (items.length > 0) {
                items.each((_, el) => {
                    const href = $(el).find('a').attr('href') || $(el).attr('href');
                    const epNum = $(el).find('.episodionum, .episode-number, .ep-num').text().trim() ||
                        $(el).text().match(/Episode\s*(\d+)/i)?.[1] || '';
                    const date = $(el).find('.episodiodate, .episode-date').text().trim();
                    const epSlug = href?.split('/watch/')[1]?.split('/')[0]?.replace(/\/$/, '');

                    if (epSlug && epNum) {
                        episodes.push({ number: epNum, slug: epSlug, date });
                    }
                });

                if (episodes.length > 0) {
                    console.log('[DesiDub] Total episodes:', episodes.length);
                    break;
                }
            }
        }

        return {
            title: $('.data h1, h1, .title').first().text().trim(),
            synopsis: $('.wp-content p, .synopsis, .description').first().text().trim(),
            image: $('.poster img, img').first().attr('src') || $('.poster img, img').first().attr('data-src'),
            episodes
        };
    } catch (e) {
        console.error('[DesiDub Info Error]', e);
    }
    return null;
}

export async function getDesiDubSources(id: string) {
    try {
        await desidubLimiter.acquire();
        await delay(1000);

        const url = `https://www.desidubanime.me/watch/${id}/`;
        console.log('[DesiDub] Getting sources:', url);

        const response = await retryWithBackoff(async () => {
            return await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        }, 3, 2000);

        if (!response.ok) return [];

        const html = await response.text();
        const $ = cheerio.load(html);
        const sources: any[] = [];

        // Try multiple selectors for embed data
        const embedSelectors = [
            'span[data-embed-id]',
            '[data-embed]',
            '[data-src]',
            'iframe[src]',
            'video source[src]'
        ];

        for (const selector of embedSelectors) {
            const items = $(selector);
            console.log(`[DesiDub] Trying embed selector "${selector}":`, items.length, 'items');

            if (items.length > 0) {
                items.each((_, el) => {
                    const embedData = $(el).attr("data-embed-id") || $(el).attr("data-embed");
                    const src = $(el).attr("src") || $(el).attr("data-src");

                    if (embedData) {
                        const [b64Name, b64Url] = embedData.split(":");
                        if (!b64Name || !b64Url) return;
                        const serverName = decodeB64(b64Name);
                        let finalUrl = decodeB64(b64Url);
                        if (!finalUrl || !serverName) return;

                        if (finalUrl.includes("<iframe")) {
                            const iframeSrc = finalUrl.match(/src=['"]([^'"]+)['"]/)?.[1];
                            if (iframeSrc) finalUrl = iframeSrc;
                        }

                        if (finalUrl && !finalUrl.includes("googletagmanager")) {
                            const isDub = serverName.toLowerCase().includes("dub") || serverName.toLowerCase().includes("hindi");
                            sources.push({
                                name: serverName.replace(/dub$/i, "").trim(),
                                url: finalUrl.startsWith("//") ? `https:${finalUrl}` : finalUrl,
                                category: isDub ? "hindi" : "sub",
                                language: isDub ? "Hindi" : "Japanese",
                                isM3U8: finalUrl.includes(".m3u8"),
                                isEmbed: !finalUrl.includes(".m3u8")
                            });
                        }
                    } else if (src) {
                        // Direct iframe or video source
                        const isDub = src.toLowerCase().includes("dub") || src.toLowerCase().includes("hindi");
                        sources.push({
                            name: "Direct",
                            url: src.startsWith("//") ? `https:${src}` : src,
                            category: isDub ? "hindi" : "sub",
                            language: isDub ? "Hindi" : "Japanese",
                            isM3U8: src.includes(".m3u8"),
                            isEmbed: !src.includes(".m3u8")
                        });
                    }
                });

                if (sources.length > 0) {
                    console.log('[DesiDub] Total sources:', sources.length);
                    break;
                }
            }
        }

        return sources;
    } catch (e) {
        console.error('[DesiDub Sources Error]', e);
    }
    return [];
}
