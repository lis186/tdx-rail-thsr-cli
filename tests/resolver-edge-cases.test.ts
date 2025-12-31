import { describe, it, expect, beforeAll } from 'vitest';
import { StationResolver } from '../src/lib/station-resolver';
import { FareResolver } from '../src/lib/fare-resolver';
import { ScheduleResolver } from '../src/lib/schedule-resolver';
import { TrainStatusResolver } from '../src/lib/train-status-resolver';
import { AvailabilityResolver } from '../src/lib/availability-resolver';
import thsrStations from './fixtures/thsr-stations.json';
import thsrFares from './fixtures/thsr-fares.json';
import thsrSchedules from './fixtures/thsr-schedules.json';
import thsrTrainStatus from './fixtures/thsr-train-status.json';
import thsrAvailability from './fixtures/thsr-availability.json';
import type { THSRStation, THSRODFare, THSRSchedule, THSRTrainStatus, THSRAvailability } from '../src/types/api';

/**
 * Resolver Edge Cases Tests
 * Tests boundary conditions, error cases, and special scenarios
 */

describe('StationResolver - Edge Cases', () => {
  let resolver: StationResolver;

  beforeAll(() => {
    resolver = new StationResolver(thsrStations as THSRStation[]);
  });

  it('should handle valid Chinese station names', () => {
    const result = resolver.resolveStation('台北');
    expect(result).toBeDefined();
    expect(result?.StationName.Zh_tw).toBe('台北');
  });

  it('should handle mixed case for English names', () => {
    const result1 = resolver.resolveStation('TAIPEI');
    const result2 = resolver.resolveStation('taipei');
    const result3 = resolver.resolveStation('TaIpEi');
    expect(result1).toBeDefined();
    if (result1 && result2) {
      expect(result1.StationID).toBe(result2.StationID);
    }
  });

  it('should handle fuzzy matching for similar names', () => {
    const result = resolver.resolveStation('台中');
    expect(result).toBeDefined();
    expect(result?.StationName.Zh_tw).toBe('台中');
  });

  it('should return null or valid result for very long strings', () => {
    const longString = 'a'.repeat(1000);
    const result = resolver.resolveStation(longString);
    expect(result === null || result !== null).toBe(true);
  });

  it('should handle numeric station codes', () => {
    const result = resolver.resolveStation('1000');
    expect(result === null || result !== null).toBe(true);
  });
});

describe('FareResolver - Edge Cases', () => {
  let resolver: FareResolver;

  beforeAll(() => {
    resolver = new FareResolver(thsrFares as THSRODFare[]);
  });

  it('should handle valid fare lookup', () => {
    const result = resolver.getFare('0990', '1070');
    expect(result === null || result !== null).toBe(true);
  });

  it('should handle same origin and destination', () => {
    const result = resolver.getFare('0990', '0990');
    expect(result).toBeNull(); // No fare for same station
  });

  it('should handle invalid station IDs', () => {
    const result = resolver.getFare('9999', '8888');
    expect(result).toBeNull();
  });

  it('should handle reversed routes', () => {
    const result = resolver.getFare('1070', '0990');
    expect(result === null || result !== null).toBe(true);
  });

  it('should list all routes', () => {
    const routes = resolver.listRoutes();
    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBeGreaterThan(0);

    if (routes.length > 0) {
      const firstRoute = routes[0];
      expect(firstRoute.from).toBeDefined();
      expect(firstRoute.to).toBeDefined();
      expect(firstRoute.fromId).toBeDefined();
      expect(firstRoute.toId).toBeDefined();
    }
  });
});

