import { Hono } from 'hono';
import { getAnilistId, getAnimelokSources, getAnimelokMetadata, searchAnimelok } from '../../lib/providers/animelok.js';
import { getDesiDubSources, searchDesiDub } from '../../lib/providers/desidub.js';
import { searchAnimeHindiDubbed, getAnimeHindiDubbedInfo, getAnimeHindiDubbedSources } from '../../lib/providers/animehindidubbed.js';
import { searchAnimeHindiDubbedWP, getAnimeHindiDubbedAllSourcesWP } from '../../lib/providers/animehindidubbed-wp.js';

const streamingRouter = new Hono();

// Global caches (Titles only)
const titleCache = new Map<string, string>();

// Helper: Get titles from Jikan
async function getAnimeTitles(malId: string): Promise<string[]> {
    if (titleCache.has(malId)) {
        return JSON.parse(titleCache.get(malId)!);
    }
    try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);
        if (res.ok) {
            const data = await res.json() as any;
            const titles: string[] = [];
            if (data.data?.title_english) titles.push(data.data.title_english);
            if (data.data?.title) titles.push(data.data.title);
            if (data.data?.titles) {
                data.data.titles.forEach((t: any) => {
                    if (!titles.includes(t.title)) titles.push(t.title);
                });
            }
            if (titles.length > 0) {
                titleCache.set(malId, JSON.stringify(titles));
            }
            return titles;
        }
    } catch (e) { console.error(`[Jikan] Title fetch error:`, e); }
    return [];
}

