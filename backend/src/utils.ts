import { log } from "./config/logger.js";
import { cache } from "./config/cache.js";
import { env } from "./config/env.js";

interface CloseableServer {
    close(callback?: (err?: Error) => void): this;
}

export const execGracefulShutdown = (server: CloseableServer) => {
    log.info("Initiating graceful shutdown...");

    server.close(async () => {
        log.info("HTTP server closed");

        // Close cache connections
        await cache.close();

        log.info("Shutdown complete");
        process.exit(0);
    });

    // Force exit after timeout
    setTimeout(() => {
        log.error("Forced shutdown after timeout");
        process.exit(1);
    }, 10000);
};

export const sanitizeInput = (input: string): string => {
    return decodeURIComponent(input || "").trim();
};

export const parsePageNumber = (page: string | undefined): number => {
    const parsed = parseInt(page || "1", 10);
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
};

/**
 * Fetch with retry logic and multi-provider scraper fallbacks
 */
export async function fetchWithRetry(url: string, options: any = {}, retries = 3) {
    const isRestricted = url.includes("desidubanime.me") || url.includes("animeya.me");

    // Scraper Providers (Chain of Responsibility)
    const providers: any[] = [];

    // 1. Add all ScraperAPI keys from comma-separated env var
    if (env.SCRAPER_API_KEY) {
        const keys = env.SCRAPER_API_KEY.split(",").map(k => k.trim()).filter(Boolean);
        keys.forEach((key, index) => {
            providers.push({
                name: keys.length > 1 ? `ScraperAPI_${index + 1}` : "ScraperAPI",
                key: key,
                getUrl: (u: string) => `https://api.scraperapi.com/?api_key=${key}&url=${encodeURIComponent(u)}`,
            });
        });
    }

    // 2. Add ZenRows
    if (env.ZENROWS_API_KEY) {
        providers.push({
            name: "ZenRows",
            key: env.ZENROWS_API_KEY,
            getUrl: (u: string) => `https://api.zenrows.com/v1/?apikey=${env.ZENROWS_API_KEY}&url=${encodeURIComponent(u)}&autoparse=true`,
        });
    }

    // Helper for a single fetch attempt
    const attemptFetch = async (targetUrl: string, providerName?: string) => {
        const res = await fetch(targetUrl, {
            ...options,
            signal: AbortSignal.timeout(providerName ? 60000 : 30000), // Longer timeout for scrapers
        });

        if (!res.ok) {
            // Treat 403 (Forbidden) and 429 (Too Many Requests) as "Provider failure" (likely out of credits or blocked)
            if (res.status === 403 || res.status === 429) {
                throw new Error(`PROVIDER_FAILURE: ${res.status}`);
            }
            // Standard retry for 5xx errors
            if (res.status >= 500) {
                throw new Error(`HTTP ${res.status}`);
            }
        }
        return res;
    };

    // Main logic:
    // 1. If not restricted, try direct fetch first
    if (!isRestricted) {
        for (let i = 0; i < retries; i++) {
            try {
                return await attemptFetch(url);
            } catch (e: any) {
                if (i === retries - 1) throw e;
                const delay = Math.pow(2, i) * 1000;
                log.warn(`Fetch failed (${url}), retrying in ${delay}ms... [${i + 1}/${retries}]`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    // 2. If restricted OR direct failed with block, try scrapers in chain
    for (const provider of providers) {
        log.info(`Using ${provider.name} for: ${url}`);
        const proxyUrl = provider.getUrl(url);

        for (let i = 0; i < retries; i++) {
            try {
                return await attemptFetch(proxyUrl, provider.name);
            } catch (e: any) {
                // If it's a provider failure (403/429), break retry loop and try NEXT provider
                if (e.message.startsWith("PROVIDER_FAILURE")) {
                    log.error(`${provider.name} failed (${e.message}), falling back to next provider...`);
                    break; 
                }
                
                // Otherwise retry this provider if it's a transient error (e.g. 5xx)
                if (i === retries - 1) {
                    log.warn(`${provider.name} max retries reached for ${url}`);
                    // If this was the last provider, we have no choice but to throw or try direct as last resort
                    continue; 
                }

                const delay = Math.pow(2, i) * 1000;
                log.warn(`${provider.name} attempt ${i + 1} failed, retrying in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    // 3. Last resort: Try direct fetch one last time (if we haven't already or if all scrapers failed)
    log.warn(`All scrapers failed or unavailable for ${url}, attempting direct fetch as last resort...`);
    return await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
}
