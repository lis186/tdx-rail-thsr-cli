/**
 * Cache unit tests.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Cache, TTL } from '../src/services/cache';

describe('Cache', () => {
  let dir: string;
  let cache: Cache;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'thsr-cache-'));
    cache = new Cache(dir);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('calls fetcher on cache miss and stores result', async () => {
    const fetcher = vi.fn(async () => ({ x: 1 }));
    const value = await cache.get('k1', 1000, fetcher);
    expect(value).toEqual({ x: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('serves cache hit without calling fetcher', async () => {
    const fetcher = vi.fn(async () => ({ x: 1 }));
    await cache.get('k2', 60_000, fetcher);
    await cache.get('k2', 60_000, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches when TTL has expired', async () => {
    const fetcher = vi.fn(async () => ({ n: Math.random() }));
    await cache.get('k3', 5, fetcher);
    await new Promise((r) => setTimeout(r, 10));
    await cache.get('k3', 5, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('refresh() always calls the fetcher', async () => {
    const fetcher = vi.fn(async () => 'hello');
    await cache.get('k4', 60_000, fetcher);
    await cache.refresh('k4', 60_000, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('invalidate() removes the entry', async () => {
    const fetcher = vi.fn(async () => ({ x: 1 }));
    await cache.get('k5', 60_000, fetcher);
    expect(cache.invalidate('k5')).toBe(true);
    await cache.get('k5', 60_000, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('falls through on corrupt cache file', async () => {
    const fetcher = vi.fn(async () => 'fresh');
    await cache.get('k6', 60_000, fetcher);
    // corrupt the file
    const file = join(dir, 'k6.json');
    expect(existsSync(file)).toBe(true);
    require('node:fs').writeFileSync(file, '{ this is not json');
    const value = await cache.get('k6', 60_000, fetcher);
    expect(value).toBe('fresh');
    expect(fetcher).toHaveBeenCalledTimes(2);
    // Verify the cache file was rewritten with valid JSON.
    expect(JSON.parse(readFileSync(file, 'utf-8')).value).toBe('fresh');
  });

  it('sanitises keys with path traversal characters', async () => {
    const fetcher = vi.fn(async () => 'ok');
    await cache.get('../../etc/passwd', 60_000, fetcher);
    // Should not have escaped the dir
    expect(existsSync(join(dir, 'etc', 'passwd.json'))).toBe(false);
    expect(existsSync(join(dir, '.._.._etc_passwd.json'))).toBe(true);
  });

  it('exposes sane TTL defaults', () => {
    expect(TTL.stations).toBeGreaterThan(TTL.fares);
    expect(TTL.fares).toBeGreaterThan(TTL.schedule);
    expect(TTL.schedule).toBeGreaterThan(TTL.news);
    expect(TTL.news).toBeGreaterThan(TTL.availability);
    expect(TTL.availability).toBeGreaterThan(TTL.alerts);
  });
});
