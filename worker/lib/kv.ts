/**
 * Platform-agnostic key-value store interface.
 * Only the operations this app actually uses: get (text/json), put (with optional TTL), delete.
 */
export interface KVStore {
  getText(key: string): Promise<string | null>;
  getJSON<T>(key: string): Promise<T | null>;
  put(key: string, value: string, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}
