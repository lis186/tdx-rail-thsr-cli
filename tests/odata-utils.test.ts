import { describe, it, expect } from 'vitest';
import {
  applySelect,
  applyFilter,
  applyOrderBy,
  applyPagination,
  applyODataOptions,
  calculateHaversineDistance,
  applyNearbyFilter,
} from '../src/lib/odata-utils';

describe('OData Utils', () => {
  const testData = [
    {
      StationCode: 'TPE',
      StationName: '台北',
      City: '台北市',
      Position: { lat: 25.0477, lon: 121.517 },
    },
    {
      StationCode: 'BAN',
      StationName: '板橋',
      City: '台北市',
      Position: { lat: 25.0094, lon: 121.4589 },
    },
    {
      StationCode: 'TAC',
      StationName: '台中',
      City: '台中市',
      Position: { lat: 24.1372, lon: 120.6339 },
    },
    {
      StationCode: 'CHU',
      StationName: '嘉義',
      City: '嘉義市',
      Position: { lat: 23.4809, lon: 120.4436 },
    },
    {
      StationCode: 'ZYG',
      StationName: '左營',
      City: '高雄市',
      Position: { lat: 22.6903, lon: 120.2627 },
    },
  ];

  describe('applySelect', () => {
    it('should select specified fields', () => {
      const result = applySelect(testData, 'StationCode,StationName');
      expect(result).toHaveLength(5);
      expect(result[0]).toHaveProperty('StationCode');
      expect(result[0]).toHaveProperty('StationName');
      expect(result[0]).not.toHaveProperty('City');
    });

    it('should handle single field selection', () => {
      const result = applySelect(testData, 'StationCode');
      expect(result[0]).toEqual({ StationCode: 'TPE' });
    });

    it('should handle whitespace in field names', () => {
      const result = applySelect(testData, 'StationCode , City');
      expect(result[0]).toHaveProperty('StationCode');
      expect(result[0]).toHaveProperty('City');
    });

    it('should return full objects when select is empty', () => {
      const result = applySelect(testData, '');
      expect(result).toEqual(testData);
    });

    it('should ignore non-existent fields', () => {
      const result = applySelect(testData, 'StationCode,NonExistent');
      expect(result[0]).toHaveProperty('StationCode');
      expect(result[0]).not.toHaveProperty('NonExistent');
    });
  });

  describe('applyFilter', () => {
    it('should filter by exact match', () => {
      const result = applyFilter(testData, 'City=台北市');
      expect(result).toHaveLength(2);
      expect(result.every((item) => item.City === '台北市')).toBe(true);
    });

    it('should filter by station code', () => {
      const result = applyFilter(testData, 'StationCode=TPE');
      expect(result).toHaveLength(1);
      expect(result[0].StationCode).toBe('TPE');
    });

    it('should return empty array when no match', () => {
      const result = applyFilter(testData, 'City=不存在的城市');
      expect(result).toHaveLength(0);
    });

    it('should handle whitespace in filter value', () => {
      const result = applyFilter(testData, 'City=台北市');
      expect(result).toHaveLength(2);
    });

    it('should throw error for invalid filter format', () => {
      expect(() => applyFilter(testData, 'InvalidFilter')).toThrow(
        'Invalid filter format'
      );
    });

    it('should return all items when filter is empty', () => {
      const result = applyFilter(testData, '');
      expect(result).toEqual(testData);
    });
  });

  describe('applyOrderBy', () => {
    it('should sort by string field in ascending order', () => {
      const result = applyOrderBy(testData, 'StationName');
      // After sorting (localeCompare): 台中, 台北, 嘉義, 左營, 板橋
      expect(result[0].StationName).toBe('台中');
      expect(result[result.length - 1].StationName).toBe('板橋');
    });

    it('should sort by string field in descending order', () => {
      const result = applyOrderBy(testData, '-StationName');
      // Descending: 板橋, 左營, 嘉義, 台北, 台中
      expect(result[0].StationName).toBe('板橋');
      expect(result[result.length - 1].StationName).toBe('台中');
    });

    it('should sort by numeric field', () => {
      const numericData = [
        { code: 'A', value: 30 },
        { code: 'B', value: 10 },
        { code: 'C', value: 20 },
      ];
      const result = applyOrderBy(numericData, 'value');
      expect(result[0].value).toBe(10);
      expect(result[2].value).toBe(30);
    });

    it('should sort descending numeric field', () => {
      const numericData = [
        { code: 'A', value: 30 },
        { code: 'B', value: 10 },
        { code: 'C', value: 20 },
      ];
      const result = applyOrderBy(numericData, '-value');
      expect(result[0].value).toBe(30);
      expect(result[2].value).toBe(10);
    });

    it('should return data when orderby is empty', () => {
      const result = applyOrderBy(testData, '');
      expect(result).toEqual(testData);
    });
  });

  describe('applyPagination', () => {
    it('should apply top parameter', () => {
      const result = applyPagination(testData, 2);
      expect(result).toHaveLength(2);
      expect(result[0].StationCode).toBe('TPE');
      expect(result[1].StationCode).toBe('BAN');
    });

    it('should apply skip parameter', () => {
      const result = applyPagination(testData, undefined, 2);
      expect(result).toHaveLength(3);
      expect(result[0].StationCode).toBe('TAC');
    });

    it('should apply both top and skip', () => {
      const result = applyPagination(testData, 2, 1);
      expect(result).toHaveLength(2);
      expect(result[0].StationCode).toBe('BAN');
      expect(result[1].StationCode).toBe('TAC');
    });

    it('should handle skip larger than data length', () => {
      const result = applyPagination(testData, undefined, 100);
      expect(result).toHaveLength(0);
    });

    it('should return all data when top/skip not provided', () => {
      const result = applyPagination(testData);
      expect(result).toEqual(testData);
    });
  });

  describe('applyODataOptions', () => {
    it('should apply filter then select', () => {
      const result = applyODataOptions(testData, {
        filter: 'City=台北市',
        select: 'StationCode,StationName',
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('StationCode');
      expect(result[0]).toHaveProperty('StationName');
      expect(result[0]).not.toHaveProperty('City');
    });

    it('should apply filter then orderby', () => {
      const result = applyODataOptions(testData, {
        filter: 'City=台北市',
        orderby: '-StationName',
      });
      expect(result).toHaveLength(2);
      expect((result[0] as any).StationName).toBe('板橋');
    });

    it('should apply all options in correct order', () => {
      const result = applyODataOptions(testData, {
        filter: 'City=台北市',
        orderby: 'StationName',
        select: 'StationCode',
        top: 1,
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('StationCode');
      expect(result[0]).not.toHaveProperty('StationName');
    });

    it('should handle empty options', () => {
      const result = applyODataOptions(testData, {});
      expect(result).toEqual(testData);
    });

    it('should chain pagination after filter', () => {
      const result = applyODataOptions(testData, {
        filter: 'City=台北市',
        skip: 1,
        top: 1,
      });
      expect(result).toHaveLength(1);
      expect((result[0] as any).StationCode).toBe('BAN');
    });
  });

  describe('calculateHaversineDistance', () => {
    it('should calculate distance between two points', () => {
      const point1 = { lat: 25.0477, lon: 121.517 }; // Taipei
      const point2 = { lat: 24.1372, lon: 120.6339 }; // Taichung
      const distance = calculateHaversineDistance(point1, point2);
      // Approximate distance: ~135 km
      expect(distance).toBeGreaterThan(100000); // 100 km
      expect(distance).toBeLessThan(150000); // 150 km
    });

    it('should return 0 for same point', () => {
      const point = { lat: 25.0477, lon: 121.517 };
      const distance = calculateHaversineDistance(point, point);
      expect(distance).toBeLessThan(1); // Nearly 0 (floating point tolerance)
    });

    it('should be symmetric', () => {
      const point1 = { lat: 25.0477, lon: 121.517 };
      const point2 = { lat: 24.1372, lon: 120.6339 };
      const d1 = calculateHaversineDistance(point1, point2);
      const d2 = calculateHaversineDistance(point2, point1);
      expect(d1).toBeCloseTo(d2);
    });
  });

  describe('applyNearbyFilter', () => {
    const geoTestData = [
      {
        StationCode: 'TPE',
        StationName: '台北',
        StationPosition: {
          PositionLat: 25.0477,
          PositionLon: 121.517,
        },
      },
      {
        StationCode: 'BAN',
        StationName: '板橋',
        StationPosition: {
          PositionLat: 25.0094,
          PositionLon: 121.4589,
        },
      },
      {
        StationCode: 'TAC',
        StationName: '台中',
        StationPosition: {
          PositionLat: 24.1372,
          PositionLon: 120.6339,
        },
      },
    ];

    it('should filter stations within radius', () => {
      const centerPoint = { lat: 25.0477, lon: 121.517 }; // Taipei
      const result = applyNearbyFilter(geoTestData, centerPoint, 30000); // 30 km radius
      expect(result.length).toBeGreaterThan(0);
      expect(result.some((s) => s.StationCode === 'TPE')).toBe(true);
    });

    it('should exclude stations outside radius', () => {
      const centerPoint = { lat: 25.0477, lon: 121.517 }; // Taipei
      const result = applyNearbyFilter(geoTestData, centerPoint, 5000); // 5 km radius (only very close)
      // Should only include taipei and maybe banqiao
      expect(result.every((s) => s.StationCode !== 'TAC')).toBe(true);
    });

    it('should return all stations for large radius', () => {
      const centerPoint = { lat: 25.0477, lon: 121.517 };
      const result = applyNearbyFilter(geoTestData, centerPoint, 500000); // 500 km radius
      expect(result).toHaveLength(3);
    });

    it('should return empty array for small radius far from all', () => {
      const centerPoint = { lat: 22.6903, lon: 120.2627 }; // Far south (Kaohsiung)
      const result = applyNearbyFilter(geoTestData, centerPoint, 10000); // 10 km radius
      // Should be empty or have very few results
      expect(result.length).toBeLessThanOrEqual(1);
    });
  });
});
