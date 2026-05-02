/**
 * CLI Commands Phase 3 - Driven via commander parseAsync
 * Covers: seat-availability, health
 *
 * health is special: it hits TDX API and calls process.exit().
 * We mock both the API client and the ConfigService, and intercept process.exit.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Command } from 'commander';

const healthMock = vi.hoisted(() => ({
  fn: async (): Promise<{ status: string; message: string }> => ({
    status: 'healthy',
    message: 'default',
  }),
}));

vi.mock('../src/services/api.js', () => ({
  TDXApiClient: class {
    async health() {
      return healthMock.fn();
    }
  },
}));

const FIXTURE_DATE = '2025-12-31';

function fullArgv(...args: string[]): string[] {
  return ['node', 'cli', ...args];
}

function joinOut(spy: ReturnType<typeof vi.spyOn>): string {
  return (spy.mock.calls as unknown[][]).map((c) => c.join(' ')).join('\n');
}

async function loadCommand(modulePath: string, exportName: string): Promise<Command> {
  vi.resetModules();
  const mod = await import(modulePath);
  const cmd = mod[exportName] as Command;
  cmd.exitOverride();
  for (const sub of cmd.commands) sub.exitOverride();
  return cmd;
}

describe('CLI Commands Phase 3 (parseAsync)', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  // ─── seat-availability ───────────────────────────────────────
  describe('seat-availability', () => {
    it('default action surfaces TDX-no-data message when offline', async () => {
      const cmd = await loadCommand('../src/commands/seat-availability', 'seatAvailabilityCommand');
      await cmd.parseAsync(fullArgv());
      const out = joinOut(logSpy);
      // Tests run with TDX env stripped (tests/setup.ts), so loadAvailableSeats
      // returns an empty envelope and the command renders the no-data notice.
      expect(out).toMatch(/TDX 無高鐵座位狀態公告/);
    });

    it('train subcommand reports no data when TDX is unreachable', async () => {
      const cmd = await loadCommand('../src/commands/seat-availability', 'seatAvailabilityCommand');
      await cmd.parseAsync(fullArgv('train', '0601'));
      expect(joinOut(logSpy)).toMatch(/TDX 無高鐵座位狀態公告/);
    });
  });

  // ─── news ────────────────────────────────────────────────────
  describe('news', () => {
    it('reports no data when TDX is unreachable', async () => {
      const cmd = await loadCommand('../src/commands/news', 'newsCommand');
      await cmd.parseAsync(fullArgv());
      expect(joinOut(logSpy)).toMatch(/目前沒有可顯示的高鐵消息/);
    });
  });

  // ─── health ──────────────────────────────────────────────────
  describe('health', () => {
    let exitSpy: ReturnType<typeof vi.spyOn>;
    let exitCodes: (number | undefined)[];
    let prevId: string | undefined;
    let prevSecret: string | undefined;

    beforeEach(() => {
      prevId = process.env.TDX_CLIENT_ID;
      prevSecret = process.env.TDX_CLIENT_SECRET;
      process.env.TDX_CLIENT_ID = 'test-id';
      process.env.TDX_CLIENT_SECRET = 'test-secret';
      exitCodes = [];
      // Don't throw — handleHealthCommand wraps the success path in try/catch
      // and would re-route a thrown exit(0) into the catch + exit(1).
      exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
        exitCodes.push(code);
        return undefined as never;
      }) as never);
    });

    afterEach(() => {
      exitSpy.mockRestore();
      if (prevId === undefined) delete process.env.TDX_CLIENT_ID; else process.env.TDX_CLIENT_ID = prevId;
      if (prevSecret === undefined) delete process.env.TDX_CLIENT_SECRET; else process.env.TDX_CLIENT_SECRET = prevSecret;
    });

    it('reports healthy and exits 0', async () => {
      healthMock.fn = async () => ({ status: 'healthy', message: 'TDX API 運作正常' });
      const cmd = await loadCommand('../src/commands/health', 'healthCommand');
      await cmd.parseAsync(fullArgv());
      expect(exitCodes[0]).toBe(0);
      expect(joinOut(logSpy)).toContain('TDX API 運作正常');
    });

    it('reports unhealthy and exits 1', async () => {
      healthMock.fn = async () => ({ status: 'unhealthy', message: 'API 異常' });
      const cmd = await loadCommand('../src/commands/health', 'healthCommand');
      await cmd.parseAsync(fullArgv());
      expect(exitCodes[0]).toBe(1);
      expect(joinOut(logSpy)).toContain('API 異常');
    });

    it('catches thrown errors and exits 1', async () => {
      healthMock.fn = async () => { throw new Error('network fail'); };
      const cmd = await loadCommand('../src/commands/health', 'healthCommand');
      await cmd.parseAsync(fullArgv());
      expect(exitCodes[0]).toBe(1);
      expect(joinOut(logSpy)).toContain('network fail');
    });
  });
});
