import type { ErrorHandler, NotFoundHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { log } from "./logger.js";

interface ApiError extends Error {
    status?: number;
    statusCode?: number;
}

interface ErrorResponse {
    status: ContentfulStatusCode;
    message: string;
    error?: string;
    timestamp: string;
}

const createErrorResponse = (
    status: ContentfulStatusCode,
    message: string,
    error?: string
): ErrorResponse => ({
    status,
    message,
    error,
    timestamp: new Date().toISOString(),
});

export const errorHandler: ErrorHandler = (err, c) => {
    const error = err as ApiError;

    // Log the error
    log.error({
        message: error.message,
        stack: error.stack,
        path: c.req.path,
        method: c.req.method,
    });

    // Determine status code
    let status: ContentfulStatusCode = 500;
    if (error.status && error.status >= 400 && error.status <600) {
        status = error.status as ContentfulStatusCode;
    } else if (error.statusCode && error.statusCode >= 400 && error.statusCode <600) {
        status = error.statusCode as ContentfulStatusCode;
    }

    // Common error mappings
    const message =
        status === 500 ? "Internal Server Error" : error.message || "An error occurred";

    return c.json(createErrorResponse(status, message, error.name), status);
};

export const notFoundHandler: NotFoundHandler = (c) => {
    log.warn({
        message: "Route not found",
        path: c.req.path,
        method: c.req.method,
    });

    return c.json(
        createErrorResponse(404, "Not Found", `Route ${c.req.path} does not exist`),
        404
    );
};
