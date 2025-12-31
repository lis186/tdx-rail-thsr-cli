import { describe, it, expect, beforeAll } from 'vitest';
import { OperatorResolver } from '../src/lib/operator-resolver';
import operators from '../src/data/operators';
import type { Operator } from '../src/types/api';

describe('OperatorResolver', () => {
  let resolver: OperatorResolver;

  beforeAll(() => {
    resolver = new OperatorResolver(operators as Operator[]);
  });

  describe('getAllOperators', () => {
    it('should return all operators', () => {
      const result = resolver.getAllOperators();
      expect(result).toHaveLength(operators.length);
    });

    it('should return a copy, not reference', () => {
      const result1 = resolver.getAllOperators();
      const result2 = resolver.getAllOperators();
      expect(result1).not.toBe(result2);
    });
  });

  describe('getOperatorById', () => {
    it('should find operator by ID', () => {
      const result = resolver.getOperatorById('THSR');
      expect(result).toBeDefined();
      expect(result?.OperatorID).toBe('THSR');
    });

    it('should be case-insensitive', () => {
      const result = resolver.getOperatorById('thsr');
      expect(result).toBeDefined();
      expect(result?.OperatorID).toBe('THSR');
    });

    it('should return null for non-existent operator', () => {
      const result = resolver.getOperatorById('INVALID');
      expect(result).toBeNull();
    });
  });

  describe('getOperatorByCode', () => {
    it('should find operator by code', () => {
      const result = resolver.getOperatorByCode('TRA');
      expect(result).toBeDefined();
      expect(result?.OperatorCode).toBe('TRA');
    });

    it('should be case-insensitive', () => {
      const result = resolver.getOperatorByCode('tra');
      expect(result).toBeDefined();
      expect(result?.OperatorCode).toBe('TRA');
    });

    it('should return null for non-existent code', () => {
      const result = resolver.getOperatorByCode('INVALID');
      expect(result).toBeNull();
    });
  });

  describe('searchOperators', () => {
    it('should search by Chinese name', () => {
      const result = resolver.searchOperators('高鐵');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].OperatorID).toBe('THSR');
    });

    it('should search by English name', () => {
      const result = resolver.searchOperators('Taiwan');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should search by code', () => {
      const result = resolver.searchOperators('KRTC');
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].OperatorCode).toBe('KRTC');
    });

    it('should be case-insensitive', () => {
      const result = resolver.searchOperators('THSR');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array for no match', () => {
      const result = resolver.searchOperators('nonexistent');
      expect(result).toHaveLength(0);
    });
  });

  describe('getAllOperatorsWithOData', () => {
    it('should filter operators', () => {
      const result = resolver.getAllOperatorsWithOData({
        filter: 'OperatorID=THSR',
      });
      expect(result).toHaveLength(1);
      expect((result[0] as Operator).OperatorID).toBe('THSR');
    });

    it('should select specific fields', () => {
      const result = resolver.getAllOperatorsWithOData({
        select: 'OperatorID,OperatorCode',
      });
      expect(result).toHaveLength(operators.length);
      expect(result[0]).toHaveProperty('OperatorID');
      expect(result[0]).toHaveProperty('OperatorCode');
      expect(result[0]).not.toHaveProperty('OperatorPhone');
    });

    it('should apply pagination', () => {
      const result = resolver.getAllOperatorsWithOData({
        top: 2,
      });
      expect(result).toHaveLength(2);
    });

    it('should handle orderby', () => {
      const result = resolver.getAllOperatorsWithOData({
        orderby: 'OperatorCode',
      });
      expect(result).toHaveLength(operators.length);
      // Result should be sorted
      if (result.length > 1) {
        const codes = result.map((op) => (op as Operator).OperatorCode);
        expect(codes[0].localeCompare(codes[1])).toBeLessThanOrEqual(0);
      }
    });
  });
});
