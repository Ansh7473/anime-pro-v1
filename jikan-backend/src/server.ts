import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import jikanRouter from './routes/jikan.js';
import streamingRouter from './routes/streaming/index.js';
import animelokRouter from './routes/animelok.js';
import desidubanimeRouter from './routes/desidubanime.js';
import animehindidubbedRouter from './routes/animehindidubbed.js';
import animehindidubbedWPRouter from './routes/animehindidubbed-wp.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Id', 'apikey'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-Cache-Status'],
    maxAge: 600, // 10 minutes
    credentials: true,
}));

// Health check
app.get('/health', (c) => {
    return c.json({
        status: 'healthy',
        service: 'jikan-backend',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});

// API info
app.get('/', (c) => {
    return c.json({
        name: 'Jikan Backend API',
        version: '1.0.0',
        description: 'Standalone Jikan API backend for anime streaming platform',
        endpoints: {
            '/api/v1/jikan': 'Jikan API proxy endpoints',
            '/health': 'Health check',
        },
        documentation: 'See /api/v1/jikan for available endpoints',
    });
});

// Mount Jikan API routes
app.route('/api/v1/jikan', jikanRouter);

// Mount Streaming API routes
app.route('/api/v1/streaming', streamingRouter);

// Mount Dedicated Provider routes
app.route('/api/v1/animelok', animelokRouter);
app.route('/api/v1/desidubanime', desidubanimeRouter);
app.route('/api/v1/animehindidubbed', animehindidubbedRouter);
app.route('/api/v1/animehindidubbed-wp', animehindidubbedWPRouter);

// 404 handler
app.notFound((c) => {
    return c.json(
        {
            error: 'Not Found',
            message: 'The requested endpoint does not exist',
            path: c.req.path,
        },
        404
    );
});

// Error handler
app.onError((err, c) => {
    console.error('Server error:', err);
    return c.json(
        {
            error: 'Internal Server Error',
            message: err.message || 'Something went wrong',
        },
        500
    );
});

// Start server
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
console.log(`🚀 Jikan Backend Server starting on port ${port}`);

serve({
    fetch: app.fetch,
    port,
}, (info) => {
    console.log(`✅ Server is running on http://localhost:${info.port}`);
    console.log(`📚 API available at http://localhost:${info.port}/api/v1/jikan`);
    console.log(`🏥 Health check at http://localhost:${info.port}/health`);
});
export default app;
