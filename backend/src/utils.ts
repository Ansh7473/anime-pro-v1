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
 * Fetch with retry logic and optional ScraperAPI support
 */
export async function fetchWithRetry(url: string, options: any = {}, retries = 3) {
    const useScraperApi = Boolean(env.SCRAPER_API_KEY) && 
        (url.includes("desidubanime.me") || url.includes("animeya.me"));

    let finalUrl = url;
    if (useScraperApi) {
        finalUrl = `https://api.scraperapi.com/?api_key=${env.SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
        log.info(`Using ScraperAPI for: ${url}`);
    }

    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(finalUrl, {
                ...options,
                signal: AbortSignal.timeout(30000),
            });

            if (!res.ok) {
                // If ScraperAPI returns a "retryable" error, we retry
                if (res.status >= 500 || res.status === 403 || res.status === 429) {
                    throw new Error(`Status ${res.status}`);
                }
            }
            return res;
        } catch (e) {
            const isLastAttempt = i === retries - 1;
            if (isLastAttempt) throw e;
            
            const delay = Math.pow(2, i) * 1000;
            log.warn(`Fetch failed (${url}), retrying in ${delay}ms... [${i + 1}/${retries}]`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw new Error("Maximum retries reached");
}
