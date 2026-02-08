import { describe, it, expect } from "vitest";
import {
  encrypt,
  decrypt,
  hmacSign,
  hmacVerify,
  generateRandomHex,
} from "./crypto";

const TEST_SECRET = "test-secret-key-for-encryption";
const HMAC_SECRET = "test-secret-key-for-hmac";

describe("AES-256-GCM encryption", () => {
  it("encrypts and decrypts a plaintext string", async () => {
    const plaintext = "gho_abc123_github_token";
    const encrypted = await encrypt(plaintext, TEST_SECRET);
    const decrypted = await decrypt(encrypted, TEST_SECRET);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", async () => {
    const plaintext = "same-input";
    const a = await encrypt(plaintext, TEST_SECRET);
    const b = await encrypt(plaintext, TEST_SECRET);
    expect(a).not.toBe(b);
    // Both should decrypt to the same value
    expect(await decrypt(a, TEST_SECRET)).toBe(plaintext);
    expect(await decrypt(b, TEST_SECRET)).toBe(plaintext);
  });

  it("decryption fails with the wrong key", async () => {
    const encrypted = await encrypt("secret-data", TEST_SECRET);
    await expect(decrypt(encrypted, "wrong-key")).rejects.toThrow();
  });

  it("decryption fails with tampered ciphertext", async () => {
    const encrypted = await encrypt("secret-data", TEST_SECRET);
    const parts = encrypted.split(".");
    const tampered = parts[0] + "." + "A" + parts[1].slice(1);
    await expect(decrypt(tampered, TEST_SECRET)).rejects.toThrow();
  });

  it("decryption fails with tampered IV", async () => {
    const encrypted = await encrypt("secret-data", TEST_SECRET);
    const parts = encrypted.split(".");
    const tampered = "A" + parts[0].slice(1) + "." + parts[1];
    await expect(decrypt(tampered, TEST_SECRET)).rejects.toThrow();
  });

  it("decryption fails with swapped IV and ciphertext", async () => {
    const encrypted = await encrypt("secret-data", TEST_SECRET);
    const parts = encrypted.split(".");
    const swapped = parts[1] + "." + parts[0];
    await expect(decrypt(swapped, TEST_SECRET)).rejects.toThrow();
  });

  it("handles empty string", async () => {
    const encrypted = await encrypt("", TEST_SECRET);
    const decrypted = await decrypt(encrypted, TEST_SECRET);
    expect(decrypted).toBe("");
  });

  it("handles unicode content", async () => {
    const plaintext = "hello 🌍 world 日本語";
    const encrypted = await encrypt(plaintext, TEST_SECRET);
    const decrypted = await decrypt(encrypted, TEST_SECRET);
    expect(decrypted).toBe(plaintext);
  });

  it("handles long strings", async () => {
    const plaintext = "x".repeat(10_000);
    const encrypted = await encrypt(plaintext, TEST_SECRET);
    const decrypted = await decrypt(encrypted, TEST_SECRET);
    expect(decrypted).toBe(plaintext);
  });

  it("handles special characters and newlines", async () => {
    const plaintext = "line1\nline2\ttab\r\n\"quotes\" 'single' \\back\\";
    const encrypted = await encrypt(plaintext, TEST_SECRET);
    expect(await decrypt(encrypted, TEST_SECRET)).toBe(plaintext);
  });

  it("encrypted format has exactly one dot separator", async () => {
    const encrypted = await encrypt("test", TEST_SECRET);
    const dotCount = (encrypted.match(/\./g) ?? []).length;
    expect(dotCount).toBe(1);
  });

  it("rejects malformed encrypted string (no dot)", async () => {
    await expect(decrypt("nodothere", TEST_SECRET)).rejects.toThrow(
      "Invalid encrypted format"
    );
  });

  it("rejects empty encrypted string", async () => {
    await expect(decrypt("", TEST_SECRET)).rejects.toThrow(
      "Invalid encrypted format"
    );
  });

  it("rejects encrypted string with only a dot", async () => {
    await expect(decrypt(".", TEST_SECRET)).rejects.toThrow();
  });

  it("rejects truncated ciphertext", async () => {
    const encrypted = await encrypt("test", TEST_SECRET);
    const parts = encrypted.split(".");
    const truncated = parts[0] + "." + parts[1].slice(0, 4);
    await expect(decrypt(truncated, TEST_SECRET)).rejects.toThrow();
  });

  it("same key with different values produces different ciphertexts", async () => {
    const a = await encrypt("value-a", TEST_SECRET);
    const b = await encrypt("value-b", TEST_SECRET);
    expect(a).not.toBe(b);
  });

  it("short secret still works (derived via SHA-256)", async () => {
    const encrypted = await encrypt("data", "x");
    expect(await decrypt(encrypted, "x")).toBe("data");
  });

  it("long secret still works", async () => {
    const longSecret = "s".repeat(1000);
    const encrypted = await encrypt("data", longSecret);
    expect(await decrypt(encrypted, longSecret)).toBe("data");
  });
});

