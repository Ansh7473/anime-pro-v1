import { cors } from "hono/cors";
import { env } from "./env.js";

const parseOrigins = (origins: string): string[] => {
    if (origins === "*") return ["*"];
    return origins.split(",").map((o) => o.trim()).filter(Boolean);
};

const allowedOrigins = parseOrigins(env.CORS_ALLOWED_ORIGINS);

// Hono's cors middleware simplifies "origin: string" vs "origin: string[]".
// If we pass "*" as a string, it allows all. 
// If we pass ["*"], it acts as literal match.
// So we should verify if allowedOrigins contains "*" and if so, pass string "*".

const finalOrigin = allowedOrigins.includes("*") ? "*" : allowedOrigins;

export const corsConfig = cors({
    origin: finalOrigin,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Client-Id", "apikey"],
    exposeHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-Cache-Status"],
    maxAge: 600, // 10 minutes
    credentials: true,
});
