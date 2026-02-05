/**
 * Simple LRU (Least Recently Used) Cache for image sources
 * Maintains a maximum of 50 items
 */

interface CacheEntry {
  source: { uri: string } | null;
  timestamp: number;
}

class LRUImageCache {
  private maxSize = 50;
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];

  /**
   * Get a cached image source
   */
  get(key: string): { uri: string } | null {
    if (!this.cache.has(key)) {
      return null;
    }

    // Move to end (most recently used)
    this.updateAccessOrder(key);

    const entry = this.cache.get(key);
    return entry?.source ?? null;
  }

  /**
   * Set a cache entry
   */
  set(key: string, source: { uri: string } | null): void {
    // If already exists, update it
    if (this.cache.has(key)) {
      this.updateAccessOrder(key);
      this.cache.set(key, {
        source,
        timestamp: Date.now(),
      });
      return;
    }

    // If at max size, remove least recently used
    if (this.cache.size >= this.maxSize) {
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }

    // Add new entry
    this.accessOrder.push(key);
    this.cache.set(key, {
      source,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }
}

// Global singleton instance
export const imageCache = new LRUImageCache();
