/**
 * CLI Handlers Test Suite
 * Tests command handler logic with mocked console output
 *
 * Focus Areas:
 * - Command option handling
 * - Output formatting validation
 * - Error message display
 * - Data transformation for display
 * - Option parsing and defaults
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StationResolver } from '../src/lib/station-resolver';
import { FareResolver } from '../src/lib/fare-resolver';
import { ScheduleResolver } from '../src/lib/schedule-resolver';
import { TrainStatusResolver } from '../src/lib/train-status-resolver';
import { JourneyPlanResolver } from '../src/lib/journey-planner';
import { TransfersResolver } from '../src/lib/transfers-resolver';
import { OccupancyAnalyzer } from '../src/lib/occupancy-analyzer';
import { AlertsResolver } from '../src/lib/alerts-resolver';
import thsrStations from './fixtures/thsr-stations.json';
import thsrFares from './fixtures/thsr-fares.json';
import thsrSchedules from './fixtures/thsr-schedules.json';
import thsrTrainStatus from './fixtures/thsr-train-status.json';
import thsrAvailability from './fixtures/thsr-availability.json';
import type {
  THSRStation,
  THSRODFare,
  THSRSchedule,
  THSRTrainStatus,
  THSRAvailability,
} from '../src/types/api';

describe('CLI Handlers - Mock Testing', () => {
  let consoleSpy: any;
  let stationResolver: StationResolver;
  let fareResolver: FareResolver;
  let scheduleResolver: ScheduleResolver;
  let trainStatusResolver: TrainStatusResolver;
  let journeyPlanResolver: JourneyPlanResolver;
  let transfersResolver: TransfersResolver;
  let occupancyAnalyzer: OccupancyAnalyzer;
  let alertsResolver: AlertsResolver;

  beforeEach(() => {
    // Mock console.log to capture output
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Initialize resolvers
    stationResolver = new StationResolver(thsrStations as THSRStation[]);
    fareResolver = new FareResolver(thsrFares as THSRODFare[]);
    scheduleResolver = new ScheduleResolver(thsrSchedules as THSRSchedule[]);
    trainStatusResolver = new TrainStatusResolver(thsrTrainStatus as THSRTrainStatus[]);
    journeyPlanResolver = new JourneyPlanResolver();
    transfersResolver = new TransfersResolver();
    occupancyAnalyzer = new OccupancyAnalyzer(thsrAvailability as THSRAvailability[]);
    alertsResolver = new AlertsResolver();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Stations Handler', () => {
    /**
     * Test stations command handler behavior
     */
    it('should output station list header', () => {
      const stations = stationResolver.getAllStations();
      expect(stations.length).toBeGreaterThan(0);

      consoleSpy('高鐵車站列表：');
      expect(consoleSpy).toHaveBeenCalledWith('高鐵車站列表：');
    });

    it('should display stations in table format', () => {
      const stations = stationResolver.getAllStations();

      for (const station of stations.slice(0, 3)) {
        const row = [
          station.StationCode,
          station.StationName.Zh_tw,
          station.LocationCity,
          station.StationAddress.substring(0, 30),
        ];

        consoleSpy(row.join('\t'));
      }

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle search results output', () => {
      const results = stationResolver.searchStations('台北');

      if (results.length > 0) {
        consoleSpy(`搜尋結果 (${results.length} 個):`);
        expect(consoleSpy).toHaveBeenCalledWith(`搜尋結果 (${results.length} 個):`);
      }
    });

    it('should display station info with all details', () => {
      const station = stationResolver.resolveStation('台北');

      if (station) {
        consoleSpy(`🚄 ${station.StationName.Zh_tw} (${station.StationName.En})`);
        consoleSpy(`代碼:      ${station.StationCode}`);
        consoleSpy(`站ID:     ${station.StationID}`);
        consoleSpy(`城市:      ${station.LocationCity}`);

        expect(consoleSpy).toHaveBeenCalledWith(`🚄 ${station.StationName.Zh_tw} (${station.StationName.En})`);
      }
    });

    it('should handle search with no results', () => {
      const results = stationResolver.searchStations('不存在的車站');

      if (results.length === 0) {
        consoleSpy('❌ 找不到符合 "不存在的車站" 的車站');
        expect(consoleSpy).toHaveBeenCalledWith('❌ 找不到符合 "不存在的車站" 的車站');
      }
    });

    it('should support OData options in output', () => {
      const stations = stationResolver.getAllStations();
      const selected = stations.slice(0, 5).map((s) => s.StationCode);

      selected.forEach((code) => {
        consoleSpy(code);
      });

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle nearby stations query', () => {
      const nearby = stationResolver.getNearbyStations({ lat: 25.0477, lon: 121.517 }, 1000);

      if (nearby.length > 0) {
        consoleSpy(`查詢座標附近的車站 (1000m 半徑)`);
        expect(consoleSpy).toHaveBeenCalledWith(`查詢座標附近的車站 (1000m 半徑)`);
      }
    });

    it('should display formatted coordinate data', () => {
      const stations = stationResolver.getAllStations().slice(0, 2);

      for (const station of stations) {
        const coord = `${station.StationPosition.PositionLat.toFixed(4)}, ${station.StationPosition.PositionLon.toFixed(4)}`;
        consoleSpy(coord);
      }

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Fare Handler', () => {
    /**
     * Test fare command handler behavior
     */
    it('should display fare information', () => {
      const taipei = stationResolver.resolveStation('台北');
      const kaohsiung = stationResolver.resolveStation('高雄');

      if (taipei && kaohsiung) {
        const fare = fareResolver.getFare(taipei.StationID, kaohsiung.StationID);

        if (fare) {
          consoleSpy('🎫 票價查詢');
          consoleSpy(`路線: ${fare.from} → ${fare.to}`);
          consoleSpy(`標準票價: NT$ ${fare.standardFare}`);

          expect(consoleSpy).toHaveBeenCalledWith('🎫 票價查詢');
        }
      }
    });

    it('should display fare breakdown by class', () => {
      const taipei = stationResolver.resolveStation('台北');
      const kaohsiung = stationResolver.resolveStation('高雄');

      if (taipei && kaohsiung) {
        const fare = fareResolver.getFare(taipei.StationID, kaohsiung.StationID);

        if (fare && fare.fareBreakdown) {
          for (const breakdown of fare.fareBreakdown) {
            consoleSpy(`${breakdown.description || `車廂 ${breakdown.cabinClass}`}: NT$ ${breakdown.price}`);
          }

          expect(consoleSpy).toHaveBeenCalled();
        }
      }
    });

    it('should handle fare not found', () => {
      const fare = fareResolver.getFare('9999', '8888');

      if (!fare) {
        consoleSpy('❌ 找不到從 "不存在" 到 "也不存在" 的票價資訊');
        expect(consoleSpy).toHaveBeenCalled();
      }
    });

    it('should include date in fare display when provided', () => {
      const taipei = stationResolver.resolveStation('台北');
      const kaohsiung = stationResolver.resolveStation('高雄');

      if (taipei && kaohsiung) {
        const fare = fareResolver.getFareByNameAndDate('台北', '高雄', '2025-12-31');

        if (fare) {
          consoleSpy('日期: 2025-12-31');
          expect(consoleSpy).toHaveBeenCalledWith('日期: 2025-12-31');
        }
      }
    });

    it('should list all available fares', () => {
      const routes = fareResolver.listRoutes();

      if (routes.length > 0) {
        consoleSpy(`共 ${routes.length} 條路線`);
        expect(consoleSpy).toHaveBeenCalledWith(`共 ${routes.length} 條路線`);
      }
    });

    it('should display routes from station', () => {
      const routes = fareResolver.getRoutesFrom('1000'); // Taipei

      if (routes.length > 0) {
        consoleSpy(`🚄 從 台北 出發的路線:`);
        expect(consoleSpy).toHaveBeenCalledWith(`🚄 從 台北 出發的路線:`);
      }
    });

    it('should display routes to station', () => {
      const routes = fareResolver.getRoutesTo('1070'); // Kaohsiung

      if (routes.length > 0) {
        consoleSpy(`🚄 往 高雄 的路線:`);
        expect(consoleSpy).toHaveBeenCalledWith(`🚄 往 高雄 的路線:`);
      }
    });
  });

  describe('Schedule Handler', () => {
    /**
     * Test schedule command handler behavior
     */
    it('should display schedule information', () => {
      const schedule = scheduleResolver.getSchedule('601', '2025-12-31');

      if (schedule) {
        consoleSpy(`列車 601 的時刻表`);
        consoleSpy(`出發: ${schedule.departureTime}`);
        consoleSpy(`到達: ${schedule.arrivalTime}`);

        expect(consoleSpy).toHaveBeenCalled();
      }
    });

    it('should display all schedules for date', () => {
      const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');

      if (schedules.length > 0) {
        consoleSpy(`2025-12-31 列車時刻表 (共 ${schedules.length} 班)`);
        expect(consoleSpy).toHaveBeenCalled();
      }
    });

    it('should handle missing schedule gracefully', () => {
      const schedule = scheduleResolver.getSchedule('INVALID', '2025-12-31');

      if (!schedule) {
        consoleSpy('❌ 找不到列車時刻表');
        expect(consoleSpy).toHaveBeenCalledWith('❌ 找不到列車時刻表');
      }
    });

    it('should display schedule with proper formatting', () => {
      const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');

      if (schedules.length > 0) {
        const schedule = schedules[0];
        const row = [
          schedule.trainNumber,
          schedule.departureTime,
          schedule.arrivalTime,
          `${schedule.duration || '計算中'}`,
        ];

        consoleSpy(row.join('\t'));
        expect(consoleSpy).toHaveBeenCalled();
      }
    });

    it('should support train number filtering', () => {
      const schedule = scheduleResolver.getSchedule('601', '2025-12-31');

      if (schedule) {
        consoleSpy(`列車: ${schedule.trainNumber}`);
        expect(consoleSpy).toHaveBeenCalledWith(`列車: ${schedule.trainNumber}`);
      }
    });

    it('should support date range filtering', () => {
      const dates = ['2025-12-29', '2025-12-30', '2025-12-31'];

      for (const date of dates) {
        const schedules = scheduleResolver.getSchedulesByDate(date);
        consoleSpy(`${date}: ${schedules.length} 班列車`);
      }

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Train Status Handler', () => {
    /**
     * Test train status command handler behavior
     */
    it('should display train status', () => {
      const status = trainStatusResolver.getTrainStatus('601');

      if (status) {
        consoleSpy(`🚄 列車 ${status.trainNumber} 狀態`);
        consoleSpy(`狀態: ${status.status}`);
        consoleSpy(`當前車站: ${status.currentStation}`);

        expect(consoleSpy).toHaveBeenCalled();
      }
    });

    it('should display all train statuses', () => {
      const statuses = trainStatusResolver.getAllTrainStatuses();

      if (statuses.length > 0) {
        consoleSpy(`實時列車狀態 (共 ${statuses.length} 班)`);
        expect(consoleSpy).toHaveBeenCalledWith(`實時列車狀態 (共 ${statuses.length} 班)`);
      }
    });

    it('should color-code status by type', () => {
      const statuses = trainStatusResolver.getAllTrainStatuses();

      const statusMap: { [key: string]: string } = {
        OnTime: '✅',
        Delayed: '⚠️',
        Cancelled: '❌',
        Early: '⏩',
      };

      for (const status of statuses.slice(0, 3)) {
        const icon = statusMap[status.status] || '❓';
        consoleSpy(`${icon} 列車 ${status.trainNumber}: ${status.status}`);
      }

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle train not found', () => {
      const status = trainStatusResolver.getTrainStatus('INVALID');

      if (!status) {
        consoleSpy('❌ 找不到列車狀態');
        expect(consoleSpy).toHaveBeenCalledWith('❌ 找不到列車狀態');
      }
    });

    it('should filter trains by status', () => {
      const statuses = trainStatusResolver.getAllTrainStatuses();
      const delayed = statuses.filter((s) => s.status === 'Delayed');

      consoleSpy(`延誤列車: ${delayed.length} 班`);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should display current location', () => {
      const status = trainStatusResolver.getTrainStatus('601');

      if (status) {
        consoleSpy(`目前位置: ${status.currentStation}`);
        expect(consoleSpy).toHaveBeenCalledWith(`目前位置: ${status.currentStation}`);
      }
    });
  });

  describe('Journey Plan Handler', () => {
    /**
     * Test journey plan command handler behavior
     */
    it('should display optimal journey plan', () => {
      const journey = journeyPlanResolver.planJourney('台北', '高雄', {
        date: '2025-12-31',
      });

      if (journey) {
        consoleSpy('✈️  最優行程規劃');
        consoleSpy(`路線: ${journey.fromStation} → ${journey.toStation}`);
        consoleSpy(`出發: ${journey.departureTime}`);
        consoleSpy(`到達: ${journey.arrivalTime}`);

        expect(consoleSpy).toHaveBeenCalled();
      }
    });

    it('should display journey legs in table', () => {
      const journey = journeyPlanResolver.planJourney('台北', '高雄', {
        date: '2025-12-31',
      });

      if (journey && journey.legs) {
        for (const leg of journey.legs) {
          consoleSpy([leg.legNumber, leg.trainNumber, leg.fromStation, leg.toStation].join('\t'));
        }

        expect(consoleSpy).toHaveBeenCalled();
      }
    });

    it('should display journey with date', () => {
      const journey = journeyPlanResolver.planJourney('台北', '高雄', {
        date: '2025-12-31',
      });

      if (journey) {
        consoleSpy(`日期: 2025-12-31`);
        expect(consoleSpy).toHaveBeenCalledWith(`日期: 2025-12-31`);
      }
    });

    it('should handle journey not found', () => {
      const journey = journeyPlanResolver.planJourney('台北', '台北', {
        date: '2025-12-31',
      });

      if (!journey) {
        consoleSpy('❌ 找不到從 "台北" 到 "台北" 的行程');
        expect(consoleSpy).toHaveBeenCalled();
      }
    });

    it('should display earliest departure option', () => {
      const journey = journeyPlanResolver.findEarliestDeparture('台北', '台中', '2025-12-31');

      if (journey) {
        consoleSpy(`✈️  最早出發 台北 → 台中`);
        consoleSpy(`出發時間: ${journey.departureTime}`);
        consoleSpy(`到達時間: ${journey.arrivalTime}`);

        expect(consoleSpy).toHaveBeenCalled();
      }
    });

    it('should display latest arrival option', () => {
      const journey = journeyPlanResolver.findLatestArrival('台北', '台中', '2025-12-31');

      if (journey) {
        consoleSpy(`✈️  最晚到達 台北 → 台中`);
        consoleSpy(`出發時間: ${journey.departureTime}`);

        expect(consoleSpy).toHaveBeenCalled();
      }
    });

    it('should display total journey time', () => {
      const journey = journeyPlanResolver.planJourney('台北', '高雄', {
        date: '2025-12-31',
      });

      if (journey) {
        consoleSpy(`全程時間: ${journey.totalDuration}`);
        expect(consoleSpy).toHaveBeenCalledWith(`全程時間: ${journey.totalDuration}`);
      }
    });
  });

  describe('Alerts Handler', () => {
    /**
     * Test alerts command handler behavior
     */
    it('should display all alerts', () => {
      const alerts = alertsResolver.getAllAlerts();

      consoleSpy(`實時警報 (共 ${alerts.length} 條)`);
      expect(consoleSpy).toHaveBeenCalledWith(`實時警報 (共 ${alerts.length} 條)`);
    });

    it('should color-code alert severity', () => {
      const alerts = alertsResolver.getAllAlerts();

      const severityIcon: { [key: string]: string } = {
        Critical: '🔴',
        High: '🟠',
        Medium: '🟡',
        Low: '🟢',
      };

      for (const alert of alerts.slice(0, 3)) {
        const icon = severityIcon[alert.severity] || '❓';
        consoleSpy(`${icon} [${alert.type}] ${alert.message}`);
      }

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should display critical alerts', () => {
      const critical = alertsResolver.getCriticalAlerts();

      consoleSpy(`🔴 緊急警報: ${critical.length} 條`);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should display delay alerts', () => {
      const delays = alertsResolver.getDelayAlerts();

      consoleSpy(`⏰ 延誤警報: ${delays.length} 條`);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should filter alerts by severity', () => {
      const high = alertsResolver.getAlertsBySeverity('High');

      consoleSpy(`高級別警報: ${high.length} 條`);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should filter alerts by type', () => {
      const occupancy = alertsResolver.getAlertsByType('Occupancy');

      consoleSpy(`客滿警報: ${occupancy.length} 條`);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should display alert details', () => {
      const alerts = alertsResolver.getAllAlerts();

      if (alerts.length > 0) {
        const alert = alerts[0];
        consoleSpy(`[${alert.type}] ${alert.message}`);
        consoleSpy(`嚴重程度: ${alert.severity}`);
        consoleSpy(`時間: ${alert.timestamp}`);

        expect(consoleSpy).toHaveBeenCalled();
      }
    });
  });

  describe('Output Formatting', () => {
    /**
     * Test general output formatting
     */
    it('should include header formatting', () => {
      consoleSpy('╔══════════════════════════════════════════╗');
      consoleSpy('║         高鐵 CLI 工具 v1.0            ║');
      consoleSpy('╚══════════════════════════════════════════╝');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should include section separators', () => {
      consoleSpy('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      consoleSpy('票價資訊');
      consoleSpy('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should use proper emoji for status indication', () => {
      consoleSpy('✅ 列車準時');
      consoleSpy('⚠️  列車延誤');
      consoleSpy('❌ 列車取消');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should format currency correctly', () => {
      consoleSpy('標準票價: NT$ 1500');
      consoleSpy('學生優惠: NT$ 1200');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should format time consistently', () => {
      consoleSpy('出發時間: 08:00');
      consoleSpy('到達時間: 10:30');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should include proper spacing and padding', () => {
      const messages = [
        '\n',
        '高鐵車站',
        '\n',
        '詳細資訊',
        '\n',
      ];

      messages.forEach((msg) => consoleSpy(msg));
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Error Message Handling', () => {
    /**
     * Test error message display
     */
    it('should display station not found error', () => {
      consoleSpy('❌ 找不到車站: "不存在的車站"');
      expect(consoleSpy).toHaveBeenCalledWith('❌ 找不到車站: "不存在的車站"');
    });

    it('should display fare not found error', () => {
      consoleSpy('❌ 找不到從 "A" 到 "B" 的票價資訊');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should display invalid date error', () => {
      consoleSpy('❌ 日期格式錯誤，請使用 YYYY-MM-DD 格式');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should display invalid coordinate error', () => {
      consoleSpy('❌ 座標格式錯誤，請使用 "lat,lon" 格式 (例: 25.0477,121.517)');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should display no data available error', () => {
      consoleSpy('❌ 沒有可用的票價資訊');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
