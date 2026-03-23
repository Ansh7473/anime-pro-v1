import { env, isDev, isProd } from "./env.js";
import { pino, type LoggerOptions } from "pino";

const isServerless = 
    process.env.NETLIFY === "true" || 
    process.env.VERCEL === "1" || 
    process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||
    process.env.FUNCTIONS_EMULATOR === "true";

const loggerOptions: LoggerOptions = {
    redact: (isProd || isServerless) ? ["hostname"] : [],
    level: (isProd || isServerless) ? "info" : "debug",
    // Only use pino-pretty if we are strictly in a local dev environment and NOT serverless
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

let pinoLogger;
try {
    pinoLogger = pino(loggerOptions);
} catch (e) {
    // Fallback if transport fails
    pinoLogger = pino({ level: "info" });
    console.error("Logger initialization failed, falling back to basic pino", e);
}

export const log = pinoLogger;
