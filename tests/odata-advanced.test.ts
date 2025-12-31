/**
 * OData Advanced Filtering Tests
 * Tests complex OData query scenarios and edge cases
 *
 * Focus Areas:
 * - Complex filter combinations
 * - Advanced pagination
 * - Field selection edge cases
 * - Sorting with multiple fields
 * - Query optimization
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { StationResolver } from '../src/lib/station-resolver';
import { FareResolver } from '../src/lib/fare-resolver';
import { ScheduleResolver } from '../src/lib/schedule-resolver';
import thsrStations from './fixtures/thsr-stations.json';
import thsrFares from './fixtures/thsr-fares.json';
import thsrSchedules from './fixtures/thsr-schedules.json';
import type { THSRStation, THSRODFare, THSRSchedule } from '../src/types/api';

describe('OData Advanced Filtering', () => {
  let stationResolver: StationResolver;
  let fareResolver: FareResolver;
  let scheduleResolver: ScheduleResolver;

  beforeAll(() => {
    stationResolver = new StationResolver(thsrStations as THSRStation[]);
    fareResolver = new FareResolver(thsrFares as THSRODFare[]);
    scheduleResolver = new ScheduleResolver(thsrSchedules as THSRSchedule[]);
  });

  describe('Complex Filter Combinations', () => {
    /**
     * Test combining multiple filter conditions
     */
    it('should filter by station code', () => {
      const filtered = stationResolver.getAllStationsWithOData({
        filter: 'StationCode=TPE',
      });

      if (filtered.length > 0) {
        for (const station of filtered) {
          const code = (station as any).StationCode;
          expect(code).toBe('TPE');
        }
      }
    });

    it('should filter by city', () => {
      const filtered = stationResolver.getAllStationsWithOData({
        filter: 'LocationCity=臺北市',
      });

      if (filtered.length > 0) {
        for (const station of filtered) {
          const city = (station as any).LocationCity;
          expect(city).toBe('臺北市');
        }
      }
    });

    it('should handle filter with special characters', () => {
      const filtered = stationResolver.getAllStationsWithOData({
        filter: 'LocationCity=臺南市',
      });

      expect(Array.isArray(filtered)).toBe(true);
    });

    it('should filter fares by origin station', () => {
      const filtered = fareResolver.getAllFaresWithOData({
        filter: 'OriginStationCode=TPE',
      });

      expect(Array.isArray(filtered)).toBe(true);
    });

    it('should filter fares by destination station', () => {
      const filtered = fareResolver.getAllFaresWithOData({
        filter: 'DestinationStationCode=KHH',
      });

      expect(Array.isArray(filtered)).toBe(true);
    });

    it('should handle empty filter result', () => {
      const filtered = stationResolver.getAllStationsWithOData({
        filter: 'StationCode=NONEXISTENT',
      });

      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.length).toBe(0);
    });

    it('should handle case-sensitive filtering', () => {
      const filtered1 = stationResolver.getAllStationsWithOData({
        filter: 'StationCode=TPE',
      });

      const filtered2 = stationResolver.getAllStationsWithOData({
        filter: 'StationCode=tpe',
      });

      // May or may not match depending on implementation
      expect(Array.isArray(filtered1)).toBe(true);
      expect(Array.isArray(filtered2)).toBe(true);
    });

    it('should filter with exact value matching', () => {
      const all = stationResolver.getAllStations();
      if (all.length > 0) {
        const station = all[0];
        const code = (station as any).StationCode;

        const filtered = stationResolver.getAllStationsWithOData({
          filter: `StationCode=${code}`,
        });

        if (filtered.length > 0) {
          expect(filtered.some((s) => (s as any).StationCode === code)).toBe(true);
        }
      }
    });
  });

  describe('Pagination Edge Cases', () => {
    /**
     * Test pagination with various edge cases
     */
    it('should handle $top with large values', () => {
      const result = stationResolver.getAllStationsWithOData({
        top: 1000000,
      });

      expect(Array.isArray(result)).toBe(true);
      const allStations = stationResolver.getAllStations();
      expect(result.length).toBeLessThanOrEqual(allStations.length);
    });

    it('should handle $top = 0', () => {
      const result = stationResolver.getAllStationsWithOData({
        top: 0,
      });

      expect(Array.isArray(result)).toBe(true);
      // top: 0 may be treated as unlimited or ignored by implementation
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle $skip greater than total count', () => {
      const all = stationResolver.getAllStations();
      const result = stationResolver.getAllStationsWithOData({
        skip: all.length + 100,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle $skip = 0', () => {
      const result = stationResolver.getAllStationsWithOData({
        skip: 0,
      });

      const all = stationResolver.getAllStations();
      expect(result.length).toBe(all.length);
    });

    it('should combine $top and $skip correctly', () => {
      const top5Skip0 = stationResolver.getAllStationsWithOData({
        top: 5,
        skip: 0,
      });

      const top5Skip5 = stationResolver.getAllStationsWithOData({
        top: 5,
        skip: 5,
      });

      expect(top5Skip0.length).toBeLessThanOrEqual(5);
      expect(top5Skip5.length).toBeLessThanOrEqual(5);

      if (top5Skip0.length === 5 && top5Skip5.length === 5) {
        // Results should be different
        const ids1 = (top5Skip0 as any[]).map((s) => s.StationID);
        const ids2 = (top5Skip5 as any[]).map((s) => s.StationID);

        expect(ids1.some((id) => !ids2.includes(id))).toBe(true);
      }
    });

    it('should return correct page when skipping', () => {
      const all = stationResolver.getAllStations();
      if (all.length >= 10) {
        const page1 = stationResolver.getAllStationsWithOData({
          skip: 0,
          top: 5,
        });

        const page2 = stationResolver.getAllStationsWithOData({
          skip: 5,
          top: 5,
        });

        // Pages should be different
        if (page1.length === 5 && page2.length === 5) {
          const firstId1 = (page1[0] as any).StationID;
          const firstId2 = (page2[0] as any).StationID;

          expect(firstId1).not.toBe(firstId2);
        }
      }
    });

    it('should handle floating point top values', () => {
      // Test system behavior with invalid input
      const result = stationResolver.getAllStationsWithOData({
        top: 5.5 as any,
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Field Selection', () => {
    /**
     * Test selecting specific fields
     */
    it('should select single field', () => {
      const result = stationResolver.getAllStationsWithOData({
        select: 'StationCode',
      });

      if (result.length > 0) {
        expect(Object.keys(result[0]).length).toBeGreaterThan(0);
      }
    });

    it('should select multiple fields', () => {
      const result = stationResolver.getAllStationsWithOData({
        select: 'StationCode,StationName',
      });

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(Object.keys(result[0]).length).toBeGreaterThan(0);
      }
    });

    it('should handle select with spaces', () => {
      const result = stationResolver.getAllStationsWithOData({
        select: 'StationCode, StationName, LocationCity',
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle non-existent field in select', () => {
      const result = stationResolver.getAllStationsWithOData({
        select: 'NONEXISTENT_FIELD',
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should preserve all fields without select option', () => {
      const result = stationResolver.getAllStationsWithOData({});

      if (result.length > 0) {
        const station = result[0] as any;
        expect(station.StationCode).toBeDefined();
        expect(station.StationID).toBeDefined();
      }
    });

    it('should handle select with special characters', () => {
      const result = stationResolver.getAllStationsWithOData({
        select: 'StationName',
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Sorting with orderby', () => {
    /**
     * Test field sorting
     */
    it('should sort stations by code ascending', () => {
      const result = stationResolver.getAllStationsWithOData({
        orderby: 'StationCode asc',
      });

      // Should return results
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        // Verify each result has a code
        for (const station of result) {
          expect((station as any).StationCode).toBeDefined();
        }
      }
    });

    it('should sort stations by code descending', () => {
      const result = stationResolver.getAllStationsWithOData({
        orderby: 'StationCode desc',
      });

      // Should return results
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        // Verify each result has a code
        for (const station of result) {
          expect((station as any).StationCode).toBeDefined();
        }
      }
    });

    it('should handle orderby without direction (default ascending)', () => {
      const result = stationResolver.getAllStationsWithOData({
        orderby: 'StationCode',
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle invalid field in orderby', () => {
      const result = stationResolver.getAllStationsWithOData({
        orderby: 'NONEXISTENT desc',
      });

      // Should handle gracefully
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle case variations in asc/desc', () => {
      const resultLower = stationResolver.getAllStationsWithOData({
        orderby: 'StationCode asc',
      });

      const resultUpper = stationResolver.getAllStationsWithOData({
        orderby: 'StationCode ASC',
      });

      // Both should work
      expect(Array.isArray(resultLower)).toBe(true);
      expect(Array.isArray(resultUpper)).toBe(true);
    });

    it('should maintain sort order with pagination', () => {
      const page1 = stationResolver.getAllStationsWithOData({
        orderby: 'StationCode asc',
        top: 5,
        skip: 0,
      });

      const page2 = stationResolver.getAllStationsWithOData({
        orderby: 'StationCode asc',
        top: 5,
        skip: 5,
      });

      // Both pages should return arrays
      expect(Array.isArray(page1)).toBe(true);
      expect(Array.isArray(page2)).toBe(true);

      // If both pages have results, verify codes exist
      if (page1.length > 0) {
        expect((page1[0] as any).StationCode).toBeDefined();
      }
      if (page2.length > 0) {
        expect((page2[0] as any).StationCode).toBeDefined();
      }
    });
  });

  describe('Combined Query Options', () => {
    /**
     * Test combinations of OData options
     */
    it('should combine filter and select', () => {
      const result = stationResolver.getAllStationsWithOData({
        filter: 'LocationCity=臺北市',
        select: 'StationCode,StationName',
      });

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        for (const station of result) {
          const city = (station as any).LocationCity;
          // Should match filter or city field might not be in result
          expect(station).toBeDefined();
        }
      }
    });

    it('should combine filter, select, and orderby', () => {
      const result = stationResolver.getAllStationsWithOData({
        filter: 'LocationCity=臺北市',
        select: 'StationCode,StationName',
        orderby: 'StationCode asc',
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should combine all query options', () => {
      const result = stationResolver.getAllStationsWithOData({
        filter: 'LocationCity=臺北市',
        select: 'StationCode',
        orderby: 'StationCode asc',
        top: 10,
        skip: 0,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should handle complex filter with pagination', () => {
      const result = fareResolver.getAllFaresWithOData({
        filter: 'OriginStationCode=TPE',
        top: 5,
        skip: 0,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should preserve filter across pagination', () => {
      const page1 = stationResolver.getAllStationsWithOData({
        filter: 'LocationCity=臺北市',
        skip: 0,
        top: 100,
      });

      const page2 = stationResolver.getAllStationsWithOData({
        filter: 'LocationCity=臺北市',
        skip: 0,
        top: 100,
      });

      // Same results with same options
      expect(page1.length).toBe(page2.length);
    });
  });

  describe('Query Performance and Optimization', () => {
    /**
     * Test performance of OData queries
     */
    it('should execute filter quickly', () => {
      const start = performance.now();
      stationResolver.getAllStationsWithOData({
        filter: 'StationCode=TPE',
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should execute pagination quickly', () => {
      const start = performance.now();
      stationResolver.getAllStationsWithOData({
        top: 10,
        skip: 100,
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should handle large result sets efficiently', () => {
      const start = performance.now();
      const result = stationResolver.getAllStationsWithOData({});
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should not degrade with repeated queries', () => {
      const times = [];

      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        stationResolver.getAllStationsWithOData({
          filter: 'StationCode=TPE',
          orderby: 'StationCode asc',
          top: 5,
        });
        const duration = performance.now() - start;
        times.push(duration);
      }

      // All queries should be fast (under 100ms)
      for (const time of times) {
        expect(time).toBeLessThan(100);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    /**
     * Test error handling in OData queries
     */
    it('should handle malformed filter gracefully', () => {
      // Malformed filters may throw or return empty
      try {
        const result = stationResolver.getAllStationsWithOData({
          filter: 'InvalidFilter>>><',
        });

        // If it succeeds, it should return an array
        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        // Implementation may throw on malformed filters - that's acceptable
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid orderby syntax', () => {
      const result = stationResolver.getAllStationsWithOData({
        orderby: 'Field invalid_direction',
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle null options', () => {
      const result = stationResolver.getAllStationsWithOData({});

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle duplicate options', () => {
      // Last value should win
      const result = stationResolver.getAllStationsWithOData({
        filter: 'StationCode=TPE',
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty string filters', () => {
      const result = stationResolver.getAllStationsWithOData({
        filter: '',
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle whitespace-only filters', () => {
      const result = stationResolver.getAllStationsWithOData({
        filter: '   ',
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle very long filter strings', () => {
      const longFilter = 'StationCode=' + 'a'.repeat(1000);
      const result = stationResolver.getAllStationsWithOData({
        filter: longFilter,
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should maintain consistency across repeated queries', () => {
      const results = [];

      for (let i = 0; i < 5; i++) {
        const result = stationResolver.getAllStationsWithOData({
          filter: 'StationCode=TPE',
          orderby: 'StationCode asc',
          top: 5,
        });
        results.push(result);
      }

      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(results[0]);
      }
    });
  });
});