// Unified Sources Endpoint
streamingRouter.get('/sources', async (c) => {
    const animeId = c.req.query('animeId');
    const ep = parseInt(c.req.query('ep') || '1');
    const malId = animeId || 'unknown';

    const titles = await getAnimeTitles(malId);
    if (titles.length === 0) return c.json({ error: 'Title not found' }, 404);

    const mainTitle = titles[0];
    console.log(`[Streaming] Fetching aggregated sources for ${mainTitle} Ep ${ep}...`);

    let aggregatedSources: any[] = [];
    let aggregatedSubtitles: any[] = [];
    let providersUsed: string[] = [];

    try {
        // 1. Fetch from Animelok.xyz
        const aniId = await getAnilistId(malId);
        const idCandidates = [malId];
        if (aniId && aniId !== malId) idCandidates.unshift(aniId);

        let foundLok = false;
        const baseSlug = mainTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Try deterministic ID slugs
        for (const id of idCandidates) {
            const candidateSlug = `${baseSlug}-${id}`;
            const results = await getAnimelokSources(candidateSlug, ep);
            if (results.sources && results.sources.length > 0) {
                // Add provider info to each source
                const sourcesWithProvider = results.sources.map((s: any) => ({
                    ...s,
                    provider: 'Animelok'
                }));
                aggregatedSources.push(...sourcesWithProvider);
                if (results.subtitles) aggregatedSubtitles.push(...results.subtitles);
                providersUsed.push('Animelok');
                foundLok = true;
                break;
            }
        }

        // Try Search Fallback if ID fails
        if (!foundLok) {
            const lokResults = await searchAnimelok(mainTitle);
            const lokMatch = lokResults.find((r: any) =>
                titles.some(t => {
                    const rt = (r.title || r.slug || "").toLowerCase();
                    const tt = t.toLowerCase();
                    return rt.includes(tt) || tt.includes(rt);
                })
            );
            if (lokMatch) {
                const slug = lokMatch.slug || lokMatch.id;
                const results = await getAnimelokSources(slug, ep);
                if (results.sources && results.sources.length > 0) {
                    // Add provider info to each source
                    const sourcesWithProvider = results.sources.map((s: any) => ({
                        ...s,
                        provider: 'Animelok (Search)'
                    }));
                    aggregatedSources.push(...sourcesWithProvider);
                    if (results.subtitles) aggregatedSubtitles.push(...results.subtitles);
                    providersUsed.push('Animelok (Search)');
                }
            }
        }

        // 2. Fetch from DesiDubAnime (.me)
        console.log('[Streaming] Searching DesiDubAnime for:', titles);
        for (const title of titles) {
            const desiResults = await searchDesiDub(title);
            console.log('[Streaming] DesiDubAnime search results for', title, ':', desiResults.length, 'results');
            if (desiResults.length > 0) {
                // Find closest match or exact
                const match = desiResults.find(r => r.title.toLowerCase().includes(title.toLowerCase())) || desiResults[0];
                console.log('[Streaming] DesiDubAnime matched:', match.title, 'slug:', match.slug);
                const epSlug = `${match.slug}-episode-${ep}`;
                console.log('[Streaming] DesiDubAnime fetching episode slug:', epSlug);
                const results = await getDesiDubSources(epSlug);
                console.log('[Streaming] DesiDubbed sources found:', results.length);
                if (results.length > 0) {
                    // Add provider info to each source
                    const sourcesWithProvider = results.map(s => ({
                        ...s,
                        provider: 'DesiDubAnime'
                    }));
                    aggregatedSources.push(...sourcesWithProvider);
                    providersUsed.push('DesiDubAnime');
                    break; // Stop searching once we find a good series match
                }
            }
        }

        // 3. Fetch from AnimeHindiDubbed.in (WordPress API)
        console.log('[Streaming] Searching AnimeHindiDubbed-WP for:', titles);
        for (const title of titles) {
            const ahdResults = await searchAnimeHindiDubbedWP(title);
            console.log('[Streaming] AnimeHindiDubbed-WP search results for', title, ':', ahdResults.length, 'results');
            if (ahdResults.length > 0) {
                // Find closest match or exact
                const match = ahdResults.find(r => r.title.rendered.toLowerCase().includes(title.toLowerCase())) || ahdResults[0];
                console.log('[Streaming] AnimeHindiDubbed-WP matched:', match.title.rendered, 'id:', match.id);

                // Get all sources for this episode from all servers
                const sources = await getAnimeHindiDubbedAllSourcesWP(match.id, ep);
                console.log('[Streaming] AnimeHindiDubbed-WP sources found:', sources.length);

                if (sources.length > 0) {
                    // Add provider info to each source
                    const sourcesWithProvider = sources.map(s => ({
                        ...s,
                        provider: 'AnimeHindiDubbed-WP'
                    }));
                    aggregatedSources.push(...sourcesWithProvider);
                    providersUsed.push('AnimeHindiDubbed-WP');
                    break; // Stop searching once we find a good series match
                }
            }
        }

        if (aggregatedSources.length > 0) {
            return c.json({
                provider: providersUsed.join(', '),
                status: 200,
                data: { sources: aggregatedSources, subtitles: aggregatedSubtitles }
            });
        }
    } catch (e: any) { console.error('[Streaming Router] Error:', e.message); }

    return c.json({ provider: 'None', status: 404, message: 'No sources found' }, 404);
});

// Unified Metadata Endpoint
streamingRouter.get('/episode-metadata', async (c) => {
    const animeId = c.req.query('animeId');
    const malId = animeId || 'unknown';
    const titles = await getAnimeTitles(malId);
    if (titles.length === 0) return c.json({ error: 'Title not found' }, 404);

    try {
        const aniId = await getAnilistId(malId);
        const idCandidates = [malId];
        if (aniId && aniId !== malId) idCandidates.unshift(aniId);

        const baseSlug = titles[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        for (const id of idCandidates) {
            const candidateSlug = `${baseSlug}-${id}`;
            const episodes = await getAnimelokMetadata(candidateSlug);
            if (episodes.length > 0) {
                return c.json({ provider: 'Animelok', status: 200, data: { episodes } });
            }
        }
    } catch (e) { console.error('[Metadata Router] Error:', e); }

    return c.json({ provider: 'None', status: 404, message: 'Metadata not found' }, 404);
});

export default streamingRouter;