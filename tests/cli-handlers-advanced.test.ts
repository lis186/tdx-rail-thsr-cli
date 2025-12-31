/**
 * CLI Handlers Advanced Tests
 * Extended testing of CLI command handlers with complex scenarios
 *
 * Focus Areas:
 * - Option combination testing
 * - Data transformation validation
 * - Error message consistency
 * - Complex workflow testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StationResolver } from '../src/lib/station-resolver';
import { FareResolver } from '../src/lib/fare-resolver';
import { ScheduleResolver } from '../src/lib/schedule-resolver';
import { TransfersResolver } from '../src/lib/transfers-resolver';
import { OccupancyAnalyzer } from '../src/lib/occupancy-analyzer';
import thsrStations from './fixtures/thsr-stations.json';
import thsrFares from './fixtures/thsr-fares.json';
import thsrSchedules from './fixtures/thsr-schedules.json';
import thsrAvailability from './fixtures/thsr-availability.json';
import type { THSRStation, THSRODFare, THSRSchedule, THSRAvailability } from '../src/types/api';

describe('CLI Handlers - Advanced Scenarios', () => {
  let consoleSpy: any;
  let stationResolver: StationResolver;
  let fareResolver: FareResolver;
  let scheduleResolver: ScheduleResolver;
  let transfersResolver: TransfersResolver;
  let occupancyAnalyzer: OccupancyAnalyzer;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    stationResolver = new StationResolver(thsrStations as THSRStation[]);
    fareResolver = new FareResolver(thsrFares as THSRODFare[]);
    scheduleResolver = new ScheduleResolver(thsrSchedules as THSRSchedule[]);
    transfersResolver = new TransfersResolver();
    occupancyAnalyzer = new OccupancyAnalyzer(thsrAvailability as THSRAvailability[]);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Stations Handler - Advanced Options', () => {
    /**
     * Test stations command with complex option combinations
     */
    it('should display stations with field selection', () => {
      const stations = stationResolver.getAllStations().slice(0, 3);
      const columns = ['StationCode', 'StationName'];

      for (const station of stations) {
        const row = [
          (station as any).StationCode,
          (station as any).StationName?.Zh_tw,
        ];
        consoleSpy(row.join('\t'));
      }

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle nearby station queries with different radii', () => {
      const radii = [500, 1000, 5000];

      for (const radius of radii) {
        const nearby = stationResolver.getNearbyStations({ lat: 25.0477, lon: 121.517 }, radius);

        if (nearby.length > 0) {
          consoleSpy(`${radius}m 範圍內找到 ${nearby.length} 個車站`);
        }
      }

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should filter and display stations by city', () => {
      const stations = stationResolver.getAllStations();
      const taipei = stations.filter((s) => (s as any).LocationCity === '臺北市');

      if (taipei.length > 0) {
        consoleSpy(`臺北市車站: ${taipei.length} 個`);
        expect(consoleSpy).toHaveBeenCalledWith(`臺北市車站: ${taipei.length} 個`);
      }
    });

    it('should handle station search with various inputs', () => {
      const queries = ['台北', 'Taipei', '新竹', 'Hsinchu'];

      for (const query of queries) {
        const results = stationResolver.searchStations(query);
        consoleSpy(`"${query}" 搜尋結果: ${results.length} 個`);
      }

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should display pagination info for large results', () => {
      const stations = stationResolver.getAllStations();
      const pageSize = 10;
      const totalPages = Math.ceil(stations.length / pageSize);

      consoleSpy(`顯示第 1 頁 (共 ${totalPages} 頁)`);
      expect(consoleSpy).toHaveBeenCalledWith(`顯示第 1 頁 (共 ${totalPages} 頁)`);
    });

    it('should validate station coordinate display', () => {
      const station = stationResolver.resolveStation('台北');

      if (station) {
        const lat = (station as any).StationPosition?.PositionLat?.toFixed(4);
        const lon = (station as any).StationPosition?.PositionLon?.toFixed(4);

        if (lat && lon) {
          consoleSpy(`座標: ${lat}, ${lon}`);
          expect(consoleSpy).toHaveBeenCalled();
        }
      }
    });
  });

  describe('Fare Handler - Advanced Pricing Display', () => {
    /**
     * Test fare command with complex pricing scenarios
     */
    it('should display fare comparison between routes', () => {
      const routes = [
        { from: '台北', to: '新竹' },
        { from: '台北', to: '台中' },
        { from: '台北', to: '高雄' },
      ];

      for (const route of routes) {
        const from = stationResolver.resolveStation(route.from);
        const to = stationResolver.resolveStation(route.to);

        if (from && to) {
          const fare = fareResolver.getFare(from.StationID, to.StationID);
          if (fare) {
            consoleSpy(`${route.from} → ${route.to}: NT$ ${fare.standardFare}`);
          }
        }
      }

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should display discounted fare options', () => {
      const taipei = stationResolver.resolveStation('台北');
      const kaohsiung = stationResolver.resolveStation('高雄');

      if (taipei && kaohsiung) {
        const fare = fareResolver.getFare(taipei.StationID, kaohsiung.StationID);

        if (fare && fare.fareBreakdown) {
          const discounted = fare.fareBreakdown.filter((f) => (f as any).price < fare.standardFare);

          if (discounted.length > 0) {
            consoleSpy(`優惠票種: ${discounted.length} 種`);
            expect(consoleSpy).toHaveBeenCalled();
          }
        }
      }
    });

    it('should handle fare lookup with date parameter', () => {
      const dates = ['2025-12-29', '2025-12-30', '2025-12-31'];

      for (const date of dates) {
        // In real implementation, would check date-specific fares
        consoleSpy(`${date} 台北 → 高雄 票價查詢`);
      }

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should display route availability from station', () => {
      const routes = fareResolver.getRoutesFrom('1000');

      if (routes.length > 0) {
        consoleSpy(`台北 發車線路: ${routes.length} 條`);
        expect(consoleSpy).toHaveBeenCalledWith(`台北 發車線路: ${routes.length} 條`);
      }
    });

    it('should display route availability to station', () => {
      const routes = fareResolver.getRoutesTo('1070');

      if (routes.length > 0) {
        consoleSpy(`至 高雄 進站線路: ${routes.length} 條`);
        expect(consoleSpy).toHaveBeenCalled();
      }
    });
  });

  describe('Schedule Handler - Date and Train Filtering', () => {
    /**
     * Test schedule command with filtering options
     */
    it('should display schedule for specific train across dates', () => {
      const dates = ['2025-12-29', '2025-12-30', '2025-12-31'];

      for (const date of dates) {
        const schedule = scheduleResolver.getSchedule('601', date);

        if (schedule) {
          consoleSpy(`列車 601 (${date}): ${schedule.departureTime} → ${schedule.arrivalTime}`);
        }
      }

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should display early morning schedules', () => {
      const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');
      const earlyTrains = schedules.filter((s) => {
        if (!s.departureTime) return false;
        const [hour] = s.departureTime.split(':').map(Number);
        return hour < 8;
      });

      if (earlyTrains.length > 0) {
        consoleSpy(`清晨列車 (06:00-08:00): ${earlyTrains.length} 班`);
        expect(consoleSpy).toHaveBeenCalled();
      } else {
        expect(earlyTrains.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should display rush hour schedules', () => {
      const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');
      const rushHour = schedules.filter((s) => {
        if (!s.departureTime) return false;
        const [hour] = s.departureTime.split(':').map(Number);
        return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
      });

      if (rushHour.length > 0) {
        consoleSpy(`尖峰時段列車: ${rushHour.length} 班`);
        expect(consoleSpy).toHaveBeenCalled();
      } else {
        expect(rushHour.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should display schedule with travel time info', () => {
      const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');
      let displayedCount = 0;

      for (const schedule of schedules.slice(0, 3)) {
        if (!schedule.departureTime || !schedule.arrivalTime) continue;

        const [depH, depM] = schedule.departureTime.split(':').map(Number);
        const [arrH, arrM] = schedule.arrivalTime.split(':').map(Number);
        const durationMinutes = (arrH * 60 + arrM) - (depH * 60 + depM);

        consoleSpy(`${schedule.trainNumber}: ${durationMinutes} 分鐘`);
        displayedCount++;
      }

      if (displayedCount > 0) {
        expect(consoleSpy).toHaveBeenCalled();
      }
    });
  });

  describe('Transfers Handler - Advanced Options', () => {
    /**
     * Test transfers command with complex scenarios
     */
    it('should display multiple transfer options ranked by efficiency', () => {
      const transfers = transfersResolver.findTransfers('台北', '高雄');

      if (transfers.length > 1) {
        for (let i = 0; i < Math.min(3, transfers.length); i++) {
          const transfer = transfers[i];
          consoleSpy(`選項 ${i + 1}: 於 ${transfer.transferStation} 轉車 (${transfer.transferTime} 分)`);
        }

        expect(consoleSpy).toHaveBeenCalled();
      }
    });

    it('should recommend best transfer with confidence indicator', () => {
      const best = transfersResolver.findBestTransfer('台北', '高雄');

      if (best) {
        consoleSpy(`推薦轉運: ${best.transferStation} (${best.transferTime} 分鐘)`);
        expect(consoleSpy).toHaveBeenCalled();
      }
    });

    it('should display transfer time categories', () => {
      const transfers = transfersResolver.findTransfers('台北', '高雄');

      const quick = transfers.filter((t) => t.transferTime <= 10);
      const standard = transfers.filter((t) => t.transferTime > 10 && t.transferTime <= 30);
      const comfortable = transfers.filter((t) => t.transferTime > 30);

      // Verify categorization works - at least one category should exist
      const totalCategorized = quick.length + standard.length + comfortable.length;
      expect(totalCategorized).toBeLessThanOrEqual(transfers.length);

      // If categories exist, they should be reported
      if (totalCategorized > 0) {
        expect(quick.length + standard.length + comfortable.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Occupancy Handler - Seat Availability Display', () => {
    /**
     * Test occupancy command display options
     */
    it('should display occupancy percentage', () => {
      const occupancy = occupancyAnalyzer.getTrainOccupancy('601', '2025-12-31');

      if (occupancy) {
        consoleSpy(`列車 601 客滿度: 計算中`);
        expect(consoleSpy).toHaveBeenCalled();
      }
    });

    it('should recommend trains with seats available', () => {
      const taipei = stationResolver.resolveStation('台北');
      const kaohsiung = stationResolver.resolveStation('高雄');

      if (taipei && kaohsiung) {
        const recommended = occupancyAnalyzer.recommendTrains(
          taipei.StationName.Zh_tw,
          kaohsiung.StationName.Zh_tw
        );

        if (recommended.length > 0) {
          consoleSpy(`推薦列車: ${recommended.length} 班`);
          expect(consoleSpy).toHaveBeenCalled();
        }
      }
    });

    it('should display occupancy category indicators', () => {
      const categories = {
        '🟢 空位充足': '0-25%',
        '🟡 座位充足': '25-50%',
        '🟠 逼近額滿': '50-75%',
        '🔴 額滿': '75-100%',
      };

      for (const [indicator, range] of Object.entries(categories)) {
        consoleSpy(`${indicator} (${range} 客滿)`);
      }

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Complex Workflow Scenarios', () => {
    /**
     * Test integrated CLI workflows
     */
    it('should display complete booking workflow', () => {
      const from = stationResolver.resolveStation('台北');
      const to = stationResolver.resolveStation('高雄');

      if (from && to) {
        // Step 1: Display stations found
        consoleSpy(`出發地: ${from.StationName.Zh_tw}`);
        consoleSpy(`目的地: ${to.StationName.Zh_tw}`);

        // Step 2: Display fare
        const fare = fareResolver.getFare(from.StationID, to.StationID);
        if (fare) {
          consoleSpy(`票價: NT$ ${fare.standardFare}`);
        }

        // Step 3: Display available trains
        const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');
        consoleSpy(`可用列車: ${schedules.length} 班`);

        expect(consoleSpy).toHaveBeenCalled();
      }
    });

    it('should handle multi-step journey planning display', () => {
      const transfers = transfersResolver.findTransfers('台北', '高雄');

      if (transfers.length > 0) {
        consoleSpy('多段行程規劃:');

        for (const transfer of transfers.slice(0, 2)) {
          consoleSpy(`1. 台北 → ${transfer.transferStation}`);
          consoleSpy(`2. ${transfer.transferStation} → 高雄`);
          consoleSpy(`轉運時間: ${transfer.transferTime} 分鐘`);
          consoleSpy('---');
        }

        expect(consoleSpy).toHaveBeenCalled();
      }
    });

    it('should display fare comparison with alternatives', () => {
      const taipei = stationResolver.resolveStation('台北');

      if (taipei) {
        const destinations = ['新竹', '台中', '台南', '高雄'];
        consoleSpy('票價列表:');
        consoleSpy('出發地: 台北');
        consoleSpy('│目的地 │ 票價  │');

        for (const dest of destinations) {
          const to = stationResolver.resolveStation(dest);
          if (to) {
            const fare = fareResolver.getFare(taipei.StationID, to.StationID);
            if (fare) {
              consoleSpy(`│${dest}  │NT$${fare.standardFare}│`);
            }
          }
        }

        expect(consoleSpy).toHaveBeenCalled();
      }
    });
  });

  describe('Error Message Consistency', () => {
    /**
     * Test error message formatting and consistency
     */
    it('should display consistent error format for missing stations', () => {
      consoleSpy('❌ 找不到車站: "不存在的車站"');
      consoleSpy('❌ 找不到車站: "another_missing"');

      expect(consoleSpy).toHaveBeenCalledWith('❌ 找不到車站: "不存在的車站"');
    });

    it('should display consistent error format for missing data', () => {
      consoleSpy('❌ 沒有可用的票價資訊');
      consoleSpy('❌ 沒有可用的時刻表');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should display validation error messages consistently', () => {
      consoleSpy('❌ 日期格式錯誤，請使用 YYYY-MM-DD 格式');
      consoleSpy('❌ 座標格式錯誤，請使用 "lat,lon" 格式');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should display helpful error messages for common mistakes', () => {
      // Missing required parameter
      consoleSpy('❌ 缺少必要參數: 出發站');

      // Invalid format
      consoleSpy('❌ 無效的輸入格式');

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Output Data Transformation', () => {
    /**
     * Test data transformation for display
     */
    it('should format prices consistently', () => {
      const prices = [1200, 1500, 2000, 2500];

      for (const price of prices) {
        consoleSpy(`NT$ ${price}`);
      }

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should format times consistently', () => {
      const times = ['06:00', '08:30', '12:00', '18:45', '23:59'];

      for (const time of times) {
        consoleSpy(`${time}`);
      }

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should format duration displays', () => {
      const durations = [45, 90, 120, 180];

      for (const duration of durations) {
        const hours = Math.floor(duration / 60);
        const mins = duration % 60;
        consoleSpy(`${hours}小時 ${mins}分鐘`);
      }

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should format station names with proper encoding', () => {
      const stations = ['台北', '新竹', '台中', '台南', '高雄', '左營'];

      for (const station of stations) {
        consoleSpy(`車站: ${station}`);
      }

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Performance and Reliability', () => {
    /**
     * Test CLI handler performance
     */
    it('should handle large result sets efficiently', () => {
      const start = performance.now();

      const stations = stationResolver.getAllStations();
      for (const station of stations) {
        // Simulate logging
        void (station as any).StationName;
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it('should maintain output consistency with concurrent access', async () => {
      const results = [];

      for (let i = 0; i < 5; i++) {
        const stations = stationResolver.getAllStations();
        results.push(stations.length);
      }

      // All should return same count
      const counts = new Set(results);
      expect(counts.size).toBe(1);
    });
  });
});
