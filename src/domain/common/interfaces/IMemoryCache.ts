export const MEMORY_CACHE_TOKEN = Symbol.for('IMemoryCache');

export interface IMemoryCache {
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T, ttlSeconds?: number): void;
    delete(key: string): void;
    deletePrefix(prefix: string): void;
    getOrCreateAsync<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T>;
}
