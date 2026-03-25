import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

// Simple in-memory rate limiting
const requestTimestamps: number[] = [];
const RATE_LIMIT_WINDOW = 1000; // 1 second
const MAX_REQUESTS_PER_WINDOW = 10; // Increased for development

// Helper to get current season
function getCurrentSeason(): string {
    const month = new Date().getMonth() + 1; // 1-12
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter'; // Dec-Feb
}

// Rate limiting middleware
const jikanRateLimit = async (_c: any, next: () => Promise<void>) => {
    const now = Date.now();

    // Remove timestamps older than the window
    while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW) {
        requestTimestamps.shift();
    }

    // Check if we've exceeded the limit
    if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
        throw new HTTPException(429, {
            message: 'Rate limit exceeded. Please try again later.'
        });
    }

    // Add current timestamp
    requestTimestamps.push(now);

    // Reduced delay for development (was 350ms)
    await new Promise(resolve => setTimeout(resolve, 100));

    await next();
};

const router = new Hono();

// API information
router.get('/', (c) => {
    return c.json({
        name: 'Jikan API Proxy',
        version: '1.0.0',
        description: 'Proxy for Jikan (MyAnimeList) API with rate limiting',
        endpoints: {
            '/anime/:id': 'Get anime by MAL ID (full details)',
            '/anime/:id/basic': 'Get anime by MAL ID (basic details)',
            '/search?q={query}': 'Search anime',
            '/seasonal/:year?/:season?': 'Get seasonal anime',
            '/top': 'Get top anime',
            '/anime/:id/recommendations': 'Get anime recommendations',
            '/anime/:id/characters': 'Get anime characters',
            '/anime/:id/episodes': 'Get anime episodes',
            '/health': 'Health check'
        },
        rate_limits: '3 requests/second, 60 requests/minute (enforced)',
        note: 'This is a proxy for the official Jikan API. All data comes from MyAnimeList.'
    });
});

// Get anime by MAL ID (full details)
router.get('/anime/:id', jikanRateLimit, async (c) => {
    const id = c.req.param('id');

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
        throw new HTTPException(400, { message: 'Invalid anime ID' });
    }

    try {
        const response = await fetch(`https://api.jikan.moe/v4/anime/${id}/full`);

        if (!response.ok) {
            throw new HTTPException(response.status as any, {
                message: `Jikan API error: ${response.statusText}`
            });
        }

        const data = await response.json();
        return c.json(data);
    } catch (error: any) {
        if (error instanceof HTTPException) {
            throw error;
        }
        throw new HTTPException(500, {
            message: `Failed to fetch anime data: ${error.message}`
        });
    }
});

// Get anime by MAL ID (basic details)
router.get('/anime/:id/basic', jikanRateLimit, async (c) => {
    const id = c.req.param('id');

    if (!id || isNaN(parseInt(id))) {
        throw new HTTPException(400, { message: 'Invalid anime ID' });
    }

    try {
        const response = await fetch(`https://api.jikan.moe/v4/anime/${id}`);

        if (!response.ok) {
            throw new HTTPException(response.status as any, {
                message: `Jikan API error: ${response.statusText}`
            });
        }

        const data = await response.json();
        return c.json(data);
    } catch (error: any) {
        if (error instanceof HTTPException) {
            throw error;
        }
        throw new HTTPException(500, {
            message: `Failed to fetch anime data: ${error.message}`
        });
    }
});

// Search anime
router.get('/search', jikanRateLimit, async (c) => {
    const query = c.req.query('q');
    const limit = c.req.query('limit') || '10';
    const page = c.req.query('page') || '1';

    if (!query || query.trim().length === 0) {
        throw new HTTPException(400, { message: 'Search query is required' });
    }

    try {
        const url = new URL('https://api.jikan.moe/v4/anime');
        url.searchParams.append('q', query);
        url.searchParams.append('limit', limit);
        url.searchParams.append('page', page);

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new HTTPException(response.status as any, {
                message: `Jikan API error: ${response.statusText}`
            });
        }

        const data = await response.json();
        return c.json(data);
    } catch (error: any) {
        if (error instanceof HTTPException) {
            throw error;
        }
        throw new HTTPException(500, {
            message: `Failed to search anime: ${error.message}`
        });
    }
});

