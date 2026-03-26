/**
 * AnimeHindiDubbed WordPress API Routes
 * Uses the WordPress REST API to fetch anime data and video sources
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import {
    searchAnimeHindiDubbedWP,
    getAnimeHindiDubbedInfoWP,
    getAnimeHindiDubbedSourcesWP,
    getAnimeHindiDubbedAllSourcesWP,
} from '../lib/providers/animehindidubbed-wp.js';

const router = new Hono();

// Middleware
router.use('*', cors());
router.use('*', logger());

/**
 * Search for anime
 * GET /api/v1/animehindidubbed-wp/search?q={query}
 */
router.get('/search', async (c) => {
    try {
        const query = c.req.query('q');

        if (!query) {
            return c.json({ error: 'Query parameter "q" is required' }, 400);
        }

        console.log('[AnimeHindiDubbed-WP Route] Searching for:', query);
        const results = await searchAnimeHindiDubbedWP(query);

        return c.json({
            success: true,
            data: results,
            count: results.length,
        });
    } catch (error) {
        console.error('[AnimeHindiDubbed-WP Route] Search error:', error);
        return c.json({
            success: false,
            error: 'Failed to search for anime',
        }, 500);
    }
});

/**
 * Get anime info including episodes
 * GET /api/v1/animehindidubbed-wp/info?id={postId}
 */
router.get('/info', async (c) => {
    try {
        const postId = c.req.query('id');

        if (!postId) {
            return c.json({ error: 'Post ID parameter "id" is required' }, 400);
        }

        console.log('[AnimeHindiDubbed-WP Route] Getting info for post:', postId);
        const info = await getAnimeHindiDubbedInfoWP(parseInt(postId));

        if (!info) {
            return c.json({
                success: false,
                error: 'Anime not found',
            }, 404);
        }

        return c.json({
            success: true,
            data: info,
        });
    } catch (error) {
        console.error('[AnimeHindiDubbed-WP Route] Info error:', error);
        return c.json({
            success: false,
            error: 'Failed to get anime info',
        }, 500);
    }
});

/**
 * Get video sources for a specific episode
 * GET /api/v1/animehindidubbed-wp/sources?id={postId}&episode={episodeName}
 */
router.get('/sources', async (c) => {
    try {
        const postId = c.req.query('id');
        const episode = c.req.query('episode');

        if (!postId || !episode) {
            return c.json({
                error: 'Parameters "id" and "episode" are required'
            }, 400);
        }

        console.log('[AnimeHindiDubbed-WP Route] Getting sources for post:', postId, 'episode:', episode);
        const sources = await getAnimeHindiDubbedSourcesWP(parseInt(postId), episode);

        return c.json({
            success: true,
            data: sources,
            count: sources.length,
        });
    } catch (error) {
        console.error('[AnimeHindiDubbed-WP Route] Sources error:', error);
        return c.json({
            success: false,
            error: 'Failed to get video sources',
        }, 500);
    }
});

/**
 * Get all sources for a specific episode number from all servers
 * GET /api/v1/animehindidubbed-wp/all-sources?id={postId}&episode={episodeNumber}
 */
router.get('/all-sources', async (c) => {
    try {
        const postId = c.req.query('id');
        const episode = c.req.query('episode');

        if (!postId || !episode) {
            return c.json({
                error: 'Parameters "id" and "episode" are required'
            }, 400);
        }

        console.log('[AnimeHindiDubbed-WP Route] Getting all sources for post:', postId, 'episode:', episode);
        const sources = await getAnimeHindiDubbedAllSourcesWP(parseInt(postId), parseInt(episode));

        return c.json({
            success: true,
            data: sources,
            count: sources.length,
        });
    } catch (error) {
        console.error('[AnimeHindiDubbed-WP Route] All sources error:', error);
        return c.json({
            success: false,
            error: 'Failed to get all video sources',
        }, 500);
    }
});

export default router;
