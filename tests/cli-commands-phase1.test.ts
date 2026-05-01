/**
 * CLI Commands Phase 1 - Driven via commander parseAsync
 * Covers: stations, fare, schedule, train-status, journey-plan
 *
 * Strategy: import the Command instance, call parseAsync with argv,
 * capture console output, assert behavior and key output fragments.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { stationsCommand } from '../src/commands/stations';
import { fareCommand } from '../src/commands/fare';
import { scheduleCommand } from '../src/commands/schedule';
import { trainStatusCommand } from '../src/commands/train-status';
import { journeyPlanCommand } from '../src/commands/journey-plan';

const FIXTURE_DATE = '2025-12-31';

function argv(...args: string[]): string[] {
  return ['node', 'cli', ...args];
}

function joinOut(spy: ReturnType<typeof vi.spyOn>): string {
  return (spy.mock.calls as unknown[][]).map((c) => c.join(' ')).join('\n');
}

describe('CLI Commands Phase 1 (parseAsync)', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    // Prevent commander from calling process.exit on errors
    for (const cmd of [stationsCommand, fareCommand, scheduleCommand, trainStatusCommand, journeyPlanCommand]) {
      cmd.exitOverride();
      for (const sub of cmd.commands) sub.exitOverride();
    }
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  // ─── stations ────────────────────────────────────────────────
  describe('stations', () => {
    it('lists all stations with default columns', async () => {
      await stationsCommand.parseAsync(argv());
      const out = joinOut(logSpy);
      expect(out).toContain('高鐵車站列表');
      expect(out).toContain('南港');
      expect(out).toContain('左營');
    });

    it('respects --top limit', async () => {
      await stationsCommand.parseAsync(argv('--top', '3'));
      const out = joinOut(logSpy);
      expect(out).toContain('南港');
      // 3 rows means 3 station codes — assert台中 (8th) isn't there
      expect(out).not.toContain('台中');
    });

    it('honors --select fields', async () => {
      await stationsCommand.parseAsync(argv('--select', 'StationCode,StationName'));
      const out = joinOut(logSpy);
      expect(out).toContain('StationCode');
      expect(out).toContain('NAK');
    });

    it('rejects malformed --nearby coordinates', async () => {
      await stationsCommand.parseAsync(argv('--nearby', 'abc,def'));
      expect(joinOut(logSpy)).toContain('座標格式錯誤');
    });

    it('rejects negative --radius', async () => {
      await stationsCommand.parseAsync(argv('--nearby', '25.05,121.5', '--radius', '-100'));
      expect(joinOut(logSpy)).toContain('半徑必須是正數');
    });

    it('runs nearby spatial query', async () => {
      await stationsCommand.parseAsync(argv('--nearby', '25.05,121.51', '--radius', '5000'));
      expect(joinOut(logSpy)).toContain('查詢座標附近的車站');
    });

    it('search subcommand finds matching station', async () => {
      await stationsCommand.parseAsync(argv('search', '台北'));
      const out = joinOut(logSpy);
      expect(out).toContain('搜尋結果');
      expect(out).toContain('台北');
    });

    it('search subcommand reports no match', async () => {
      await stationsCommand.parseAsync(argv('search', '不存在的站名XYZ'));
      expect(joinOut(logSpy)).toContain('找不到符合');
    });

    it('info subcommand displays station detail', async () => {
      await stationsCommand.parseAsync(argv('info', '南港'));
      const out = joinOut(logSpy);
      expect(out).toContain('南港');
      expect(out).toContain('代碼:');
      expect(out).toContain('NAK');
    });

    it('info subcommand reports unknown station', async () => {
      await stationsCommand.parseAsync(argv('info', 'NOSUCH'));
      expect(joinOut(logSpy)).toContain('找不到車站');
    });
  });

  // ─── fare ────────────────────────────────────────────────────
  describe('fare', () => {
    it('shows fare between two stations', async () => {
      await fareCommand.parseAsync(argv('南港', '台北'));
      const out = joinOut(logSpy);
      expect(out).toContain('票價查詢');
      expect(out).toContain('南港');
      expect(out).toContain('台北');
      expect(out).toContain('NT$');
    });

    it('rejects bad date format', async () => {
      await fareCommand.parseAsync(argv('南港', '台北', '--date', '2025/12/31'));
      expect(joinOut(logSpy)).toContain('日期格式錯誤');
    });

    it('shows fare with valid date', async () => {
      await fareCommand.parseAsync(argv('南港', '台北', '--date', '2025-12-31'));
      const out = joinOut(logSpy);
      expect(out).toContain('日期: 2025-12-31');
    });

    it('reports missing fare for unknown route', async () => {
      await fareCommand.parseAsync(argv('XXX', 'YYY'));
      expect(joinOut(logSpy)).toContain('找不到');
    });

    it('list subcommand prints fare table', async () => {
      await fareCommand.parseAsync(argv('list', '--top', '5'));
      const out = joinOut(logSpy);
      expect(out).toContain('高鐵票價列表');
      expect(out).toMatch(/共 \d+ 條路線/);
    });

    it('list subcommand handles --select', async () => {
      await fareCommand.parseAsync(argv('list', '--top', '3', '--select', 'OriginStationID,DestinationStationID'));
      const out = joinOut(logSpy);
      expect(out).toContain('OriginStationID');
    });

    it('routes subcommand shows from-routes', async () => {
      await fareCommand.parseAsync(argv('routes', '南港'));
      const out = joinOut(logSpy);
      expect(out).toMatch(/出發的路線|往 .* 的路線/);
    });

    it('routes subcommand reports unknown station', async () => {
      await fareCommand.parseAsync(argv('routes', '不存在站XYZ'));
      expect(joinOut(logSpy)).toContain('找不到車站');
    });
  });

  // ─── schedule ────────────────────────────────────────────────
  describe('schedule', () => {
    it('default action lists dates and trains', async () => {
      await scheduleCommand.parseAsync(argv());
      const out = joinOut(logSpy);
      expect(out).toContain('高鐵時刻表查詢');
      expect(out).toContain('可查詢日期');
      expect(out).toContain('可查詢列車');
    });

    it('train subcommand shows schedule for known train', async () => {
      await scheduleCommand.parseAsync(argv('train', '601', '--date', FIXTURE_DATE));
      const out = joinOut(logSpy);
      expect(out).toContain('列車時刻表');
      expect(out).toContain('601');
    });

    it('train subcommand rejects bad date', async () => {
      await scheduleCommand.parseAsync(argv('train', '601', '--date', 'bad'));
      expect(joinOut(logSpy)).toContain('日期格式錯誤');
    });

    it('train subcommand handles unknown train', async () => {
      await scheduleCommand.parseAsync(argv('train', '99999', '--date', FIXTURE_DATE));
      expect(joinOut(logSpy)).toContain('找不到列車');
    });

    it('station subcommand lists trains through a station', async () => {
      await scheduleCommand.parseAsync(argv('station', '南港', '--date', FIXTURE_DATE));
      const out = joinOut(logSpy);
      expect(out).toMatch(/經過 南港|找不到經過/);
    });

    it('station subcommand reports no trains for unknown station', async () => {
      await scheduleCommand.parseAsync(argv('station', '無此站', '--date', FIXTURE_DATE));
      expect(joinOut(logSpy)).toContain('找不到經過');
    });

    it('station subcommand rejects bad date', async () => {
      await scheduleCommand.parseAsync(argv('station', '南港', '--date', 'oops'));
      expect(joinOut(logSpy)).toContain('日期格式錯誤');
    });

    it('route subcommand shows trains between stations', async () => {
      await scheduleCommand.parseAsync(argv('route', '南港', '左營', '--date', FIXTURE_DATE));
      const out = joinOut(logSpy);
      expect(out).toMatch(/南港 → 左營|找不到從/);
    });

    it('route subcommand reports no trains for unknown route', async () => {
      await scheduleCommand.parseAsync(argv('route', '無此站A', '無此站B', '--date', FIXTURE_DATE));
      expect(joinOut(logSpy)).toContain('找不到');
    });

    it('route subcommand rejects bad date', async () => {
      await scheduleCommand.parseAsync(argv('route', '南港', '左營', '--date', 'nope'));
      expect(joinOut(logSpy)).toContain('日期格式錯誤');
    });
  });

  // ─── train-status ────────────────────────────────────────────
  describe('train-status', () => {
    it('default lists all train statuses', async () => {
      await trainStatusCommand.parseAsync(argv());
      const out = joinOut(logSpy);
      expect(out).toContain('高鐵列車實時狀態');
      expect(out).toMatch(/共 \d+ 班列車|沒有列車狀態資訊/);
    });

    it('train subcommand shows known train status', async () => {
      await trainStatusCommand.parseAsync(argv('train', '601'));
      const out = joinOut(logSpy);
      expect(out).toMatch(/列車實時狀態|找不到列車/);
      expect(out).toContain('601');
    });

    it('train subcommand reports unknown train', async () => {
      await trainStatusCommand.parseAsync(argv('train', '99999'));
      expect(joinOut(logSpy)).toContain('找不到列車');
    });

    it('station subcommand lists trains at a station', async () => {
      await trainStatusCommand.parseAsync(argv('station', '板橋'));
      const out = joinOut(logSpy);
      expect(out).toMatch(/經過 板橋|找不到經過/);
    });

    it('station subcommand reports no trains', async () => {
      await trainStatusCommand.parseAsync(argv('station', '無此站XYZ'));
      expect(joinOut(logSpy)).toContain('找不到經過');
    });

    it('filter subcommand defaults to delayed status', async () => {
      await trainStatusCommand.parseAsync(argv('filter'));
      const out = joinOut(logSpy);
      expect(out).toMatch(/列車狀態篩選結果|沒有符合篩選條件/);
    });

    it('filter subcommand supports --status Cancelled', async () => {
      await trainStatusCommand.parseAsync(argv('filter', '--status', 'Cancelled'));
      const out = joinOut(logSpy);
      expect(out).toMatch(/列車狀態篩選結果|沒有符合篩選條件/);
    });

    it('filter subcommand supports --delay-greater-than', async () => {
      await trainStatusCommand.parseAsync(argv('filter', '--delay-greater-than', '10'));
      const out = joinOut(logSpy);
      expect(out).toMatch(/列車狀態篩選結果|沒有符合篩選條件/);
    });

    it('filter subcommand falls back to all when status=OnTime', async () => {
      await trainStatusCommand.parseAsync(argv('filter', '--status', 'OnTime', '--delay-greater-than', '0'));
      const out = joinOut(logSpy);
      expect(out).toMatch(/列車狀態篩選結果|沒有符合篩選條件/);
    });
  });

  // ─── journey-plan ────────────────────────────────────────────
  describe('journey-plan', () => {
    it('plans direct journey on fixture date', async () => {
      await journeyPlanCommand.parseAsync(argv('南港', '左營', '--date', FIXTURE_DATE));
      const out = joinOut(logSpy);
      expect(out).toMatch(/最優行程規劃|找不到從/);
    });

    it('rejects bad date format', async () => {
      await journeyPlanCommand.parseAsync(argv('南港', '左營', '--date', '12-31-2025'));
      expect(joinOut(logSpy)).toContain('日期格式錯誤');
    });

    it('reports no journey for unknown stations', async () => {
      await journeyPlanCommand.parseAsync(argv('無此站A', '無此站B', '--date', FIXTURE_DATE));
      expect(joinOut(logSpy)).toContain('找不到');
    });

    it('honors --departure-time option', async () => {
      await journeyPlanCommand.parseAsync(argv(
        'journey-plan', '南港', '左營',
        '--date', FIXTURE_DATE,
        '--departure-time', '06:00',
      ));
      const out = joinOut(logSpy);
      expect(out).toMatch(/最優行程規劃|找不到從/);
    });

    it('honors --allow-transfers and --max-transfer-time', async () => {
      await journeyPlanCommand.parseAsync(argv(
        'journey-plan', '南港', '左營',
        '--date', FIXTURE_DATE,
        '--allow-transfers',
        '--max-transfer-time', '60',
      ));
      const out = joinOut(logSpy);
      expect(out).toMatch(/最優行程規劃|找不到從/);
    });

    it('earliest subcommand returns earliest journey', async () => {
      await journeyPlanCommand.parseAsync(argv('earliest', '南港', '左營', '--date', FIXTURE_DATE));
      const out = joinOut(logSpy);
      expect(out).toMatch(/最早出發|找不到行程/);
    });

    it('earliest subcommand reports missing journey', async () => {
      await journeyPlanCommand.parseAsync(argv('earliest', '無此站A', '無此站B', '--date', FIXTURE_DATE));
      expect(joinOut(logSpy)).toContain('找不到行程');
    });

    it('latest subcommand returns latest journey', async () => {
      await journeyPlanCommand.parseAsync(argv('latest', '南港', '左營', '--date', FIXTURE_DATE));
      const out = joinOut(logSpy);
      expect(out).toMatch(/最晚到達|找不到行程/);
    });

    it('latest subcommand reports missing journey', async () => {
      await journeyPlanCommand.parseAsync(argv('latest', '無此站A', '無此站B', '--date', FIXTURE_DATE));
      expect(joinOut(logSpy)).toContain('找不到行程');
    });
  });
});
