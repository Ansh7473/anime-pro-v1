import type { Context } from "hono";

export interface CacheConfig {
    key: string;
    duration: number;
}

export interface ServerContext {
    Variables: {
        CACHE_CONFIG: CacheConfig;
    };
}

export type AppContext = Context<ServerContext>;