// Get seasonal anime
router.get('/seasonal/:year?/:season?', jikanRateLimit, async (c) => {
    const year = c.req.param('year') || new Date().getFullYear().toString();
    const season = c.req.param('season') || getCurrentSeason();
    const page = c.req.query('page') || '1';

    try {
        const url = new URL(`https://api.jikan.moe/v4/seasons/${year}/${season}`);
        url.searchParams.append('page', page);

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new HTTPException(response.status as any, {
                message: `Jikan API error: ${response.statusText}`
            });
        }

        const data = await response.json();
        return c.json(data);
    } catch (error: any) {
        if (error instanceof HTTPException) {
            throw error;
        }
        throw new HTTPException(500, {
            message: `Failed to fetch seasonal anime: ${error.message}`
        });
    }
});

// Get top anime
router.get('/top', jikanRateLimit, async (c) => {
    const type = c.req.query('type') || 'tv';
    const page = c.req.query('page') || '1';
    const limit = c.req.query('limit') || '25';

    try {
        const url = new URL('https://api.jikan.moe/v4/top/anime');
        url.searchParams.append('type', type);
        url.searchParams.append('page', page);
        url.searchParams.append('limit', limit);

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new HTTPException(response.status as any, {
                message: `Jikan API error: ${response.statusText}`
            });
        }

        const data = await response.json();
        return c.json(data);
    } catch (error: any) {
        if (error instanceof HTTPException) {
            throw error;
        }
        throw new HTTPException(500, {
            message: `Failed to fetch top anime: ${error.message}`
        });
    }
});

// Get anime recommendations
router.get('/anime/:id/recommendations', jikanRateLimit, async (c) => {
    const id = c.req.param('id');

    if (!id || isNaN(parseInt(id))) {
        throw new HTTPException(400, { message: 'Invalid anime ID' });
    }

    try {
        const response = await fetch(`https://api.jikan.moe/v4/anime/${id}/recommendations`);

        if (!response.ok) {
            throw new HTTPException(response.status as any, {
                message: `Jikan API error: ${response.statusText}`
            });
        }

        const data = await response.json();
        return c.json(data);
    } catch (error: any) {
        if (error instanceof HTTPException) {
            throw error;
        }
        throw new HTTPException(500, {
            message: `Failed to fetch recommendations: ${error.message}`
        });
    }
});

// Get anime characters
router.get('/anime/:id/characters', jikanRateLimit, async (c) => {
    const id = c.req.param('id');

    if (!id || isNaN(parseInt(id))) {
        throw new HTTPException(400, { message: 'Invalid anime ID' });
    }

    try {
        const response = await fetch(`https://api.jikan.moe/v4/anime/${id}/characters`);

        if (!response.ok) {
            throw new HTTPException(response.status as any, {
                message: `Jikan API error: ${response.statusText}`
            });
        }

        const data = await response.json();
        return c.json(data);
    } catch (error: any) {
        if (error instanceof HTTPException) {
            throw error;
        }
        throw new HTTPException(500, {
            message: `Failed to fetch characters: ${error.message}`
        });
    }
});

// Get anime episodes
router.get('/anime/:id/episodes', jikanRateLimit, async (c) => {
    const id = c.req.param('id');
    const page = c.req.query('page') || '1';

    if (!id || isNaN(parseInt(id))) {
        throw new HTTPException(400, { message: 'Invalid anime ID' });
    }

    try {
        const url = new URL(`https://api.jikan.moe/v4/anime/${id}/episodes`);
        url.searchParams.append('page', page);

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new HTTPException(response.status as any, {
                message: `Jikan API error: ${response.statusText}`
            });
        }

        const data = await response.json();
        return c.json(data);
    } catch (error: any) {
        if (error instanceof HTTPException) {
            throw error;
        }
        throw new HTTPException(500, {
            message: `Failed to fetch episodes: ${error.message}`
        });
    }
});

