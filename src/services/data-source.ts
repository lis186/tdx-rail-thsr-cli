/**
 * Data source layer — single place commands and resolvers go to fetch THSR
 * reference data. Tries the on-disk cache first, then live TDX, then falls
 * back to the bundled snapshot if neither is reachable. This keeps the CLI
 * usable without credentials or network while still preferring fresh data
 * when both are available.
 */

import { TDXApiClient } from './api.js';
import { ConfigService } from './config.js';
import { defaultCache, TTL } from './cache.js';
import type {
  THSRStation,
  THSRODFare,
  DailyTimetableEntry,
  AvailableSeatsEnvelope,
  AlertInfoRecord,
  NewsRecord,
} from '../types/api.js';

import bundledStations from '../data/stations.js';
import bundledFares from '../data/fares.js';

function clientOrNull(): TDXApiClient | null {
  try {
    const config = new ConfigService();
    return new TDXApiClient(config.getClientId(), config.getClientSecret());
  } catch {
    return null;
  }
}

async function liveOrFallback<T>(
  cacheKey: string,
  ttlMs: number,
  liveFetcher: (client: TDXApiClient) => Promise<T>,
  fallback: T,
): Promise<{ value: T; source: 'live' | 'cache' | 'fallback' }> {
  const cache = defaultCache();
  const client = clientOrNull();
  if (!client) return { value: fallback, source: 'fallback' };

  try {
    const value = await cache.get(cacheKey, ttlMs, () => liveFetcher(client));
    return { value, source: 'live' };
  } catch {
    return { value: fallback, source: 'fallback' };
  }
}

export async function loadStations(): Promise<THSRStation[]> {
  const { value } = await liveOrFallback<THSRStation[]>(
    'stations',
    TTL.stations,
    (c) => c.getStations(),
    bundledStations,
  );
  return value;
}

export async function loadFares(): Promise<THSRODFare[]> {
  const { value } = await liveOrFallback<THSRODFare[]>(
    'fares',
    TTL.fares,
    (c) => c.getFares(),
    bundledFares,
  );
  return value;
}

/**
 * Daily timetable for today. No bundled fallback — this data is date-specific
 * and a stale fixture would be misleading. Returns [] when unreachable so
 * callers can render "no data" rather than crashing.
 */
export async function loadDailyTimetable(trainNo?: string): Promise<DailyTimetableEntry[]> {
  const cache = defaultCache();
  const client = clientOrNull();
  if (!client) return [];
  const key = trainNo ? `daily-timetable-${trainNo}` : 'daily-timetable-today';
  try {
    return await cache.get(key, TTL.schedule, () =>
      trainNo ? client.getDailyTimetableByTrainNo(trainNo) : client.getDailyTimetableToday(),
    );
  } catch {
    return [];
  }
}

export async function loadAvailableSeats(): Promise<AvailableSeatsEnvelope> {
  const cache = defaultCache();
  const client = clientOrNull();
  if (!client) return { AvailableSeats: [] };
  try {
    return await cache.get('available-seats', TTL.availability, () => client.getAvailableSeats());
  } catch {
    return { AvailableSeats: [] };
  }
}

export async function loadAlerts(): Promise<AlertInfoRecord[]> {
  const cache = defaultCache();
  const client = clientOrNull();
  if (!client) return [];
  try {
    return await cache.get('alerts', TTL.alerts, () => client.getAlertInfo());
  } catch {
    return [];
  }
}

export async function loadNews(top?: number): Promise<NewsRecord[]> {
  const cache = defaultCache();
  const client = clientOrNull();
  if (!client) return [];
  const key = top ? `news-top-${top}` : 'news';
  try {
    return await cache.get(key, TTL.news, () => client.getNews(top));
  } catch {
    return [];
  }
}
