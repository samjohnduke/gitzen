/**
 * Crypto utilities for the CMS token system.
 * Uses Web Crypto API (available in Cloudflare Workers).
 *
 * - AES-256-GCM for encrypting GitHub tokens at rest
 * - HMAC-SHA256 for signing CMS API tokens
 */

const HKDF_SALT = new TextEncoder().encode("gitzen-cms");

/** Derive a 256-bit CryptoKey from a secret string using HKDF. */
async function deriveKey(
  secret: string,
  usage: "encrypt" | "sign"
): Promise<CryptoKey> {
  const encoded = new TextEncoder().encode(secret);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoded,
    "HKDF",
    false,
    ["deriveKey"]
  );

  const info = new TextEncoder().encode(
    usage === "encrypt" ? "aes-gcm-encrypt" : "hmac-sign"
  );

  if (usage === "encrypt") {
    return crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: HKDF_SALT, info },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: HKDF_SALT, info },
    keyMaterial,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    false,
    ["sign", "verify"]
  );
}

// --- AES-256-GCM encryption ---

/** Encrypt plaintext. Returns "{iv_base64}.{ciphertext_base64}". */
export async function encrypt(
  plaintext: string,
  secret: string
): Promise<string> {
  const key = await deriveKey(secret, "encrypt");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  const ivB64 = uint8ToBase64(iv);
  const ctB64 = uint8ToBase64(new Uint8Array(ciphertext));
  return `${ivB64}.${ctB64}`;
}

/** Decrypt a value produced by encrypt(). */
export async function decrypt(
  encrypted: string,
  secret: string
): Promise<string> {
  const dotIndex = encrypted.indexOf(".");
  if (dotIndex === -1) throw new Error("Invalid encrypted format");

  const iv = base64ToUint8(encrypted.slice(0, dotIndex));
  const ciphertext = base64ToUint8(encrypted.slice(dotIndex + 1));
  const key = await deriveKey(secret, "encrypt");

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as ArrayBuffer },
    key,
    ciphertext as unknown as ArrayBuffer
  );

  return new TextDecoder().decode(decrypted);
}

// --- HMAC-SHA256 signing ---

/** Sign a token ID, returning the hex-encoded HMAC. */
export async function hmacSign(
  tokenId: string,
  secret: string
): Promise<string> {
  const key = await deriveKey(secret, "sign");
  const encoded = new TextEncoder().encode(tokenId);
  const sig = await crypto.subtle.sign("HMAC", key, encoded);
  return bufferToHex(sig);
}

/** Verify an HMAC signature (constant-time via Web Crypto). */
export async function hmacVerify(
  tokenId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const key = await deriveKey(secret, "sign");
  const encoded = new TextEncoder().encode(tokenId);
  const sigBytes = hexToBuffer(signature);
  return crypto.subtle.verify("HMAC", key, sigBytes, encoded);
}

// --- Random hex generation ---

/** Generate `byteCount` random bytes as a hex string. */
export function generateRandomHex(byteCount: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteCount));
  return bufferToHex(bytes.buffer);
}

// --- Constant-time string comparison ---

/** Constant-time string comparison using XOR to prevent timing side-channels. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// --- Helpers ---

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes.buffer;
}
