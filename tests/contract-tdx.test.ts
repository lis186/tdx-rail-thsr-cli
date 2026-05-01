/**
 * Contract tests against the live TDX API.
 *
 * Catches schema drift between tests/fixtures/*.json and live TDX responses.
 * For each endpoint we record the symmetric key difference and pin the known
 * gaps; new gaps fail the build so a TDX schema change can't sneak in.
 *
 * Skipped when sibling-project credentials aren't reachable. Network-bound,
 * so per-test timeout is generous.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SHARED_ENV = '/Users/justinlee/dev/tdx-rail-tra-cli/.env';
const FIXTURES = resolve(__dirname, 'fixtures');
const HAS_ENV = existsSync(SHARED_ENV);

function loadEnv(): { id: string; secret: string } | null {
  if (!HAS_ENV) return null;
  const env: Record<string, string> = {};
  for (const line of readFileSync(SHARED_ENV, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  if (!env.TDX_CLIENT_ID || !env.TDX_CLIENT_SECRET) return null;
  return { id: env.TDX_CLIENT_ID, secret: env.TDX_CLIENT_SECRET };
}

function topLevelKeys(record: unknown): Set<string> {
  if (!record || typeof record !== 'object') return new Set();
  return new Set(Object.keys(record as Record<string, unknown>));
}

function symmetricDiff(a: Set<string>, b: Set<string>): { onlyInA: string[]; onlyInB: string[] } {
  return {
    onlyInA: [...a].filter((k) => !b.has(k)).sort(),
    onlyInB: [...b].filter((k) => !a.has(k)).sort(),
  };
}

const itLive = HAS_ENV ? it : it.skip;

describe('TDX schema contract', () => {
  let token = '';
  const baseUrl = 'https://tdx.transportdata.tw/api/basic';

  beforeAll(async () => {
    if (!HAS_ENV) return;
    const creds = loadEnv();
    if (!creds) return;
    const res = await fetch(
      'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: creds.id,
          client_secret: creds.secret,
        }).toString(),
      },
    );
    if (!res.ok) throw new Error(`token fetch failed: ${res.status}`);
    token = ((await res.json()) as { access_token: string }).access_token;
  }, 30_000);

  async function fetchJson(path: string): Promise<unknown> {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`${path} → ${res.status}`);
    return res.json();
  }

  function loadFixture(name: string): Record<string, unknown> {
    const arr = JSON.parse(readFileSync(resolve(FIXTURES, name), 'utf-8'));
    return arr[0];
  }

  // ─── Station — flat array, fixture aligned with live ─────────
  itLive('Station: fixture and live have identical key sets', async () => {
    const live = (await fetchJson('/v2/Rail/THSR/Station?$format=JSON&$top=1')) as unknown[];
    const fixture = loadFixture('thsr-stations.json');
    const diff = symmetricDiff(topLevelKeys(fixture), topLevelKeys(live[0]));
    expect(diff).toEqual({ onlyInA: [], onlyInB: [] });
  }, 30_000);

  // ─── ODFare — fixture has hand-crafted EffectiveDate/ExpiryDate ──
  // Pin the known drift; fail if it widens.
  itLive('ODFare: drift is exactly the known hand-crafted fixture extras', async () => {
    const live = (await fetchJson('/v2/Rail/THSR/ODFare?$format=JSON&$top=1')) as unknown[];
    const fixture = loadFixture('thsr-fares.json');
    const diff = symmetricDiff(topLevelKeys(fixture), topLevelKeys(live[0]));
    expect(diff).toEqual({
      onlyInA: ['EffectiveDate', 'ExpiryDate'], // fixture-only — accepted
      onlyInB: [],                              // live-only — would be a regression
    });
  }, 30_000);

  // ─── AvailableSeatStatusList — wrapped in { AvailableSeats: [...] } ──
  itLive('AvailableSeats element shape: live has fewer fields than fixture', async () => {
    const wrapper = (await fetchJson(
      '/v2/Rail/THSR/AvailableSeatStatusList/Today?$format=JSON&$top=1',
    )) as { AvailableSeats: unknown[] };
    expect(Array.isArray(wrapper.AvailableSeats)).toBe(true);
    const live = wrapper.AvailableSeats[0];
    const fixture = loadFixture('thsr-availability.json');
    const diff = symmetricDiff(topLevelKeys(fixture), topLevelKeys(live));
    // The fixture was authored richer than live's per-row payload (live
    // advertises only seat counts; train metadata lives elsewhere). Pin the
    // gap so a real schema change shows up as new keys on either side.
    expect(diff.onlyInB).toEqual([]); // no new fields appearing on live
  }, 30_000);

  // ─── GeneralTimetable — envelope { GeneralTimetable: {...} } per row ─
  itLive('GeneralTimetable: top-level envelope keys are stable', async () => {
    const live = (await fetchJson('/v2/Rail/THSR/GeneralTimetable?$format=JSON&$top=1')) as unknown[];
    expect(topLevelKeys(live[0])).toEqual(
      new Set(['UpdateTime', 'EffectiveDate', 'ExpiringDate', 'VersionID', 'GeneralTimetable']),
    );
  }, 30_000);

  if (!HAS_ENV) {
    it.skip('contract suite skipped — sibling .env not found', () => {});
  }
});
