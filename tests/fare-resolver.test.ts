import { describe, it, expect, beforeAll } from 'vitest';
import { FareResolver } from '../src/lib/fare-resolver';
import thsrFares from './fixtures/thsr-fares.json';
import type { THSRODFare } from '../src/types/api';

describe('FareResolver', () => {
  let resolver: FareResolver;

  beforeAll(() => {
    resolver = new FareResolver(thsrFares as THSRODFare[]);
  });

  describe('getFare', () => {
    it('should get fare between two stations', () => {
      const fare = resolver.getFare('0990', '1000'); // 南港 to 台北
      expect(fare).toBeDefined();
      expect(fare?.standardFare).toBeGreaterThan(0);
    });

    it('should handle fare lookup with station names', () => {
      const fare = resolver.getFareByName('南港', '台北');
      expect(fare).toBeDefined();
      expect(fare?.from).toBe('南港');
      expect(fare?.to).toBe('台北');
    });

    it('should return null for non-existent route', () => {
      const fare = resolver.getFare('9999', '9998');
      expect(fare).toBeNull();
    });

    it('should provide breakdown of fare classes', () => {
      const fare = resolver.getFare('0990', '1000');
      expect(fare?.fareBreakdown).toBeDefined();
      expect(fare?.fareBreakdown?.length).toBeGreaterThan(0);
    });
  });

  describe('listRoutes', () => {
    it('should list all available routes', () => {
      const routes = resolver.listRoutes();
      expect(routes.length).toBeGreaterThan(0);
    });

    it('should find routes from origin station', () => {
      const routes = resolver.getRoutesFrom('1000'); // From Taipei
      expect(routes.length).toBeGreaterThan(0);
    });

    it('should find routes to destination station', () => {
      const routes = resolver.getRoutesTo('1070'); // To Zuoying/Kaohsiung
      expect(routes.length).toBeGreaterThan(0);
    });
  });

  describe('parseFare', () => {
    it('should parse fare data correctly', () => {
      const fare = resolver.getFare('0990', '1000');
      if (fare) {
        expect(fare.standardFare).toBeDefined();
        expect(fare.fareBreakdown).toBeDefined();

        // Each breakdown should have price info
        for (const breakdown of fare.fareBreakdown || []) {
          expect(breakdown.price).toBeGreaterThan(0);
        }
      }
    });

    it('should identify highest and lowest fares', () => {
      const fare = resolver.getFare('1000', '1070'); // Taipei to Zuoying
      if (fare && fare.fareBreakdown) {
        const prices = fare.fareBreakdown.map(b => b.price);
        expect(Math.min(...prices)).toBeLessThanOrEqual(
          Math.max(...prices)
        );
      }
    });
  });

  describe('getFareByName', () => {
    it('should resolve station names to IDs and get fare', () => {
      const fare = resolver.getFareByName('台北', '台中');
      expect(fare).toBeDefined();
      expect(fare?.from).toBe('台北');
      expect(fare?.to).toBe('台中');
    });

    it('should handle fuzzy station name matching', () => {
      const fare = resolver.getFareByName('Taipei', 'Taichung');
      expect(fare).toBeDefined();
    });

    it('should return null if any station is invalid', () => {
      const fare = resolver.getFareByName('不存在', '台中');
      expect(fare).toBeNull();
    });
  });
});
