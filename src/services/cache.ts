/**
 * File-based TTL cache for TDX responses.
 *
 * TDX rate limits aggressively (429s on bulk probing) and most THSR data is
 * slow-moving (fares change quarterly, schedules daily, alerts every minute).
 * A small disk cache lets the CLI stay responsive without burning quota.
 *
 * Storage: ~/.cache/thsr/<sanitised-key>.json (or $XDG_CACHE_HOME/thsr/...).
 * Format: { expiresAt: epoch_ms, value: T }
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

function cacheRoot(): string {
  const xdg = process.env.XDG_CACHE_HOME;
  return xdg ? join(xdg, 'thsr') : join(homedir(), '.cache', 'thsr');
}

function sanitiseKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 200);
}

export class Cache {
  private dir: string;

  constructor(dir: string = cacheRoot()) {
    this.dir = dir;
    mkdirSync(this.dir, { recursive: true });
  }

  private fileFor(key: string): string {
    return join(this.dir, `${sanitiseKey(key)}.json`);
  }

  /**
   * Read cached value if still fresh; otherwise call fetcher, store, return.
   * `ttlMs` is the freshness window for new fetches.
   */
  async get<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const file = this.fileFor(key);
    if (existsSync(file)) {
      try {
        const raw = readFileSync(file, 'utf-8');
        const entry = JSON.parse(raw) as CacheEntry<T>;
        if (entry.expiresAt > Date.now()) return entry.value;
      } catch {
        // corrupt entry — fall through to refetch
      }
    }
    const value = await fetcher();
    const entry: CacheEntry<T> = { expiresAt: Date.now() + ttlMs, value };
    writeFileSync(file, JSON.stringify(entry), 'utf-8');
    return value;
  }

  /**
   * Force-refresh a key; ignores any cached value.
   */
  async refresh<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const value = await fetcher();
    const file = this.fileFor(key);
    const entry: CacheEntry<T> = { expiresAt: Date.now() + ttlMs, value };
    writeFileSync(file, JSON.stringify(entry), 'utf-8');
    return value;
  }

  /**
   * Drop a single cached entry. Returns true if it was present.
   */
  invalidate(key: string): boolean {
    const file = this.fileFor(key);
    if (!existsSync(file)) return false;
    try {
      unlinkSync(file);
      return true;
    } catch {
      return false;
    }
  }
}

// ─── Default TTLs (ms) ──────────────────────────────────────────
export const TTL = {
  stations: 7 * 24 * 60 * 60 * 1000, // 7 days — station list rarely changes
  fares: 24 * 60 * 60 * 1000,        // 24h — fare table changes quarterly at most
  schedule: 60 * 60 * 1000,          // 1h — daily timetable; refresh hourly
  availability: 60 * 1000,           // 1min — seat availability is dynamic
  alerts: 30 * 1000,                 // 30s — alerts are real-time
  news: 5 * 60 * 1000,               // 5min — announcements update intermittently
} as const;

let singleton: Cache | null = null;

export function defaultCache(): Cache {
  if (!singleton) singleton = new Cache();
  return singleton;
}
