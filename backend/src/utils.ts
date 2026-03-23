import { log } from "./config/logger.js";
import { cache } from "./config/cache.js";

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
    return isNaN(parsed) || parsed <1 ? 1 : parsed;
};
