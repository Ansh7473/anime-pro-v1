/**
 * API Request Encryption / Decryption  (Server-side — Node.js)
 *
 * Mirror of the client-side apiCrypto.ts but using Node.js `crypto`.
 * Wire format (Base64):  iv(12B) || ciphertext || authTag(16B)
 */

import crypto from "node:crypto";
import { env } from "./env.js";

// ── Shared secret ───────────────────────────────────────────────────
const API_SECRET: string = env.API_SECRET;

// Cache derived key (raw 32-byte buffer)
let _derivedKey: Buffer | null = null;

function getDerivedKey(): Buffer {
    if (_derivedKey) return _derivedKey;

    const salt = `tatakai-api-salt-${API_SECRET.slice(0, 8)}`;
    _derivedKey = crypto.pbkdf2Sync(API_SECRET, salt, 100_000, 32, "sha256");
    return _derivedKey;
}

// ── Helpers ─────────────────────────────────────────────────────────

function toBase64(buf: Buffer): string {
    return buf.toString("base64");
}

function fromBase64(b64: string): Buffer {
    return Buffer.from(b64, "base64");
}

// ── Public API ──────────────────────────────────────────────────────

// ── Public API ──────────────────────────────────────────────────────

/**
 * Returns true when encryption is configured (the secret is set).
 * Note: Signature verification is disabled in development (NODE_ENV !== 'production').
 */
export function isApiCryptoEnabled(): boolean {
    // Only enable in production to avoid breaking dev/testing
    if (process.env.NODE_ENV !== 'production') return false;
    return API_SECRET.length > 0;
}

/**
 * Encrypt plaintext → Base64 string.
 */
export function encryptPayload(plaintext: string): string {
    const key = getDerivedKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag(); // 16 bytes

    const combined = Buffer.concat([iv, encrypted, authTag]);
    return toBase64(combined);
}

/**
 * Decrypt Base64 string → plaintext.
 */
export function decryptPayload(encoded: string): string {
    const key = getDerivedKey();
    const raw = fromBase64(encoded);

    const iv = raw.subarray(0, 12);
    const authTag = raw.subarray(raw.length - 16);
    const ciphertext = raw.subarray(12, raw.length - 16);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);
    return decrypted.toString("utf8");
}

/**
 * Verify the HMAC signature sent by the client.
 *
 * Header `X-Api-Signature` = Base64(HMAC-SHA256(derived-key, timestamp + ":" + path))
 * Header `X-Api-Timestamp` = milliseconds since epoch
 *
 * The derived key comes from PBKDF2(API_SECRET) — must match frontend.
 * Rejects if timestamp is older than MAX_AGE_MS (5 minutes) to prevent replay.
 */
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

export function verifyApiSignature(
    path: string,
    timestamp: string | undefined,
    signature: string | undefined,
): boolean {
    if (!API_SECRET) return true; // encryption not configured → allow all
    if (!timestamp || !signature) {
        return false;
    }

    // Replay protection
    const ts = Number(timestamp);
    if (Number.isNaN(ts) || Math.abs(Date.now() - ts) > MAX_AGE_MS) {
        return false;
    }

    // Normalize path
    const normalizedPath = path.startsWith('/') ? path : '/' + path;

    // Derive the same key as the frontend using PBKDF2
    const salt = `tatakai-api-salt-${API_SECRET.slice(0, 8)}`;
    const derivedKey = crypto.pbkdf2Sync(API_SECRET, salt, 100_000, 32, "sha256");

    // Sign using the derived key (same as frontend)
    const expected = crypto
        .createHmac("sha256", derivedKey)
        .update(`${timestamp}:${normalizedPath}`)
        .digest("base64");

    // Constant-time comparison
    try {
        const signatureBuf = Buffer.from(signature, "base64");
        const expectedBuf = Buffer.from(expected, "base64");
        return crypto.timingSafeEqual(signatureBuf, expectedBuf);
    } catch {
        return false;
    }
}

