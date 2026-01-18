import { Injectable, Logger } from '@nestjs/common';
import { AutodiscoveryResult } from '../interfaces/autodiscovery.interface';

/**
 * Cache entry with TTL tracking
 */
interface CacheEntry {
  result: AutodiscoveryResult;
  expiry: number;
}

/**
 * Service for caching email autodiscovery results
 * Implements TTL-based caching with different durations for successful and failed lookups
 */
@Injectable()
export class DiscoveryCacheService {
  private readonly logger = new Logger(DiscoveryCacheService.name);

  // In-memory cache for discovery results
  private cache = new Map<string, CacheEntry>();

  // Cache TTL settings
  readonly CACHE_TTL_SUCCESS = 3600000; // 1 hour for successful lookups
  readonly CACHE_TTL_FAILURE = 900000; // 15 minutes for failed lookups

  /**
   * Get cached autodiscovery result for domain
   * @param domain Email domain to lookup
   * @returns Cached result or null if not found/expired
   */
  get(domain: string): AutodiscoveryResult | null {
    const key = this.normalizeKey(domain);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.logger.debug('Cache entry expired', { domain: key });
      return null;
    }

    this.logger.debug('Cache hit', { domain: key });
    return entry.result;
  }

  /**
   * Set cache entry with appropriate TTL based on result success
   * @param domain Email domain
   * @param result Autodiscovery result to cache
   */
  set(domain: string, result: AutodiscoveryResult): void {
    const key = this.normalizeKey(domain);
    const ttl = result.success ? this.CACHE_TTL_SUCCESS : this.CACHE_TTL_FAILURE;

    this.cache.set(key, {
      result,
      expiry: Date.now() + ttl,
    });

    this.logger.debug('Cache entry set', {
      domain: key,
      success: result.success,
      ttlMs: ttl,
    });
  }

  /**
   * Clear cache for a specific domain or all domains
   * @param domain Optional domain to clear. If not provided, clears entire cache
   */
  clear(domain?: string): void {
    if (domain) {
      const key = this.normalizeKey(domain);
      this.cache.delete(key);
      this.logger.debug('Cache entry cleared', { domain: key });
    } else {
      const size = this.cache.size;
      this.cache.clear();
      this.logger.debug('Cache cleared', { entriesRemoved: size });
    }
  }

  /**
   * Check if cache has an entry for domain (regardless of expiry)
   * @param domain Email domain to check
   * @returns True if entry exists (may still be expired)
   */
  has(domain: string): boolean {
    return this.cache.has(this.normalizeKey(domain));
  }

  /**
   * Get current cache size
   * @returns Number of cached entries
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Remove expired entries from cache
   * Useful for periodic cleanup in long-running applications
   * @returns Number of entries removed
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger.debug('Cache cleanup completed', { entriesRemoved: removed });
    }

    return removed;
  }

  /**
   * Normalize domain key for consistent cache access
   */
  private normalizeKey(domain: string): string {
    return domain.toLowerCase().trim();
  }
}
