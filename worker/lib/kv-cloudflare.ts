import type { KVStore } from "./kv.js";

export class CloudflareKVStore implements KVStore {
  constructor(private readonly ns: KVNamespace) {}

  async getText(key: string): Promise<string | null> {
    return this.ns.get(key, "text");
  }

  async getJSON<T>(key: string): Promise<T | null> {
    return this.ns.get<T>(key, "json");
  }

  async put(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds !== undefined) {
      await this.ns.put(key, value, { expirationTtl: ttlSeconds });
    } else {
      await this.ns.put(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    await this.ns.delete(key);
  }
}
