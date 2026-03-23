import { env, isDev } from "./env.js";
import { pino, type LoggerOptions } from "pino";

const loggerOptions: LoggerOptions = {
    redact: isDev ? [] : ["hostname"],
    level: isDev ? "debug" : "info",
    transport: isDev
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
