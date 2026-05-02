/**
 * CLI Commands Phase 2 - Driven via commander parseAsync
 * Covers: transfers, occupancy, alerts
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
const occupancy = () => loadCommand('../src/commands/occupancy', 'occupancyCommand');
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

  // ─── occupancy ───────────────────────────────────────────────
  describe('occupancy', () => {
    it('rejects bad date', async () => {
      const cmd = await occupancy();
      await cmd.parseAsync(fullArgv('--date', 'bad'));
      expect(joinOut(logSpy)).toContain('日期格式錯誤');
    });

    it('shows occupancy for specific train', async () => {
      const cmd = await occupancy();
      await cmd.parseAsync(fullArgv('601', '--date', FIXTURE_DATE));
      expect(joinOut(logSpy)).toMatch(/列車載客率|找不到列車/);
    });

    it('reports unknown train', async () => {
      const cmd = await occupancy();
      await cmd.parseAsync(fullArgv('99999', '--date', FIXTURE_DATE));
      expect(joinOut(logSpy)).toContain('找不到列車');
    });

    it('shows route occupancy via --route', async () => {
      const cmd = await occupancy();
      await cmd.parseAsync(fullArgv('--date', FIXTURE_DATE, '--route', '南港-左營'));
      expect(joinOut(logSpy)).toMatch(/路線載客率|找不到路線/);
    });

    it('reports unknown route', async () => {
      const cmd = await occupancy();
      await cmd.parseAsync(fullArgv('--date', FIXTURE_DATE, '--route', '無此A-無此B'));
      expect(joinOut(logSpy)).toContain('找不到路線');
    });

    it('shows all-day occupancy when no args', async () => {
      const cmd = await occupancy();
      await cmd.parseAsync(fullArgv('--date', FIXTURE_DATE));
      expect(joinOut(logSpy)).toMatch(/全天載客率/);
    });

    it('shows busy trains with --busy', async () => {
      const cmd = await occupancy();
      await cmd.parseAsync(fullArgv('--date', FIXTURE_DATE, '--busy'));
      expect(joinOut(logSpy)).toMatch(/擁擠列車/);
    });

    it('shows available trains with --available', async () => {
      const cmd = await occupancy();
      await cmd.parseAsync(fullArgv('--date', FIXTURE_DATE, '--available'));
      expect(joinOut(logSpy)).toMatch(/有位列車/);
    });

    it('recommend subcommand runs', async () => {
      const cmd = await occupancy();
      await cmd.parseAsync(fullArgv('recommend', '南港', '左營', '--date', FIXTURE_DATE));
      expect(joinOut(logSpy)).toMatch(/推薦列車|沒有找到/);
    });

    it('recommend reports no rec for unknown route', async () => {
      const cmd = await occupancy();
      await cmd.parseAsync(fullArgv('recommend', '無此A', '無此B', '--date', FIXTURE_DATE));
      expect(joinOut(logSpy)).toContain('沒有找到');
    });
  });

  // ─── alerts ──────────────────────────────────────────────────
  describe('alerts', () => {
    it('default action shows alerts list', async () => {
      const cmd = await alerts();
      await cmd.parseAsync(fullArgv());
      const out = joinOut(logSpy);
      expect(out).toContain('列車實時警報');
      expect(out).toMatch(/總警報數|沒有活動警報/);
    });

    it('honors --train filter', async () => {
      const cmd = await alerts();
      await cmd.parseAsync(fullArgv('--train', '602'));
      expect(joinOut(logSpy)).toContain('列車實時警報');
    });

    it('honors --type filter', async () => {
      const cmd = await alerts();
      await cmd.parseAsync(fullArgv('--type', 'Delay'));
      expect(joinOut(logSpy)).toContain('列車實時警報');
    });

    it('honors --severity filter', async () => {
      const cmd = await alerts();
      await cmd.parseAsync(fullArgv('--severity', 'Warning'));
      expect(joinOut(logSpy)).toContain('列車實時警報');
    });

    it('critical subcommand', async () => {
      const cmd = await alerts();
      await cmd.parseAsync(fullArgv('critical'));
      expect(joinOut(logSpy)).toContain('緊急警報');
    });

    it('delays subcommand', async () => {
      const cmd = await alerts();
      await cmd.parseAsync(fullArgv('delays'));
      expect(joinOut(logSpy)).toContain('列車延誤警報');
    });

    it('delays subcommand with --min-delay', async () => {
      const cmd = await alerts();
      await cmd.parseAsync(fullArgv('delays', '--min-delay', '60'));
      expect(joinOut(logSpy)).toContain('列車延誤警報');
    });

    it('cancellations subcommand', async () => {
      const cmd = await alerts();
      await cmd.parseAsync(fullArgv('cancellations'));
      expect(joinOut(logSpy)).toContain('列車取消警報');
    });

    it('occupancy subcommand', async () => {
      const cmd = await alerts();
      await cmd.parseAsync(fullArgv('occupancy'));
      expect(joinOut(logSpy)).toContain('列車載客率警報');
    });

    it('summary subcommand', async () => {
      const cmd = await alerts();
      await cmd.parseAsync(fullArgv('summary'));
      const out = joinOut(logSpy);
      expect(out).toContain('警報統計摘要');
      expect(out).toContain('整體統計');
      expect(out).toContain('按級別分類');
      expect(out).toContain('按類型分類');
    });
  });

});