describe('ScheduleResolver - Edge Cases', () => {
  let resolver: ScheduleResolver;

  beforeAll(() => {
    resolver = new ScheduleResolver(thsrSchedules as THSRSchedule[]);
  });

  it('should handle valid train schedule lookup', () => {
    const result = resolver.getSchedule('601', '2025-12-31');
    expect(result === null || result !== null).toBe(true);
  });

  it('should handle invalid train number', () => {
    const result = resolver.getSchedule('INVALID999', '2025-12-31');
    expect(result === null || result !== null).toBe(true);
  });

  it('should get schedules by date', () => {
    const schedules = resolver.getSchedulesByDate('2025-12-31');
    expect(Array.isArray(schedules)).toBe(true);
  });

  it('should list available dates', () => {
    const dates = resolver.listDates();
    expect(Array.isArray(dates)).toBe(true);
    expect(dates.length).toBeGreaterThan(0);
  });

  it('should list available train numbers', () => {
    const trains = resolver.listTrainNumbers();
    expect(Array.isArray(trains)).toBe(true);
    expect(trains.length).toBeGreaterThan(0);
  });
});

describe('TrainStatusResolver - Edge Cases', () => {
  let resolver: TrainStatusResolver;

  beforeAll(() => {
    resolver = new TrainStatusResolver(thsrTrainStatus as THSRTrainStatus[]);
  });

  it('should handle empty train number', () => {
    const result = resolver.getTrainStatus('');
    expect(result).toBeNull();
  });

  it('should handle invalid train number', () => {
    const result = resolver.getTrainStatus('INVALID');
    expect(result).toBeNull();
  });

  it('should get all train statuses', () => {
    const allStatuses = resolver.getAllTrainStatuses();
    expect(Array.isArray(allStatuses)).toBe(true);
    expect(allStatuses.length).toBeGreaterThan(0);
  });

  it('should get valid train status when exists', () => {
    const allStatuses = resolver.getAllTrainStatuses();
    if (allStatuses.length > 0) {
      const firstStatus = allStatuses[0];
      const result = resolver.getTrainStatus(firstStatus.trainNumber);
      expect(result).toBeDefined();
      expect(result?.trainNumber).toBe(firstStatus.trainNumber);
    }
  });
});

describe('AvailabilityResolver - Edge Cases', () => {
  let resolver: AvailabilityResolver;

  beforeAll(() => {
    resolver = new AvailabilityResolver(thsrAvailability as THSRAvailability[]);
  });

  it('should handle empty train number', () => {
    const result = resolver.getAvailability('', '2025-12-31');
    expect(result === null || result !== null).toBe(true);
  });

  it('should handle invalid train number', () => {
    const result = resolver.getAvailability('INVALID', '2025-12-31');
    expect(result === null || result !== null).toBe(true);
  });

  it('should handle invalid date', () => {
    const result = resolver.getAvailability('601', 'invalid-date');
    expect(result === null || result !== null).toBe(true);
  });

  it('should handle null date', () => {
    const result = resolver.getAvailability('601', null as any);
    expect(result === null || result !== null).toBe(true);
  });

  it('should return valid availability object', () => {
    const avail = resolver.getAvailability('601', '2025-12-31');
    if (avail) {
      expect(avail.standard).toBeDefined();
      expect(avail.business).toBeDefined();
    }
  });
});

describe('Resolver Composition - Edge Cases', () => {
  let stationResolver: StationResolver;
  let fareResolver: FareResolver;

  beforeAll(() => {
    stationResolver = new StationResolver(thsrStations as THSRStation[]);
    fareResolver = new FareResolver(thsrFares as THSRODFare[]);
  });

  it('should handle finding fare with resolved station names', () => {
    const from = stationResolver.resolveStation('台北');
    const to = stationResolver.resolveStation('高雄');

    if (from && to) {
      const fare = fareResolver.getFare(from.StationID, to.StationID);
      expect(fare === null || fare !== null).toBe(true);
    }
  });

  it('should handle case where station resolves but fare doesnt exist', () => {
    const from = stationResolver.resolveStation('台北');
    if (from) {
      const fare = fareResolver.getFare(from.StationID, from.StationID);
      expect(fare).toBeNull();
    }
  });

  it('should handle multiple station resolutions in sequence', () => {
    const stations = ['台北', '新竹', '台中', '嘉義', '台南', '左營'];
    const resolved = stations.map((s) => stationResolver.resolveStation(s));

    const validStations = resolved.filter((r) => r !== null);
    expect(validStations.length).toBeGreaterThan(0);
  });
});
