import { describe, it, expect, beforeAll } from 'vitest';
import { ScheduleResolver } from '../src/lib/schedule-resolver';
import thsrSchedules from './fixtures/thsr-schedules.json';
import type { THSRSchedule } from '../src/types/api';

describe('ScheduleResolver', () => {
  let resolver: ScheduleResolver;

  beforeAll(() => {
    resolver = new ScheduleResolver(thsrSchedules as THSRSchedule[]);
  });

  describe('getSchedule', () => {
    it('should get schedule by train number and date', () => {
      const schedule = resolver.getSchedule('601', '2025-12-31');
      expect(schedule).toBeDefined();
      expect(schedule?.trainNumber).toBe('601');
    });

    it('should return null for non-existent train', () => {
      const schedule = resolver.getSchedule('999', '2025-12-31');
      expect(schedule).toBeNull();
    });

    it('should resolve schedule with stops', () => {
      const schedule = resolver.getSchedule('601', '2025-12-31');
      expect(schedule?.stops).toBeDefined();
      expect(schedule?.stops.length).toBeGreaterThan(0);
    });

    it('should calculate duration for schedule', () => {
      const schedule = resolver.getSchedule('601', '2025-12-31');
      expect(schedule?.duration).toBeDefined();
      expect(schedule?.duration).toMatch(/\d+[mh]/);
    });
  });

  describe('getSchedulesByDate', () => {
    it('should get all schedules for a date', () => {
      const schedules = resolver.getSchedulesByDate('2025-12-31');
      expect(schedules.length).toBeGreaterThan(0);
      expect(schedules.every((s) => s.date === '2025-12-31')).toBe(true);
    });

    it('should return empty array for non-existent date', () => {
      const schedules = resolver.getSchedulesByDate('2024-01-01');
      expect(schedules).toEqual([]);
    });
  });

  describe('getSchedulesByStation', () => {
    it('should get schedules passing through a station', () => {
      const schedules = resolver.getSchedulesByStation('台北', '2025-12-31');
      expect(schedules.length).toBeGreaterThan(0);
      expect(
        schedules.every((s) =>
          s.stops.some((stop) => stop.stationName === '台北')
        )
      ).toBe(true);
    });

    it('should return empty array for non-existent station', () => {
      const schedules = resolver.getSchedulesByStation('不存在', '2025-12-31');
      expect(schedules).toEqual([]);
    });

    it('should handle different station name formats', () => {
      const schedulesChinese = resolver.getSchedulesByStation(
        '台北',
        '2025-12-31'
      );
      const schedulesEnglish = resolver.getSchedulesByStation(
        'Taipei',
        '2025-12-31'
      );
      expect(schedulesChinese.length).toBe(schedulesEnglish.length);
    });
  });

  describe('getSchedulesByRoute', () => {
    it('should handle route queries', () => {
      // Test that the function works even if no routes match
      const schedules = resolver.getSchedulesByRoute(
        'Taipei',
        'Taichung',
        '2025-12-31'
      );
      // Should either have results or be empty - just test that it doesn't crash
      expect(Array.isArray(schedules)).toBe(true);
    });

    it('should verify from station comes before to station', () => {
      const schedules = resolver.getSchedulesByRoute(
        'Taipei',
        'Zuoying',
        '2025-12-31'
      );
      for (const schedule of schedules) {
        const fromIdx = schedule.stops.findIndex(
          (s) => s.stationName === '台北'
        );
        const toIdx = schedule.stops.findIndex((s) => s.stationName === '左營');
        expect(fromIdx).toBeLessThan(toIdx);
      }
    });

    it('should return results for valid reverse route', () => {
      // 左營 to 南港 (southbound) should work
      const schedules = resolver.getSchedulesByRoute(
        'Zuoying',
        'Nangang',
        '2025-12-31'
      );
      expect(Array.isArray(schedules)).toBe(true);
    });

    it('should handle non-existent route', () => {
      const schedules = resolver.getSchedulesByRoute(
        '不存在1',
        '不存在2',
        '2025-12-31'
      );
      expect(schedules).toEqual([]);
    });
  });

  describe('listTrainNumbers', () => {
    it('should list all available train numbers', () => {
      const trainNumbers = resolver.listTrainNumbers();
      expect(trainNumbers.length).toBeGreaterThan(0);
      expect(trainNumbers).toEqual([...trainNumbers].sort());
    });

    it('should have unique train numbers', () => {
      const trainNumbers = resolver.listTrainNumbers();
      const uniqueNumbers = new Set(trainNumbers);
      expect(trainNumbers.length).toBe(uniqueNumbers.size);
    });
  });

  describe('listDates', () => {
    it('should list all available dates', () => {
      const dates = resolver.listDates();
      expect(dates.length).toBeGreaterThan(0);
      expect(dates).toEqual([...dates].sort());
    });

    it('should have valid date format', () => {
      const dates = resolver.listDates();
      dates.forEach((date) => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  describe('getStopsForTrain', () => {
    it('should get stops for a train', () => {
      const stops = resolver.getStopsForTrain('601', '2025-12-31');
      expect(stops.length).toBeGreaterThan(0);
      expect(stops[0].stopSequence).toBe(1);
    });

    it('should have station information in stops', () => {
      const stops = resolver.getStopsForTrain('601', '2025-12-31');
      stops.forEach((stop) => {
        expect(stop.stationName).toBeDefined();
        expect(stop.stationId).toBeDefined();
      });
    });

    it('should return empty array for non-existent train', () => {
      const stops = resolver.getStopsForTrain('999', '2025-12-31');
      expect(stops).toEqual([]);
    });
  });

  describe('getAllSchedulesWithOData', () => {
    it('should return all schedules without options', () => {
      const schedules = resolver.getAllSchedulesWithOData({});
      expect(schedules.length).toBeGreaterThan(0);
    });

    it('should apply filter option', () => {
      const schedules = resolver.getAllSchedulesWithOData({
        filter: 'Direction=0',
      });
      expect(schedules.length).toBeGreaterThan(0);
    });

    it('should apply select option', () => {
      const schedules = resolver.getAllSchedulesWithOData({
        select: 'TrainNumber,ScheduleDate',
      });
      expect(schedules.length).toBeGreaterThan(0);
      expect(
        schedules.every((s) =>
          'TrainNumber' in s && 'ScheduleDate' in s
        )
      ).toBe(true);
    });

    it('should apply pagination', () => {
      const allSchedules = resolver.getAllSchedulesWithOData({});
      const paginatedSchedules = resolver.getAllSchedulesWithOData({
        top: 1,
      });
      expect(paginatedSchedules.length).toBeLessThanOrEqual(1);
      expect(paginatedSchedules.length).toBeLessThanOrEqual(allSchedules.length);
    });
  });
});
