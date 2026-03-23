import type { MiddlewareHandler } from "hono";
import type { ServerContext } from "../config/context.js";
import { env } from "../config/env.js";

const DEFAULT_TTL = env.CACHE_TTL_SECONDS;

// Route-specific cache duration overrides
const CACHE_DURATIONS: Record<string, number> = {
    "/home": 600,           // 10 minutes - home page changes less frequently
    "/search": 180,         // 3 minutes - search results can change
    "/episode/sources": 120, // 2 minutes - sources can change
    "/schedule": 300,       // 5 minutes - schedule
    default: DEFAULT_TTL,
};

const getCacheDuration = (path: string): number => {
    for (const [route, duration] of Object.entries(CACHE_DURATIONS)) {
        if (path.includes(route)) {
            return duration;
        }
    }
    return CACHE_DURATIONS.default;
};

export const cacheConfigSetter = (basePrefixLength: number): MiddlewareHandler<ServerContext> => {
    return async (c, next) => {
        const path = c.req.path.slice(basePrefixLength);
        const queryString = c.req.url.split("?")[1] || "";

        const cacheKey = `Tatakai:${path}${queryString ? `:${queryString}` : ""}`;
        const duration = getCacheDuration(path);

        c.set("CACHE_CONFIG", {
            key: cacheKey,
            duration,
        });

        await next();
    };
};

export const cacheControlHeaders: MiddlewareHandler = async (c, next) => {
    await next();

    // Add cache control headers for successful GET requests
    if (c.req.method === "GET" && c.res.status >= 200 && c.res.status <300) {
        c.header("Cache-Control", `public, max-age=${DEFAULT_TTL}, stale-while-revalidate=${DEFAULT_TTL * 2}`);
    }
};
