import { Hono } from 'hono';
import { searchAnimelok, getAnimelokMetadata, getAnimelokSources } from '../lib/providers/animelok.js';

const animelokRouter = new Hono();

// GET /search?q={query}
animelokRouter.get('/search', async (c) => {
    const q = c.req.query('q') || '';
    const results = await searchAnimelok(q);
    return c.json({ provider: 'Animelok', status: 200, results });
});

// GET /anime/{id}/seasons (Mapping to our Metadata for episodes)
animelokRouter.get('/anime/:id/seasons', async (c) => {
    const id = c.req.param('id');
    const episodes = await getAnimelokMetadata(id);
    return c.json({ provider: 'Animelok', status: 200, episodes });
});

// GET /watch/{episodeId}?ep={num}
animelokRouter.get('/watch/:id', async (c) => {
    const id = c.req.param('id');
    const ep = parseInt(c.req.query('ep') || '1');
    const results = await getAnimelokSources(id, ep);
    return c.json({ provider: 'Animelok', status: 200, data: results });
});

export default animelokRouter;
