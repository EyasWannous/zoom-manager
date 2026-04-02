import NodeCache from 'node-cache';
import { injectable } from 'tsyringe';
import { IMemoryCache } from '@domain/common/interfaces/IMemoryCache';

@injectable()
export class NodeMemoryCache implements IMemoryCache {
    private cache: NodeCache;

    constructor() {
        this.cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });
    }

    get<T>(key: string): T | undefined {
        return this.cache.get<T>(key);
    }

    set<T>(key: string, value: T, ttlSeconds?: number): void {
        if (ttlSeconds !== undefined) {
            this.cache.set(key, value, ttlSeconds);
        } else {
            this.cache.set(key, value);
        }
    }

    delete(key: string): void {
        this.cache.del(key);
    }

    deletePrefix(prefix: string): void {
        const keys = this.cache.keys().filter(key => key.startsWith(prefix));
        if (keys.length > 0) {
            this.cache.del(keys);
        }
    }

    async getOrCreateAsync<T>(
        key: string,
        factory: () => Promise<T>,
        ttlSeconds?: number,
    ): Promise<T> {
        const cached = this.get<T>(key);
        if (cached !== undefined) {
            return cached;
        }

        const value = await factory();
        this.set(key, value, ttlSeconds);
        return value;
    }
}