describe("HMAC-SHA256 signing", () => {
  it("signs and verifies a token ID", async () => {
    const tokenId = "abc123def456";
    const sig = await hmacSign(tokenId, HMAC_SECRET);
    const valid = await hmacVerify(tokenId, sig, HMAC_SECRET);
    expect(valid).toBe(true);
  });

  it("rejects tampered signature (flipped char)", async () => {
    const tokenId = "abc123def456";
    const sig = await hmacSign(tokenId, HMAC_SECRET);
    const tampered = (sig[0] === "a" ? "b" : "a") + sig.slice(1);
    expect(await hmacVerify(tokenId, tampered, HMAC_SECRET)).toBe(false);
  });

  it("rejects signature with appended data", async () => {
    const sig = await hmacSign("token", HMAC_SECRET);
    expect(await hmacVerify("token", sig + "extra", HMAC_SECRET)).toBe(false);
  });

  it("rejects truncated signature", async () => {
    const sig = await hmacSign("token", HMAC_SECRET);
    expect(await hmacVerify("token", sig.slice(0, -2), HMAC_SECRET)).toBe(
      false
    );
  });

  it("rejects wrong token ID", async () => {
    const sig = await hmacSign("original", HMAC_SECRET);
    expect(await hmacVerify("modified", sig, HMAC_SECRET)).toBe(false);
  });

  it("rejects wrong secret", async () => {
    const sig = await hmacSign("tokenId", HMAC_SECRET);
    expect(await hmacVerify("tokenId", sig, "wrong-secret")).toBe(false);
  });

  it("rejects empty signature", async () => {
    expect(await hmacVerify("tokenId", "", HMAC_SECRET)).toBe(false);
  });

  it("produces consistent signatures for the same input", async () => {
    const sig1 = await hmacSign("test", HMAC_SECRET);
    const sig2 = await hmacSign("test", HMAC_SECRET);
    expect(sig1).toBe(sig2);
  });

  it("signature is hex-encoded (64 chars for SHA-256)", async () => {
    const sig = await hmacSign("test", HMAC_SECRET);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it("different inputs produce different signatures", async () => {
    const a = await hmacSign("input-a", HMAC_SECRET);
    const b = await hmacSign("input-b", HMAC_SECRET);
    expect(a).not.toBe(b);
  });

  it("different secrets produce different signatures", async () => {
    const a = await hmacSign("token", "secret-1");
    const b = await hmacSign("token", "secret-2");
    expect(a).not.toBe(b);
  });

  it("empty token ID produces valid signature", async () => {
    const sig = await hmacSign("", HMAC_SECRET);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
    expect(await hmacVerify("", sig, HMAC_SECRET)).toBe(true);
  });
});

describe("generateRandomHex", () => {
  it("generates hex string of correct length", () => {
    expect(generateRandomHex(1)).toHaveLength(2);
    expect(generateRandomHex(16)).toHaveLength(32);
    expect(generateRandomHex(20)).toHaveLength(40);
    expect(generateRandomHex(32)).toHaveLength(64);
  });

  it("generates different values each time", () => {
    const results = new Set(Array.from({ length: 20 }, () => generateRandomHex(20)));
    expect(results.size).toBe(20);
  });

  it("only contains lowercase hex characters", () => {
    for (let i = 0; i < 10; i++) {
      const hex = generateRandomHex(32);
      expect(hex).toMatch(/^[0-9a-f]+$/);
    }
  });

  it("handles zero bytes", () => {
    expect(generateRandomHex(0)).toBe("");
  });
});
