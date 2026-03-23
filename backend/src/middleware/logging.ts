import type { MiddlewareHandler } from "hono";
import { log } from "../config/logger.js";

export const logging: MiddlewareHandler = async (c, next) => {
    const start = Date.now();
    const { method, path } = c.req;

    log.info({
        type: "request",
        method,
        path,
        query: c.req.query(),
        userAgent: c.req.header("user-agent"),
        ip: c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
            c.req.header("x-real-ip") ||
            "unknown",
    });

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    log.info({
        type: "response",
        method,
        path,
        status,
        duration: `${duration}ms`,
    });
};
