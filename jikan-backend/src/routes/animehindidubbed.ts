import { Hono } from 'hono';
import { searchDesiDub, getDesiDubInfo, getDesiDubSources } from '../lib/providers/desidub.js';

const animehindidubbedRouter = new Hono();

// GET /search?title={query}
animehindidubbedRouter.get('/search', async (c) => {
    const title = c.req.query('title') || '';
    const results = await searchDesiDub(title);
    return c.json({ provider: 'AnimeHindiDubbed', status: 200, results });
});

// GET /info/{id}
animehindidubbedRouter.get('/info/:id', async (c) => {
    const id = c.req.param('id');
    const info = await getDesiDubInfo(id);
    if (!info) return c.json({ error: 'Anime not found' }, 404);
    return c.json({ provider: 'AnimeHindiDubbed', status: 200, data: info });
});

// GET /watch/{episodeId}
animehindidubbedRouter.get('/watch/:id', async (c) => {
    const id = c.req.param('id');
    const sources = await getDesiDubSources(id);
    return c.json({ provider: 'AnimeHindiDubbed', status: 200, data: { sources } });
});

export default animehindidubbedRouter;
