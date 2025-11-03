// Data cache service to store and manage dashboard data
// This service provides caching functionality to avoid repeated API calls

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
}

class DataCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly STALE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

  // Store data in cache
  set<T>(key: string, data: T): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      isStale: false
    });
    console.log(`📦 Cached data for key: ${key}`, data);
  }

  // Get data from cache
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      console.log(`❌ No cached data found for key: ${key}`);
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if data is stale (older than 30 minutes)
    if (age > this.STALE_DURATION) {
      entry.isStale = true;
      console.log(`⚠️ Cached data is stale for key: ${key} (age: ${Math.round(age / 1000)}s)`);
    }

    // Check if data is expired (older than 5 minutes)
    if (age > this.CACHE_DURATION) {
      console.log(`⏰ Cached data expired for key: ${key} (age: ${Math.round(age / 1000)}s)`);
      this.cache.delete(key);
      return null;
    }

    console.log(`✅ Retrieved cached data for key: ${key} (age: ${Math.round(age / 1000)}s)`);
    return entry.data as T;
  }

  // Check if data exists and is not expired
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    const age = now - entry.timestamp;
    return age <= this.CACHE_DURATION;
  }

  // Check if data exists but is stale
  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    const age = now - entry.timestamp;
    return age > this.STALE_DURATION;
  }

  // Clear specific cache entry
  clear(key: string): void {
    this.cache.delete(key);
    console.log(`🗑️ Cleared cache for key: ${key}`);
  }

  // Clear all cache
  clearAll(): void {
    this.cache.clear();
    console.log(`🗑️ Cleared all cache`);
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[]; entries: Array<{ key: string; age: number; isStale: boolean }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Math.round((now - entry.timestamp) / 1000),
      isStale: entry.isStale
    }));

    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      entries
    };
  }

  // Force refresh data (mark as stale)
  markStale(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.isStale = true;
      console.log(`🔄 Marked data as stale for key: ${key}`);
    }
  }
}

// Create singleton instance
export const dataCache = new DataCacheService();

// Cache keys
export const CACHE_KEYS = {
  DASHBOARD: 'dashboard_data',
  PREDICTIVE_ANALYSIS: 'predictive_analysis_data',
  SUCTION_SYSTEM: 'suction_system_data',
  DASHBOARD_SSE: 'dashboard_sse_connection',
  PREDICTIVE_SSE: 'predictive_sse_connection',
  SUCTION_SSE: 'suction_sse_connection'
} as const;

export default dataCache;
