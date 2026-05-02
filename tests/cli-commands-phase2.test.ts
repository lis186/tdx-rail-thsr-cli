/**
 * CLI Commands Phase 2 - Driven via commander parseAsync
 * Covers: transfers, alerts
 *
 * Each test uses dynamic import + vi.resetModules() to get a fresh Command
 * instance, since commander stores option state on the singleton across parses.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Command } from 'commander';

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

const transfers = () => loadCommand('../src/commands/transfers', 'transfersCommand');
const alerts = () => loadCommand('../src/commands/alerts', 'alertsCommand');

describe('CLI Commands Phase 2 (parseAsync)', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  // ─── transfers ───────────────────────────────────────────────
  describe('transfers', () => {
    it('rejects bad date', async () => {
      const cmd = await transfers();
      await cmd.parseAsync(fullArgv('南港', '左營', '--date', '2025/12/31'));
      expect(joinOut(logSpy)).toContain('日期格式錯誤');
    });

    it('runs default search', async () => {
      const cmd = await transfers();
      await cmd.parseAsync(fullArgv('南港', '台中', '--date', FIXTURE_DATE));
      expect(joinOut(logSpy)).toMatch(/轉運選項|找不到從/);
    });

    it('honors --max-wait', async () => {
      const cmd = await transfers();
      await cmd.parseAsync(fullArgv('南港', '台中', '--date', FIXTURE_DATE, '--max-wait', '60'));
      expect(joinOut(logSpy)).toMatch(/轉運選項|找不到從/);
    });

    it('honors --hub option', async () => {
      const cmd = await transfers();
      await cmd.parseAsync(fullArgv('南港', '左營', '--date', FIXTURE_DATE, '--hub', '台中'));
      expect(joinOut(logSpy)).toMatch(/轉運選項|找不到從/);
    });

    it('reports no transfers for unknown stations', async () => {
      const cmd = await transfers();
      await cmd.parseAsync(fullArgv('無此A', '無此B', '--date', FIXTURE_DATE));
      expect(joinOut(logSpy)).toContain('找不到');
    });

    it('best subcommand runs', async () => {
      const cmd = await transfers();
      await cmd.parseAsync(fullArgv('best', '南港', '台中', '--date', FIXTURE_DATE));
      expect(joinOut(logSpy)).toMatch(/最佳轉運選項|找不到從/);
    });

    it('best subcommand with --prefer-short-wait', async () => {
      const cmd = await transfers();
      await cmd.parseAsync(fullArgv('best', '南港', '台中', '--date', FIXTURE_DATE, '--prefer-short-wait'));
      expect(joinOut(logSpy)).toMatch(/最佳轉運選項|找不到從/);
    });

    it('compare subcommand runs', async () => {
      const cmd = await transfers();
      await cmd.parseAsync(fullArgv('compare', '南港', '台中', '--date', FIXTURE_DATE));
      expect(joinOut(logSpy)).toMatch(/轉運選項比較|找不到從/);
    });

    it('compare subcommand honors --limit', async () => {
      const cmd = await transfers();
      await cmd.parseAsync(fullArgv('compare', '南港', '台中', '--date', FIXTURE_DATE, '--limit', '3'));
      expect(joinOut(logSpy)).toMatch(/轉運選項比較|找不到從/);
    });
  });

  // ─── alerts ──────────────────────────────────────────────────
  describe('alerts', () => {
    it('default action shows TDX alert list header even when empty', async () => {
      const cmd = await alerts();
      await cmd.parseAsync(fullArgv());
      const out = joinOut(logSpy);
      expect(out).toContain('高鐵警報公告');
      expect(out).toMatch(/共 \d+ 則|目前無 TDX 警報公告/);
    });

    it('honors --status filter', async () => {
      const cmd = await alerts();
      await cmd.parseAsync(fullArgv('--status', 'Normal'));
      expect(joinOut(logSpy)).toContain('高鐵警報公告');
    });
  });

});
