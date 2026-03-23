import { rateLimiter } from "hono-rate-limiter";
import { getConnInfo as vercelGetConnInfo } from "hono/vercel";
import { getConnInfo as nodejsGetConnInfo } from "@hono/node-server/conninfo";
import type { GetConnInfo } from "hono/conninfo";
import { DeploymentEnv, env } from "./env.js";

// Select appropriate connection info getter based on deployment environment
let getConnInfo: GetConnInfo;
switch (env.DEPLOYMENT_ENV) {
    case DeploymentEnv.VERCEL:
        getConnInfo = vercelGetConnInfo;
        break;
    default:
        getConnInfo = nodejsGetConnInfo;
}

export const ratelimit = rateLimiter({
    standardHeaders: "draft-7",
    limit: env.RATE_LIMIT_MAX_REQUESTS,
    windowMs: env.RATE_LIMIT_WINDOW_MS,

    keyGenerator(c) {
        // Prefer Client ID (CID) header for per-device rate limiting
        const cid = c.req.header("x-client-id");
        if (cid && cid.length >= 10) {
            return `cid_${cid}`;
        }

        // Fallback to IP-based identification
        try {
            const { remote } = getConnInfo(c);
            const key =
                `${String(remote.addressType)}_` +
                `${String(remote.address)}:${String(remote.port)}`;
            return key;
        } catch {
            return (
                c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
                c.req.header("x-real-ip") ||
                "unknown"
            );
        }
    },

    handler(c) {
        return c.json(
            {
                status: 429,
                message: "Too Many Requests. Please slow down! 🐌",
                retryAfter: Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000),
            },
            { status: 429 }
        );
    },
});