// Get schedule (currently airing anime by day of week)
router.get('/schedule', jikanRateLimit, async (c) => {
    const day = c.req.query('day') || '';
    const filter = c.req.query('filter') || '';
    const kids = c.req.query('kids') || '';
    const sfw = c.req.query('sfw') || '';

    try {
        const url = new URL('https://api.jikan.moe/v4/schedules');

        // Jikan v4 uses 'filter' parameter for day filtering
        // Support both 'day' and 'filter' query parameters
        const dayFilter = day || filter;
        if (dayFilter) {
            url.searchParams.append('filter', dayFilter.toLowerCase());
        }
        if (kids) url.searchParams.append('kids', kids);
        if (sfw) url.searchParams.append('sfw', sfw);

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new HTTPException(response.status as any, {
                message: `Jikan API error: ${response.statusText}`
            });
        }

        const data = await response.json();
        return c.json(data);
    } catch (error: any) {
        if (error instanceof HTTPException) {
            throw error;
        }
        throw new HTTPException(500, {
            message: `Failed to fetch schedule: ${error.message}`
        });
    }
});

// Get current seasonal anime
router.get('/seasons/now', jikanRateLimit, async (c) => {
    const page = c.req.query('page') || '1';
    const limit = c.req.query('limit') || '25';
    const filter = c.req.query('filter') || 'tv';
    const sfw = c.req.query('sfw');
    const unapproved = c.req.query('unapproved');
    const continuing = c.req.query('continuing');

    try {
        const url = new URL('https://api.jikan.moe/v4/seasons/now');
        url.searchParams.append('page', page);
        url.searchParams.append('limit', limit);
        url.searchParams.append('filter', filter);
        if (sfw) url.searchParams.append('sfw', 'true');
        if (unapproved) url.searchParams.append('unapproved', 'true');
        if (continuing) url.searchParams.append('continuing', 'true');

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new HTTPException(response.status as any, {
                message: `Jikan API error: ${response.statusText}`
            });
        }

        const data = await response.json();
        return c.json(data);
    } catch (error: any) {
        if (error instanceof HTTPException) {
            throw error;
        }
        throw new HTTPException(500, {
            message: `Failed to fetch current seasonal anime: ${error.message}`
        });
    }
});

// Get upcoming seasonal anime
router.get('/seasons/upcoming', jikanRateLimit, async (c) => {
    const page = c.req.query('page') || '1';
    const limit = c.req.query('limit') || '25';
    const filter = c.req.query('filter') || 'tv';
    const sfw = c.req.query('sfw');
    const unapproved = c.req.query('unapproved');
    const continuing = c.req.query('continuing');

    try {
        const url = new URL('https://api.jikan.moe/v4/seasons/upcoming');
        url.searchParams.append('page', page);
        url.searchParams.append('limit', limit);
        url.searchParams.append('filter', filter);
        if (sfw) url.searchParams.append('sfw', 'true');
        if (unapproved) url.searchParams.append('unapproved', 'true');
        if (continuing) url.searchParams.append('continuing', 'true');

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new HTTPException(response.status as any, {
                message: `Jikan API error: ${response.statusText}`
            });
        }

        const data = await response.json();
        return c.json(data);
    } catch (error: any) {
        if (error instanceof HTTPException) {
            throw error;
        }
        throw new HTTPException(500, {
            message: `Failed to fetch upcoming seasonal anime: ${error.message}`
        });
    }
});

// Get list of available seasons
router.get('/seasons', jikanRateLimit, async (c) => {
    try {
        const url = new URL('https://api.jikan.moe/v4/seasons');
        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new HTTPException(response.status as any, {
                message: `Jikan API error: ${response.statusText}`
            });
        }

        const data = await response.json();
        return c.json(data);
    } catch (error: any) {
        if (error instanceof HTTPException) {
            throw error;
        }
        throw new HTTPException(500, {
            message: `Failed to fetch seasons list: ${error.message}`
        });
    }
});

// Health check endpoint
router.get('/health', async (c) => {
    try {
        const response = await fetch('https://api.jikan.moe/v4/anime/1');
        const isHealthy = response.ok;

        return c.json({
            status: isHealthy ? 'healthy' : 'unhealthy',
            jikan_api: isHealthy ? 'available' : 'unavailable',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        return c.json({
            status: 'unhealthy',
            jikan_api: 'unavailable',
            error: error.message,
            timestamp: new Date().toISOString()
        }, 503);
    }
});

export default router;