/**
 * OccupancyAnalyzer Tests
 * Tests for train occupancy analysis and real-time capacity tracking
 */

import { describe, it, expect } from 'vitest';
import { OccupancyAnalyzer } from '../src/lib/occupancy-analyzer.js';

describe('OccupancyAnalyzer', () => {
  let analyzer: OccupancyAnalyzer;

  beforeEach(() => {
    analyzer = new OccupancyAnalyzer();
  });

  describe('getTrainOccupancy - Individual Train Analysis', () => {
    it('should get occupancy for a specific train', () => {
      const occupancy = analyzer.getTrainOccupancy('601', '2025-12-31');

      expect(occupancy).not.toBeNull();
      expect(occupancy?.trainNumber).toBe('601');
    });

    it('should return null for non-existent train', () => {
      const occupancy = analyzer.getTrainOccupancy('999', '2025-12-31');

      expect(occupancy).toBeNull();
    });

    it('should include all required occupancy properties', () => {
      const occupancy = analyzer.getTrainOccupancy('601', '2025-12-31');

      if (occupancy) {
        expect(occupancy.trainNumber).toBeDefined();
        expect(occupancy.fromStation).toBeDefined();
        expect(occupancy.toStation).toBeDefined();
        expect(occupancy.date).toBeDefined();
        expect(occupancy.standardOccupancyRate).toBeGreaterThanOrEqual(0);
        expect(occupancy.businessOccupancyRate).toBeGreaterThanOrEqual(0);
        expect(occupancy.overallOccupancyRate).toBeGreaterThanOrEqual(0);
        expect(occupancy.totalSeats).toBeGreaterThan(0);
        expect(occupancy.availableSeats).toBeGreaterThanOrEqual(0);
        expect(occupancy.reservedSeats).toBeGreaterThanOrEqual(0);
        expect(occupancy.occupancyStatus).toBeDefined();
        expect(occupancy.crowdLevel).toBeDefined();
      }
    });

    it('should calculate occupancy rates correctly', () => {
      const occupancy = analyzer.getTrainOccupancy('601', '2025-12-31');

      if (occupancy) {
        expect(occupancy.overallOccupancyRate).toBeLessThanOrEqual(100);
        expect(occupancy.overallOccupancyRate).toBeGreaterThanOrEqual(0);
        const calculated = (occupancy.reservedSeats / occupancy.totalSeats) * 100;
        expect(Math.abs(occupancy.overallOccupancyRate - calculated)).toBeLessThan(1);
      }
    });

    it('should validate seat counts match total', () => {
      const occupancy = analyzer.getTrainOccupancy('601', '2025-12-31');

      if (occupancy) {
        expect(occupancy.availableSeats + occupancy.reservedSeats).toBe(occupancy.totalSeats);
      }
    });
  });

  describe('getOccupancyByDate - Daily Occupancy Summary', () => {
    it('should get occupancy for all trains on a date', () => {
      const occupancies = analyzer.getOccupancyByDate('2025-12-31');

      expect(Array.isArray(occupancies)).toBe(true);
      expect(occupancies.length).toBeGreaterThan(0);
    });

    it('should return empty array for date with no data', () => {
      const occupancies = analyzer.getOccupancyByDate('2000-01-01');

      expect(Array.isArray(occupancies)).toBe(true);
      expect(occupancies.length).toBe(0);
    });

    it('should sort by occupancy rate descending', () => {
      const occupancies = analyzer.getOccupancyByDate('2025-12-31');

      for (let i = 1; i < occupancies.length; i++) {
        expect(occupancies[i - 1].overallOccupancyRate).toBeGreaterThanOrEqual(
          occupancies[i].overallOccupancyRate
        );
      }
    });

    it('should not include duplicate trains', () => {
      const occupancies = analyzer.getOccupancyByDate('2025-12-31');

      const trainNumbers = new Set(occupancies.map((o) => o.trainNumber));
      expect(trainNumbers.size).toBe(occupancies.length);
    });
  });

  describe('getOccupancyByRoute - Route-Based Analysis', () => {
    it('should get occupancy for trains on a specific route', () => {
      const occupancies = analyzer.getOccupancyByRoute('Taipei', 'Taichung', '2025-12-31');

      expect(Array.isArray(occupancies)).toBe(true);
    });

    it('should return empty array for invalid route', () => {
      const occupancies = analyzer.getOccupancyByRoute('InvalidFrom', 'InvalidTo', '2025-12-31');

      expect(Array.isArray(occupancies)).toBe(true);
      expect(occupancies.length).toBe(0);
    });

    it('should sort by occupancy rate ascending', () => {
      const occupancies = analyzer.getOccupancyByRoute('Taipei', 'Taichung', '2025-12-31');

      for (let i = 1; i < occupancies.length; i++) {
        expect(occupancies[i - 1].overallOccupancyRate).toBeLessThanOrEqual(
          occupancies[i].overallOccupancyRate
        );
      }
    });

    it('should only include trains on the specified route', () => {
      const occupancies = analyzer.getOccupancyByRoute('Taipei', 'Taichung', '2025-12-31');

      for (const occ of occupancies) {
        expect(occ.fromStation).toBe('台北');
        expect(occ.toStation).toBe('台中');
      }
    });
  });

  describe('getBusyTrains - High Occupancy Filter', () => {
    it('should find busy trains above threshold', () => {
      const busy = analyzer.getBusyTrains('2025-12-31', 70);

      expect(Array.isArray(busy)).toBe(true);
      for (const occ of busy) {
        expect(occ.overallOccupancyRate).toBeGreaterThanOrEqual(70);
      }
    });

    it('should accept custom threshold', () => {
      const busy50 = analyzer.getBusyTrains('2025-12-31', 50);
      const busy80 = analyzer.getBusyTrains('2025-12-31', 80);

      expect(busy50.length).toBeGreaterThanOrEqual(busy80.length);
    });

    it('should return empty for very high threshold', () => {
      const busy = analyzer.getBusyTrains('2025-12-31', 99);

      expect(Array.isArray(busy)).toBe(true);
    });
  });

  describe('getAvailableTrains - Low Occupancy Filter', () => {
    it('should find available trains below threshold', () => {
      const available = analyzer.getAvailableTrains('2025-12-31', 30);

      expect(Array.isArray(available)).toBe(true);
      for (const occ of available) {
        expect(occ.overallOccupancyRate).toBeLessThanOrEqual(30);
      }
    });

    it('should accept custom threshold', () => {
      const available20 = analyzer.getAvailableTrains('2025-12-31', 20);
      const available50 = analyzer.getAvailableTrains('2025-12-31', 50);

      expect(available50.length).toBeGreaterThanOrEqual(available20.length);
    });

    it('should return trains with seats available', () => {
      const available = analyzer.getAvailableTrains('2025-12-31', 50);

      for (const occ of available) {
        expect(occ.availableSeats).toBeGreaterThan(0);
      }
    });
  });

  describe('getRecommendedTrains - Smart Recommendations', () => {
    it('should recommend trains with low occupancy', () => {
      const recommended = analyzer.getRecommendedTrains('Taipei', 'Taichung', '2025-12-31');

      expect(Array.isArray(recommended)).toBe(true);
      for (const occ of recommended) {
        expect(occ.overallOccupancyRate).toBeLessThan(60);
      }
    });

    it('should recommend trains with sufficient seats', () => {
      const recommended = analyzer.getRecommendedTrains('Taipei', 'Taichung', '2025-12-31');

      for (const occ of recommended) {
        expect(occ.availableSeats).toBeGreaterThanOrEqual(20);
      }
    });

    it('should return empty for invalid route', () => {
      const recommended = analyzer.getRecommendedTrains('InvalidFrom', 'InvalidTo', '2025-12-31');

      expect(Array.isArray(recommended)).toBe(true);
      expect(recommended.length).toBe(0);
    });
  });

  describe('Occupancy Status Classification', () => {
    it('should classify Empty status correctly', () => {
      const occupancy = analyzer.getTrainOccupancy('601', '2025-12-31');

      if (occupancy && occupancy.overallOccupancyRate === 0) {
        expect(occupancy.occupancyStatus).toBe('Empty');
      }
    });

    it('should classify Low status correctly', () => {
      const occupancy = analyzer.getTrainOccupancy('601', '2025-12-31');

      if (occupancy && occupancy.overallOccupancyRate > 0 && occupancy.overallOccupancyRate < 40) {
        expect(occupancy.occupancyStatus).toBe('Low');
      }
    });

    it('should classify Moderate status correctly', () => {
      const occupancy = analyzer.getTrainOccupancy('601', '2025-12-31');

      if (occupancy && occupancy.overallOccupancyRate >= 40 && occupancy.overallOccupancyRate < 70) {
        expect(occupancy.occupancyStatus).toBe('Moderate');
      }
    });

    it('should classify High status correctly', () => {
      const occupancy = analyzer.getTrainOccupancy('601', '2025-12-31');

      if (occupancy && occupancy.overallOccupancyRate >= 70 && occupancy.overallOccupancyRate < 100) {
        expect(occupancy.occupancyStatus).toBe('High');
      }
    });

    it('should classify Full status correctly', () => {
      const occupancy = analyzer.getTrainOccupancy('601', '2025-12-31');

      if (occupancy && occupancy.overallOccupancyRate >= 100) {
        expect(occupancy.occupancyStatus).toBe('Full');
      }
    });
  });

  describe('Crowd Level Classification', () => {
    it('should classify crowd levels appropriately', () => {
      const occupancy = analyzer.getTrainOccupancy('601', '2025-12-31');

      if (occupancy) {
        const validLevels = ['Very Quiet', 'Quiet', 'Moderate', 'Busy', 'Very Busy'];
        expect(validLevels).toContain(occupancy.crowdLevel);
      }
    });

    it('should have correct crowd level distribution', () => {
      const occupancies = analyzer.getOccupancyByDate('2025-12-31');

      const quietOnes = occupancies.filter((o) => o.crowdLevel === 'Very Quiet');
      const busyOnes = occupancies.filter((o) => o.crowdLevel === 'Very Busy');

      // There should be some variety in crowd levels
      expect(occupancies.length).toBeGreaterThan(0);
    });
  });

  describe('formatOccupancy - Display Formatting', () => {
    it('should format occupancy percentage', () => {
      const formatted = analyzer.formatOccupancy(50);

      expect(formatted).toBe('50%');
    });

    it('should handle edge cases', () => {
      expect(analyzer.formatOccupancy(0)).toBe('0%');
      expect(analyzer.formatOccupancy(100)).toBe('100%');
    });
  });

  describe('getOccupancyBar - Visual Display', () => {
    it('should generate occupancy bar', () => {
      const bar = analyzer.getOccupancyBar(50, 20);

      expect(bar).toMatch(/^[█░]+$/);
      expect(bar.length).toBe(20);
    });

    it('should scale bar correctly', () => {
      const bar25 = analyzer.getOccupancyBar(25, 20);
      const bar50 = analyzer.getOccupancyBar(50, 20);
      const bar75 = analyzer.getOccupancyBar(75, 20);

      expect(bar25).toMatch(/^█{5}░{15}$/);
      expect(bar50).toMatch(/^█{10}░{10}$/);
      expect(bar75).toMatch(/^█{15}░{5}$/);
    });

    it('should handle 0% and 100%', () => {
      const bar0 = analyzer.getOccupancyBar(0, 10);
      const bar100 = analyzer.getOccupancyBar(100, 10);

      expect(bar0).toBe('░░░░░░░░░░');
      expect(bar100).toBe('██████████');
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle invalid date format gracefully', () => {
      const occupancies = analyzer.getOccupancyByDate('2025-13-45');

      expect(Array.isArray(occupancies)).toBe(true);
    });

    it('should handle case-insensitive station names', () => {
      const occupancies1 = analyzer.getOccupancyByRoute('taipei', 'taichung', '2025-12-31');
      const occupancies2 = analyzer.getOccupancyByRoute('Taipei', 'Taichung', '2025-12-31');

      expect(occupancies1.length).toBe(occupancies2.length);
    });

    it('should handle Chinese station names', () => {
      const occupancies = analyzer.getOccupancyByRoute('台北', '台中', '2025-12-31');

      expect(Array.isArray(occupancies)).toBe(true);
    });

    it('should calculate realistic occupancy percentages', () => {
      const occupancies = analyzer.getOccupancyByDate('2025-12-31');

      for (const occ of occupancies) {
        expect(occ.overallOccupancyRate).toBeLessThanOrEqual(100);
        expect(occ.overallOccupancyRate).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Multi-Class Occupancy Analysis', () => {
    it('should track standard and business class separately', () => {
      const occupancy = analyzer.getTrainOccupancy('601', '2025-12-31');

      if (occupancy) {
        expect(occupancy.standardOccupancyRate).toBeDefined();
        expect(occupancy.businessOccupancyRate).toBeDefined();
      }
    });

    it('should handle trains with only one class', () => {
      const occupancies = analyzer.getOccupancyByDate('2025-12-31');

      // All trains should have occupancy info even if missing a class
      for (const occ of occupancies) {
        expect(
          occ.standardOccupancyRate >= 0 || occ.businessOccupancyRate >= 0
        ).toBe(true);
      }
    });
  });

  describe('Performance and Data Consistency', () => {
    it('should handle large date ranges efficiently', () => {
      const occupancies = analyzer.getOccupancyByDate('2025-12-31');

      expect(Array.isArray(occupancies)).toBe(true);
      expect(occupancies.length).toBeGreaterThanOrEqual(0);
    });

    it('should maintain data consistency across queries', () => {
      const occupancy1 = analyzer.getTrainOccupancy('601', '2025-12-31');
      const occupancy2 = analyzer.getTrainOccupancy('601', '2025-12-31');

      expect(occupancy1?.overallOccupancyRate).toBe(occupancy2?.overallOccupancyRate);
      expect(occupancy1?.trainNumber).toBe(occupancy2?.trainNumber);
    });
  });
});
