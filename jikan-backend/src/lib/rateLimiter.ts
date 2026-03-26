/**
 * Rate Limiter for API requests
 * Prevents overwhelming external services with too many requests
 */

interface RateLimiterConfig {
    maxRequests: number;
    windowMs: number;
}

class RateLimiter {
    private requests: number[] = [];
    private config: RateLimiterConfig;

    constructor(config: RateLimiterConfig) {
        this.config = config;
    }

    async acquire(): Promise<void> {
        const now = Date.now();

        // Remove requests outside the time window
        this.requests = this.requests.filter(
            timestamp => now - timestamp < this.config.windowMs
        );

        // If we've hit the limit, wait
        if (this.requests.length >= this.config.maxRequests) {
            const oldestRequest = this.requests[0];
            const waitTime = this.config.windowMs - (now - oldestRequest);

            console.log(`[RateLimiter] Rate limit reached. Waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));

            // After waiting, clean up old requests again
            this.requests = this.requests.filter(
                timestamp => Date.now() - timestamp < this.config.windowMs
            );
        }

        // Record this request
        this.requests.push(Date.now());
    }

    reset(): void {
        this.requests = [];
    }
}

// Create rate limiters for each provider
export const animelokLimiter = new RateLimiter({
    maxRequests: 5,
    windowMs: 10000 // 10 seconds
});

export const desidubLimiter = new RateLimiter({
    maxRequests: 3,
    windowMs: 15000 // 15 seconds
});

export const animehindidubbedLimiter = new RateLimiter({
    maxRequests: 3,
    windowMs: 15000 // 15 seconds
});

// Generic delay function for additional spacing between requests
export const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

// Retry logic with exponential backoff
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            if (attempt < maxRetries - 1) {
                const waitTime = baseDelay * Math.pow(2, attempt);
                console.log(`[Retry] Attempt ${attempt + 1} failed. Retrying in ${waitTime}ms...`);
                await delay(waitTime);
            }
        }
    }

    throw lastError;
}
