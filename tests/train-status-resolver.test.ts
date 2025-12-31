import { describe, it, expect, beforeAll } from 'vitest';
import { TrainStatusResolver } from '../src/lib/train-status-resolver';
import trainStatuses from './fixtures/thsr-train-status.json';
import type { THSRTrainStatus } from '../src/types/api';

describe('TrainStatusResolver', () => {
  let resolver: TrainStatusResolver;

  beforeAll(() => {
    resolver = new TrainStatusResolver(trainStatuses as THSRTrainStatus[]);
  });

  describe('getTrainStatus', () => {
    it('should get status for a specific train', () => {
      const status = resolver.getTrainStatus('601');
      expect(status).toBeDefined();
      expect(status?.trainNumber).toBe('601');
    });

    it('should return null for non-existent train', () => {
      const status = resolver.getTrainStatus('999');
      expect(status).toBeNull();
    });

    it('should resolve status properly', () => {
      const status = resolver.getTrainStatus('601');
      expect(status?.currentStation).toBeDefined();
      expect(status?.status).toBeDefined();
      expect(['OnTime', 'Delayed', 'Cancelled', 'NotStarted']).toContain(
        status?.status
      );
    });
  });

  describe('getAllTrainStatuses', () => {
    it('should return all train statuses', () => {
      const statuses = resolver.getAllTrainStatuses();
      expect(statuses.length).toBeGreaterThan(0);
    });

    it('should have correct status fields', () => {
      const statuses = resolver.getAllTrainStatuses();
      statuses.forEach((s) => {
        expect(s.trainNumber).toBeDefined();
        expect(s.status).toBeDefined();
        expect(s.currentStation).toBeDefined();
      });
    });
  });

  describe('getStatusesByStation', () => {
    it('should get statuses for trains at a station', () => {
      const statuses = resolver.getStatusesByStation('板橋');
      expect(statuses.length).toBeGreaterThan(0);
      expect(statuses.every((s) => s.currentStation === '板橋')).toBe(true);
    });

    it('should return empty array for non-existent station', () => {
      const statuses = resolver.getStatusesByStation('不存在');
      expect(statuses).toEqual([]);
    });

    it('should handle English station names', () => {
      const statuses = resolver.getStatusesByStation('Banqiao');
      expect(Array.isArray(statuses)).toBe(true);
    });
  });

  describe('getDelayedTrains', () => {
    it('should return delayed trains', () => {
      const delayed = resolver.getDelayedTrains();
      expect(Array.isArray(delayed)).toBe(true);
      delayed.forEach((d) => {
        expect(d.status).toBe('Delayed');
      });
    });
  });

  describe('getCancelledTrains', () => {
    it('should return cancelled trains', () => {
      const cancelled = resolver.getCancelledTrains();
      expect(Array.isArray(cancelled)).toBe(true);
      cancelled.forEach((c) => {
        expect(c.status).toBe('Cancelled');
      });
    });
  });

  describe('getTrainsWithDelayGreaterThan', () => {
    it('should filter trains by delay threshold', () => {
      const trains = resolver.getTrainsWithDelayGreaterThan(3);
      expect(Array.isArray(trains)).toBe(true);
      trains.forEach((t) => {
        expect(t.delayMinutes).toBeDefined();
        expect(t.delayMinutes! > 3).toBe(true);
      });
    });

    it('should return empty for high threshold', () => {
      const trains = resolver.getTrainsWithDelayGreaterThan(100);
      expect(trains.length).toBe(0);
    });
  });

  describe('getAllStatusesWithOData', () => {
    it('should return all statuses without options', () => {
      const statuses = resolver.getAllStatusesWithOData({});
      expect(statuses.length).toBeGreaterThan(0);
    });

    it('should apply filter option', () => {
      const statuses = resolver.getAllStatusesWithOData({
        filter: 'Direction=0',
      });
      expect(statuses.length).toBeGreaterThan(0);
    });

    it('should apply pagination', () => {
      const allStatuses = resolver.getAllStatusesWithOData({});
      const paginated = resolver.getAllStatusesWithOData({ top: 1 });
      expect(paginated.length).toBeLessThanOrEqual(1);
      expect(paginated.length).toBeLessThanOrEqual(allStatuses.length);
    });
  });
});
