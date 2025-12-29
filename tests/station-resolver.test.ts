import { describe, it, expect, beforeAll } from 'vitest';
import { StationResolver } from '../src/lib/station-resolver';
import thsrStations from './fixtures/thsr-stations.json';
import type { THSRStation } from '../src/types/api';

describe('StationResolver', () => {
  let resolver: StationResolver;

  beforeAll(() => {
    resolver = new StationResolver(thsrStations as THSRStation[]);
  });

  describe('resolveStation', () => {
    it('should resolve station by exact Chinese name', () => {
      const result = resolver.resolveStation('台北');
      expect(result).toBeDefined();
      expect(result?.StationName.Zh_tw).toBe('台北');
      expect(result?.StationID).toBe('1000');
    });

    it('should resolve station by English name', () => {
      const result = resolver.resolveStation('Taipei');
      expect(result).toBeDefined();
      expect(result?.StationName.Zh_tw).toBe('台北');
    });

    it('should resolve station by station code', () => {
      const result = resolver.resolveStation('TPE');
      expect(result).toBeDefined();
      expect(result?.StationCode).toBe('TPE');
    });

    it('should resolve station by fuzzy matching', () => {
      const result = resolver.resolveStation('台中');
      expect(result).toBeDefined();
      expect(result?.StationName.Zh_tw).toBe('台中');
    });

    it('should handle partial/fuzzy names', () => {
      const result = resolver.resolveStation('左營');
      expect(result).toBeDefined();
      expect(result?.StationName.Zh_tw).toBe('左營');
    });

    it('should return null for non-existent station', () => {
      const result = resolver.resolveStation('不存在的車站');
      expect(result).toBeNull();
    });

    it('should be case-insensitive for English names', () => {
      const result = resolver.resolveStation('taipei');
      expect(result).toBeDefined();
      expect(result?.StationCode).toBe('TPE');
    });
  });

  describe('getAllStations', () => {
    it('should return all stations', () => {
      const stations = resolver.getAllStations();
      expect(stations.length).toBe(12); // THSR has 12 stations
      expect(stations.some(s => s.StationID === '1000')).toBe(true);
      expect(stations.some(s => s.StationID === '1070')).toBe(true);
    });
  });

  describe('searchStations', () => {
    it('should find stations containing search term', () => {
      const results = resolver.searchStations('台');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(s => s.StationName.Zh_tw.includes('台'))).toBe(true);
    });

    it('should find by city name', () => {
      const results = resolver.searchStations('高雄');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].LocationCity).toContain('高雄');
    });

    it('should return empty for no matches', () => {
      const results = resolver.searchStations('宇宙車站');
      expect(results.length).toBe(0);
    });
  });

  describe('getStationInfo', () => {
    it('should return normalized station info', () => {
      const info = resolver.getStationInfo('台北');
      expect(info).toBeDefined();
      expect(info?.id).toBe('1000');
      expect(info?.name).toBe('台北');
      expect(info?.code).toBe('TPE');
      expect(info?.position).toBeDefined();
      expect(info?.position?.lon).toBeCloseTo(121.516983);
    });

    it('should return null for invalid station', () => {
      const info = resolver.getStationInfo('不存在');
      expect(info).toBeNull();
    });
  });
});
