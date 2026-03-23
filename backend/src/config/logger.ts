import { env, isDev } from "./env.js";
import { pino, type LoggerOptions } from "pino";

const isServerless = process.env.NETLIFY === "true" || process.env.VERCEL === "1";

const loggerOptions: LoggerOptions = {
    redact: (isDev && !isServerless) ? [] : ["hostname"],
    level: (isDev && !isServerless) ? "debug" : "info",
    transport: (isDev && !isServerless)
        ? {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname",
            },
        }
        : undefined,
    formatters: {
        level(label) {
            return { level: label.toUpperCase() };
        },
    },
    base: {
        env: env.NODE_ENV,
    },
};

export const log = pino(loggerOptions);
