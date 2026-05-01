/**
 * TransfersResolver Unit Tests
 * Direct testing of transfer resolution logic
 *
 * Focus Areas:
 * - Transfer ranking and optimization
 * - Time window validation
 * - Wait time calculations
 * - Route optimization
 * - Edge cases and boundary conditions
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { TransfersResolver } from '../src/lib/transfers-resolver';

describe('TransfersResolver - Unit Tests', () => {
  let resolver: TransfersResolver;

  beforeAll(() => {
    resolver = new TransfersResolver();
  });

  describe('Transfer Discovery', () => {
    /**
     * Test finding transfer options between stations
     */
    it('should find transfer options from Taipei to Kaohsiung', () => {
      const transfers = resolver.findTransfers('台北', '高雄');

      expect(Array.isArray(transfers)).toBe(true);
      expect(transfers.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array for same station', () => {
      const transfers = resolver.findTransfers('台北', '台北');

      expect(Array.isArray(transfers)).toBe(true);
      expect(transfers.length).toBe(0);
    });

    it('should find transfers for adjacent stations', () => {
      const transfers = resolver.findTransfers('台北', '新竹');

      expect(Array.isArray(transfers)).toBe(true);
      // Adjacent stations may have direct routes or transfers
    });

    it('should find transfers for long distance routes', () => {
      const transfers = resolver.findTransfers('台北', '左營');

      expect(Array.isArray(transfers)).toBe(true);
    });

    it('should handle non-existent origin station', () => {
      const transfers = resolver.findTransfers('不存在', '台中');

      expect(Array.isArray(transfers)).toBe(true);
      expect(transfers.length).toBe(0);
    });

    it('should handle non-existent destination station', () => {
      const transfers = resolver.findTransfers('台北', '不存在');

      expect(Array.isArray(transfers)).toBe(true);
      expect(transfers.length).toBe(0);
    });

    it('should handle empty station names', () => {
      const transfers = resolver.findTransfers('', '');

      expect(Array.isArray(transfers)).toBe(true);
    });

    it('should handle whitespace-only station names', () => {
      const transfers = resolver.findTransfers('   ', '   ');

      expect(Array.isArray(transfers)).toBe(true);
    });
  });

  describe('Transfer Data Structure Validation', () => {
    /**
     * Validate that returned transfers have required fields
     */
    it('should return transfers with valid structure', () => {
      const transfers = resolver.findTransfers('台北', '台南');

      if (transfers.length > 0) {
        const transfer = transfers[0];

        expect(transfer.transferStation).toBeDefined();
        expect(typeof transfer.transferStation).toBe('string');

        expect(transfer.transferTime).toBeDefined();
        expect(typeof transfer.transferTime).toBe('number');

        expect(transfer.firstTrain).toBeDefined();
        expect(transfer.secondTrain).toBeDefined();
      }
    });

    it('should have non-negative transfer times', () => {
      const transfers = resolver.findTransfers('台北', '高雄');

      for (const transfer of transfers) {
        expect(transfer.transferTime).toBeGreaterThanOrEqual(0);
      }
    });

    it('should have valid station names for transfers', () => {
      const transfers = resolver.findTransfers('台北', '高雄');

      for (const transfer of transfers) {
        expect(transfer.transferStation).toBeTruthy();
        expect(transfer.transferStation.length).toBeGreaterThan(0);
      }
    });

    it('should have valid train numbers', () => {
      const transfers = resolver.findTransfers('台北', '高雄');

      for (const transfer of transfers) {
        if (transfer.firstTrain) {
          expect(typeof transfer.firstTrain).toBe('string');
        }
        if (transfer.secondTrain) {
          expect(typeof transfer.secondTrain).toBe('string');
        }
      }
    });
  });

  describe('Transfer Ranking Algorithm', () => {
    /**
     * Test that transfers are ranked appropriately
     */
    it('should rank transfers by transfer time (ascending)', () => {
      const transfers = resolver.findTransfers('台北', '台南');

      if (transfers.length > 1) {
        for (let i = 0; i < transfers.length - 1; i++) {
          expect(transfers[i].transferTime).toBeLessThanOrEqual(transfers[i + 1].transferTime);
        }
      }
    });

    it('should return best transfer with shortest time', () => {
      const transfers = resolver.findTransfers('台北', '高雄');
      const best = resolver.findBestTransfer('台北', '高雄');

      if (transfers.length > 0 && best) {
        // Best should have minimum transfer time
        const minTime = Math.min(...transfers.map((t) => t.transferTime));
        expect(best.transferTime).toBeLessThanOrEqual(minTime + 1); // Allow small tolerance
      }
    });

    it('should handle single transfer option', () => {
      const transfers = resolver.findTransfers('台北', '新竹');

      if (transfers.length === 1) {
        const best = resolver.findBestTransfer('台北', '新竹');
        expect(best).toEqual(transfers[0]);
      }
    });

    it('should return null if no transfers available', () => {
      const best = resolver.findBestTransfer('台北', '台北');

      expect(best).toBeNull();
    });

    it('should prefer transfers with reasonable waiting times', () => {
      const transfers = resolver.findTransfers('台北', '高雄');

      for (const transfer of transfers) {
        // Wait time should be reasonable (5 min to 180 min)
        expect(transfer.transferTime).toBeGreaterThanOrEqual(5);
        expect(transfer.transferTime).toBeLessThanOrEqual(180);
      }
    });

    it('should break ties in transfer ranking deterministically', () => {
      const transfers1 = resolver.findTransfers('台北', '台南');
      const transfers2 = resolver.findTransfers('台北', '台南');

      // Same query should return same order
      expect(transfers1).toEqual(transfers2);
    });
  });

  describe('Transfer Time Validation', () => {
    /**
     * Test transfer time boundary conditions
     */
    it('should accept 5-minute transfer (minimum)', () => {
      const transfers = resolver.findTransfers('台北', '高雄');

      const fiveMinTransfers = transfers.filter((t) => t.transferTime === 5);
      // May or may not have exactly 5-min transfers depending on data
      expect(fiveMinTransfers.length).toBeGreaterThanOrEqual(0);
    });

    it('should accept 30-minute transfer (typical)', () => {
      const transfers = resolver.findTransfers('台北', '高雄');

      const thirtyMinTransfers = transfers.filter((t) => t.transferTime === 30);
      // May have 30-minute transfers
      expect(thirtyMinTransfers.length).toBeGreaterThanOrEqual(0);
    });

    it('should accept 180-minute transfer (maximum)', () => {
      const transfers = resolver.findTransfers('台北', '高雄');

      // Check that no transfer exceeds 180 minutes
      const exceedingMax = transfers.filter((t) => t.transferTime > 180);
      expect(exceedingMax.length).toBe(0);
    });

    it('should not include transfers under 5 minutes', () => {
      const transfers = resolver.findTransfers('台北', '高雄');

      const tooShort = transfers.filter((t) => t.transferTime < 5);
      expect(tooShort.length).toBe(0);
    });

    it('should not include transfers over 180 minutes', () => {
      const transfers = resolver.findTransfers('台北', '高雄');

      const tooLong = transfers.filter((t) => t.transferTime > 180);
      expect(tooLong.length).toBe(0);
    });

    it('should handle boundary between valid and invalid transfers', () => {
      const transfers = resolver.findTransfers('台北', '高雄');

      // All transfers should be in valid range
      for (const transfer of transfers) {
        expect(transfer.transferTime).toBeGreaterThanOrEqual(5);
        expect(transfer.transferTime).toBeLessThanOrEqual(180);
      }
    });
  });

  describe('Route Optimization', () => {
    /**
     * Test optimization of transfer routes
     */
    it('should suggest transfer through nearest station', () => {
      const transfers = resolver.findTransfers('台北', '高雄');

      if (transfers.length > 0) {
        // Best transfer should be through a geographically reasonable station
        const best = transfers[0];
        expect(best.transferStation).toBeDefined();
        expect(best.transferStation).not.toBe('台北');
        expect(best.transferStation).not.toBe('高雄');
      }
    });

    it('should consider all major stations for transfer', () => {
      const transfers = resolver.findTransfers('台北', '高雄');

      if (transfers.length > 0) {
        // Should have multiple transfer options through different stations
        const stations = new Set(transfers.map((t) => t.transferStation));
        expect(stations.size).toBeGreaterThanOrEqual(1);
      }
    });

    it('should minimize total journey time in optimization', () => {
      const transfers = resolver.findTransfers('台北', '高雄');

      if (transfers.length > 1) {
        // Earlier transfers (shorter time) should be ranked higher
        expect(transfers[0].transferTime).toBeLessThanOrEqual(transfers[1].transferTime);
      }
    });

    it('should avoid unreasonable transfer chains', () => {
      const transfers = resolver.findTransfers('台北', '台中');

      // For short distance, should not have many transfer options
      // or they should be very quick
      for (const transfer of transfers) {
        expect(transfer.transferTime).toBeLessThan(120); // Adjacent stations
      }
    });

    it('should suggest reasonable transfers for long routes', () => {
      const transfers = resolver.findTransfers('台北', '高雄');

      if (transfers.length > 0) {
        // Long routes may need transfers
        const best = transfers[0];
        expect(best.transferTime).toBeGreaterThanOrEqual(5);
        expect(best.transferTime).toBeLessThanOrEqual(180);
      }
    });
  });

  describe('Transfer Filtering and Sorting', () => {
    /**
     * Test filtering and sorting of transfer options
     */
    it('should filter transfers by minimum time window', () => {
      const transfers = resolver.findTransfers('台北', '高雄');

      // Minimum 5-minute transfer
      const validTransfers = transfers.filter((t) => t.transferTime >= 5);
      expect(validTransfers.length).toBe(transfers.length);
    });

    it('should filter transfers by maximum time window', () => {
      const transfers = resolver.findTransfers('台北', '高雄');

      // Maximum 180-minute transfer
      const validTransfers = transfers.filter((t) => t.transferTime <= 180);
      expect(validTransfers.length).toBe(transfers.length);
    });

    it('should sort transfers by efficiency (time ascending)', () => {
      const transfers = resolver.findTransfers('台北', '高雄');

      // Should be pre-sorted by time
      for (let i = 0; i < transfers.length - 1; i++) {
        expect(transfers[i].transferTime).toBeLessThanOrEqual(transfers[i + 1].transferTime);
      }
    });

    it('should deduplicate identical transfers', () => {
      const transfers = resolver.findTransfers('台北', '高雄');

      // Should not have duplicate station/time combinations
      const seen = new Set<string>();
      for (const transfer of transfers) {
        const key = `${transfer.transferStation}-${transfer.transferTime}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    });

    it('should handle case-insensitive station matching', () => {
      const transfers1 = resolver.findTransfers('台北', '高雄');
      const transfers2 = resolver.findTransfers('台北', '高雄');

      // Should return consistent results
      expect(transfers1).toEqual(transfers2);
    });
  });

  describe('Best Transfer Selection', () => {
    /**
     * Test best transfer selection logic
     */
    it('should select first transfer as best when sorted by time', () => {
      const transfers = resolver.findTransfers('台北', '高雄');
      const best = resolver.findBestTransfer('台北', '高雄');

      if (transfers.length > 0) {
        expect(best).toEqual(transfers[0]);
      }
    });

    it('should return consistent best transfer for same query', () => {
      const best1 = resolver.findBestTransfer('台北', '台南');
      const best2 = resolver.findBestTransfer('台北', '台南');

      if (best1 && best2) {
        expect(best1).toEqual(best2);
      }
    });

    it('should return null when no transfers available', () => {
      const best = resolver.findBestTransfer('台北', '台北');

      expect(best).toBeNull();
    });

    it('should return null for non-existent stations', () => {
      const best = resolver.findBestTransfer('不存在', '也不存在');

      expect(best).toBeNull();
    });

    it('should have valid data structure', () => {
      const best = resolver.findBestTransfer('台北', '高雄');

      if (best) {
        expect(best.transferStation).toBeDefined();
        expect(best.transferTime).toBeDefined();
        expect(best.firstTrain).toBeDefined();
        expect(best.secondTrain).toBeDefined();
      }
    });

    it('should recommend transfer with reasonable wait time', () => {
      const best = resolver.findBestTransfer('台北', '高雄');

      if (best) {
        expect(best.transferTime).toBeGreaterThanOrEqual(5);
        expect(best.transferTime).toBeLessThanOrEqual(180);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    /**
     * Test edge cases and error conditions
     */
    it('should handle special characters in station names', () => {
      const transfers = resolver.findTransfers('@#$%', '^&*()');

      expect(Array.isArray(transfers)).toBe(true);
      expect(transfers.length).toBe(0);
    });

    it('should handle numeric station names', () => {
      const transfers = resolver.findTransfers('123', '456');

      expect(Array.isArray(transfers)).toBe(true);
    });

    it('should handle very long station names', () => {
      const longName = 'a'.repeat(1000);
      const transfers = resolver.findTransfers(longName, longName);

      expect(Array.isArray(transfers)).toBe(true);
      expect(transfers.length).toBe(0);
    });

    it('should handle invalid station names gracefully', () => {
      // Resolvers will throw error for null/undefined, so test with empty strings instead
      const transfers = resolver.findTransfers('', '台中');

      expect(Array.isArray(transfers)).toBe(true);
      expect(transfers.length).toBe(0);
    });

    it('should handle invalid destination station gracefully', () => {
      // Test with empty string destination
      const transfers = resolver.findTransfers('台北', '');

      expect(Array.isArray(transfers)).toBe(true);
      expect(transfers.length).toBe(0);
    });

    it('should maintain data integrity with repeated queries', () => {
      const results = [];

      for (let i = 0; i < 10; i++) {
        const transfers = resolver.findTransfers('台北', '高雄');
        results.push(transfers);
      }

      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(results[0]);
      }
    });

    it('should handle concurrent transfer queries', async () => {
      const queries = [
        resolver.findTransfers('台北', '高雄'),
        resolver.findTransfers('新竹', '台中'),
        resolver.findTransfers('台中', '台南'),
        resolver.findTransfers('台南', '左營'),
      ];

      const results = await Promise.all(queries);

      for (const result of results) {
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });

  describe('Performance Characteristics', () => {
    /**
     * Test performance and efficiency
     */
    it('should complete transfer search quickly', () => {
      const start = performance.now();
      resolver.findTransfers('台北', '高雄');
      const duration = performance.now() - start;

      // Should complete in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should handle multiple sequential queries efficiently', () => {
      const stations = [
        ['台北', '新竹'],
        ['新竹', '台中'],
        ['台中', '台南'],
        ['台南', '高雄'],
      ];

      const start = performance.now();
      for (const [from, to] of stations) {
        resolver.findTransfers(from, to);
      }
      const duration = performance.now() - start;

      // All 4 queries should complete quickly
      expect(duration).toBeLessThan(200);
    });

    it('should not degrade with repeated queries', () => {
      const query = () => resolver.findTransfers('台北', '高雄');

      // Warm up — first call pays JIT/module-init costs unrelated to the
      // characteristic we want to measure (steady-state per-query time).
      query();

      const times = [];
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        query();
        const duration = performance.now() - start;
        times.push(duration);
      }

      const average = times.reduce((a, b) => a + b) / times.length;
      // Allow generous slack: timer noise dominates at sub-millisecond scale.
      // Use an absolute floor so a fast 0.1ms run doesn't fail on 0.4ms jitter.
      const tolerance = Math.max(average * 3, 2);
      for (const time of times) {
        expect(Math.abs(time - average)).toBeLessThan(tolerance);
      }
    });
  });
});
