import { env, isDev, isProd } from "./env.js";
import { pino, type LoggerOptions } from "pino";

const isServerless = 
    process.env.NETLIFY === "true" || 
    process.env.VERCEL === "1" || 
    process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||
    process.env.FUNCTIONS_EMULATOR === "true";

console.log(`[DEBUG] Logger Init - isDev: ${isDev}, isServerless: ${isServerless}, NODE_ENV: ${process.env.NODE_ENV}`);

const loggerOptions: LoggerOptions = {
    redact: (isProd || isServerless) ? ["hostname"] : [],
    level: (isProd || isServerless) ? "info" : "debug",
    formatters: {
        level(label) {
            return { level: label.toUpperCase() };
        },
    },
    base: {
        env: env.NODE_ENV,
    },
};

// Only add transport if NOT serverless
if (isDev && !isServerless) {
    (loggerOptions as any).transport = {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
        },
    };
}

let pinoLogger;
try {
    pinoLogger = pino(loggerOptions);
} catch (e) {
    pinoLogger = pino({ level: "info" });
    console.error("Logger initialization failed", e);
}

export const log = pinoLogger;
