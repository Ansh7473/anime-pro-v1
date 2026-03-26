import { Hono } from 'hono';
import { searchAnimeHindiDubbed, getAnimeHindiDubbedInfo, getAnimeHindiDubbedSources } from '../lib/providers/animehindidubbed.js';

const animehindidubbedRouter = new Hono();

// GET /search?title={query}
animehindidubbedRouter.get('/search', async (c) => {
    const title = c.req.query('title') || '';
    const results = await searchAnimeHindiDubbed(title);
    return c.json({ provider: 'AnimeHindiDubbed', status: 200, results });
});

// GET /info/{id}
animehindidubbedRouter.get('/info/:id', async (c) => {
    const id = c.req.param('id');
    const info = await getAnimeHindiDubbedInfo(id);
    if (!info) return c.json({ error: 'Anime not found' }, 404);
    return c.json({ provider: 'AnimeHindiDubbed', status: 200, data: info });
});

// GET /watch/{id}?episode={episodeName}
animehindidubbedRouter.get('/watch/:id', async (c) => {
    const id = c.req.param('id');
    const episode = c.req.query('episode') || '';
    const sources = await getAnimeHindiDubbedSources(id, episode);
    return c.json({ provider: 'AnimeHindiDubbed', status: 200, data: { sources } });
});

export default animehindidubbedRouter;
