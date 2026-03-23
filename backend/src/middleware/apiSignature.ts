/**
 * API Signature Verification Middleware
 *
 * Validates `X-Api-Timestamp` + `X-Api-Signature` headers ONLY on specific
 * authenticated/sensitive routes. Proxy and scraper routes are public.
 *
 * When API_SECRET is set and NODE_ENV=production, these protected routes
 * require valid signatures from the official Tatakai client.
 */

import type { MiddlewareHandler } from "hono";
import { verifyApiSignature, isApiCryptoEnabled } from "../config/apiCrypto.js";
import type { ServerContext } from "../config/context.js";
import { log } from "../config/logger.js";

// Routes that REQUIRE signature verification (authenticated/sensitive endpoints)
const PROTECTED_ROUTES: string[] = [
  // Example: future user/comment endpoints
  // '/api/v1/comments/create',
  // '/api/v1/user/profile',
];

// Routes that are ALWAYS public (proxy/scraper endpoints)
const PUBLIC_ROUTES: string[] = [
  '/api/v1/health',
  '/api/v1/version',
  '/api/v1/docs',
  // Proxy/scraper routes (public anime data)
  '/api/v1/hianime',
  '/api/v1/animelok',
  '/api/v1/hindidubbed',
  '/api/v1/desidubanime',
  '/api/v1/aniworld',
  '/api/v1/toonstream',
  '/api/v1/toonworld',
  '/api/v1/animeya',
  '/api/v1/watchaw',
  '/api/v1/hindiapi',
  '/api/v1/anilisthindi',
  '/api/v1/anime-api',
];

function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(route => path.startsWith(route)) ||
         path === '/health' ||
         path === '/version' ||
         path.startsWith('/docs');
}

function isProtectedRoute(path: string): boolean {
  return PROTECTED_ROUTES.some(route => path.startsWith(route));
}

export const apiSignatureGuard: MiddlewareHandler<ServerContext> = async (c, next) => {
    const path = c.req.path;

    // Skip if encryption not configured
    if (!isApiCryptoEnabled()) {
        return next();
    }

    // Public routes: never require signature
    if (isPublicRoute(path)) {
        return next();
    }

    // Protected routes: require signature
    if (isProtectedRoute(path)) {
        const timestamp = c.req.header("x-api-timestamp");
        const signature = c.req.header("x-api-signature");

        if (!verifyApiSignature(path, timestamp, signature)) {
            log.warn(`[API Signature] Rejected unsigned request to ${path}`);
            return c.json(
                { success: false, error: "Unauthorized — invalid or expired request signature" },
                403,
            );
        }
    }

    // All other routes: allow (for forward compatibility)
    return next();
};
