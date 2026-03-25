import { Hono } from 'hono';
import { searchDesiDub, getDesiDubInfo, getDesiDubSources } from '../lib/providers/desidub.js';

const desidubanimeRouter = new Hono();

// GET /search?q={query}
desidubanimeRouter.get('/search', async (c) => {
    const q = c.req.query('q') || '';
    const results = await searchDesiDub(q);
    return c.json({ provider: 'DesiDubAnime', status: 200, results });
});

// GET /info/{slug}
desidubanimeRouter.get('/info/:slug', async (c) => {
    const slug = c.req.param('slug');
    const info = await getDesiDubInfo(slug);
    if (!info) return c.json({ error: 'Anime not found' }, 404);
    return c.json({ provider: 'DesiDubAnime', status: 200, data: info });
});

// GET /watch/{episodeSlug}
desidubanimeRouter.get('/watch/:id', async (c) => {
    const id = c.req.param('id');
    const sources = await getDesiDubSources(id);
    return c.json({ provider: 'DesiDubAnime', status: 200, data: { sources } });
});

export default desidubanimeRouter;
