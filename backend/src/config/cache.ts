import { Redis } from "ioredis";
import { LRUCache } from "lru-cache";
import { env } from "./env.js";
import { log } from "./logger.js";

export class TatakaCache {
    private static instance: TatakaCache | null = null;

    private redis: Redis | null = null;
    private memoryCache: LRUCache<string, string>;
    public redisEnabled: boolean = false;

    static DEFAULT_TTL_SECONDS = env.CACHE_TTL_SECONDS;

    constructor() {
        // Initialize in-memory LRU cache as fallback
        this.memoryCache = new LRUCache<string, string>({
            max: 1000, // Max 1000 items
            ttl: TatakaCache.DEFAULT_TTL_SECONDS * 1000,
            updateAgeOnGet: true,
        });

        // Try to connect to Redis if URL provided
        if (env.REDIS_URL) {
            try {
                this.redis = new Redis(env.REDIS_URL, {
                    maxRetriesPerRequest: 3,
                    retryStrategy(times) {
                        if (times > 3) return null;
                        return Math.min(times * 100, 3000);
                    },
                    lazyConnect: true,
                });

                this.redis.on("connect", () => {
                    this.redisEnabled = true;
                    log.info("Redis cache connected");
                });

                this.redis.on("error", (err) => {
                    log.warn(`Redis error: ${err.message}. Using memory cache.`);
                    this.redisEnabled = false;
                });

                this.redis.connect().catch(() => {
                    log.warn("Redis connection failed. Using memory cache.");
                });
            } catch (err) {
                log.warn("Failed to initialize Redis. Using memory cache.");
            }
        } else {
            log.info("No Redis URL provided. Using in-memory cache.");
        }
    }

    static getInstance(): TatakaCache {
        if (!TatakaCache.instance) {
            TatakaCache.instance = new TatakaCache();
        }
        return TatakaCache.instance;
    }

    async getOrSet<T>(
        dataGetter: () => Promise<T>,
        key: string,
        ttlSeconds: number = TatakaCache.DEFAULT_TTL_SECONDS
    ): Promise<T> {
        // Try to get from cache
        let cachedData: string | null = null;

        if (this.redisEnabled && this.redis) {
            try {
                cachedData = await this.redis.get(key);
            } catch {
                // Fall back to memory cache
                cachedData = this.memoryCache.get(key) || null;
            }
        } else {
            cachedData = this.memoryCache.get(key) || null;
        }

        if (cachedData) {
            try {
                return JSON.parse(cachedData) as T;
            } catch {
                // Invalid cache data, refetch
            }
        }

        // Fetch fresh data
        const data = await dataGetter();
        const serialized = JSON.stringify(data);

        // Store in cache
        if (this.redisEnabled && this.redis) {
            try {
                await this.redis.set(key, serialized, "EX", ttlSeconds);
            } catch {
                // Fall back to memory cache
                this.memoryCache.set(key, serialized, { ttl: ttlSeconds * 1000 });
            }
        } else {
            this.memoryCache.set(key, serialized, { ttl: ttlSeconds * 1000 });
        }

        return data;
    }

    async invalidate(key: string): Promise<void> {
        this.memoryCache.delete(key);
        if (this.redisEnabled && this.redis) {
            try {
                await this.redis.del(key);
            } catch {
                // Ignore Redis errors on invalidation
            }
        }
    }

    async invalidatePattern(pattern: string): Promise<void> {
        // Clear all memory cache for pattern (simple approach)
        if (pattern === "*") {
            this.memoryCache.clear();
        }

        if (this.redisEnabled && this.redis) {
            try {
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                }
            } catch {
                // Ignore Redis errors
            }
        }
    }

    async close(): Promise<void> {
        if (this.redis) {
            await this.redis.quit();
            this.redis = null;
            this.redisEnabled = false;
            log.info("Redis connection closed");
        }
        TatakaCache.instance = null;
    }
}

export const cache = TatakaCache.getInstance();
