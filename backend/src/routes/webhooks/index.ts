/**
 * Discord Webhook Proxy Route
 *
 * Accepts webhook payloads from the Tatakai frontend and forwards
 * them to the actual Discord webhook URLs stored in server-side
 * environment variables — keeping the URLs secret.
 */

import { Hono } from "hono";
import type { ServerContext } from "../../config/context.js";
import { env } from "../../config/env.js";
import { log } from "../../config/logger.js";

const webhookRouter = new Hono<ServerContext>();

// Map channel names → env-var webhook URLs
function getWebhookUrl(channel: string): string | undefined {
    switch (channel) {
        case "user_created":
            return env.DISCORD_WEBHOOK_USER_CREATED;
        case "error_logs":
            return env.DISCORD_WEBHOOK_ERROR_LOGS;
        case "comment":
            return env.DISCORD_WEBHOOK_COMMENT;
        case "review_popup":
            return env.DISCORD_WEBHOOK_REVIEW_POPUP;
        default:
            return undefined;
    }
}

webhookRouter.post("/discord", async (c) => {
    try {
        const body = await c.req.json<{
            channel: string;
            content?: string;
            embeds?: any[];
            username?: string;
            avatar_url?: string;
        }>();

        const { channel, content, embeds, username, avatar_url } = body;
        if (!channel) {
            return c.json({ success: false, error: "Missing channel" }, 400);
        }

        const webhookUrl = getWebhookUrl(channel);
        if (!webhookUrl) {
            // Silently succeed — webhook not configured is not an error
            log.warn(`[Discord Webhook] No URL configured for channel: ${channel}`);
            return c.json({ success: true, sent: false });
        }

        const discordPayload: Record<string, unknown> = {};
        if (content) discordPayload.content = content;
        if (embeds) discordPayload.embeds = embeds;
        if (username) discordPayload.username = username;
        if (avatar_url) discordPayload.avatar_url = avatar_url;

        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(discordPayload),
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            log.error(`[Discord Webhook] Discord responded ${res.status}: ${text}`);
            return c.json({ success: false, error: `Discord ${res.status}` }, 502);
        }

        return c.json({ success: true, sent: true });
    } catch (err: any) {
        log.error(`[Discord Webhook] Error: ${err?.message || err}`);
        return c.json({ success: false, error: "Internal error" }, 500);
    }
});

export { webhookRouter };
