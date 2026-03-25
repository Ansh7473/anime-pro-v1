import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const decodeB64 = (str: string) => {
    try {
        return Buffer.from(str, 'base64').toString('utf-8');
    } catch (e) { return ""; }
};

export async function searchDesiDub(query: string) {
    try {
        const url = `https://desidubanime.me/?s=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        if (!res.ok) return [];
        const html = await res.text();
        const $ = cheerio.load(html);
        const results: any[] = [];
        $('.result-item').each((_, el) => {
            const title = $(el).find('.title a').text().trim();
            const href = $(el).find('.title a').attr('href');
            const slug = href?.split('/anime/')[1]?.replace(/\/$/, '');
            const image = $(el).find('img').attr('src');
            if (slug) results.push({ title, slug, image });
        });
        return results;
    } catch (e) { console.error('[DesiDub Search Error]', e); }
    return [];
}

export async function getDesiDubInfo(slug: string) {
    try {
        const url = `https://desidubanime.me/anime/${slug}/`;
        const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        if (!res.ok) return null;
        const html = await res.text();
        const $ = cheerio.load(html);
        
        const episodes: any[] = [];
        $('.episodios li').each((_, el) => {
            const href = $(el).find('a').attr('href');
            const epNum = $(el).find('.episodionum').text().trim();
            const date = $(el).find('.episodiodate').text().trim();
            const epSlug = href?.split('/watch/')[1]?.replace(/\/$/, '');
            if (epSlug) episodes.push({ number: epNum, slug: epSlug, date });
        });

        return {
            title: $('.data h1').text().trim(),
            synopsis: $('.wp-content p').first().text().trim(),
            image: $('.poster img').attr('src'),
            episodes
        };
    } catch (e) { console.error('[DesiDub Info Error]', e); }
    return null;
}

export async function getDesiDubSources(id: string) {
    try {
        const url = `https://desidubanime.me/watch/${id}/`;
        const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        if (!response.ok) return [];
        const html = await response.text();
        const $ = cheerio.load(html);
        const sources: any[] = [];
        
        $("span[data-embed-id]").each((_, el) => {
            const embedData = $(el).attr("data-embed-id");
            if (!embedData) return;
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
                    category: isDub ? "hindi" : "sub", // Mapping DesiDub Hindi to 'hindi' category
                    language: isDub ? "Hindi" : "Japanese",
                    isM3U8: finalUrl.includes(".m3u8"),
                    isEmbed: !finalUrl.includes(".m3u8")
                });
            }
        });
        return sources;
    } catch (e) { console.error('[DesiDub Sources Error]', e); }
    return [];
}
