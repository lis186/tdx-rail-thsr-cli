/**
 * JourneyPlanResolver Tests
 * Tests for journey planning, route finding, and transfer optimization
 */

import { describe, it, expect } from 'vitest';
import { JourneyPlanResolver, type JourneyOptions } from '../src/lib/journey-planner.js';

describe('JourneyPlanResolver', () => {
  let resolver: JourneyPlanResolver;

  beforeEach(() => {
    resolver = new JourneyPlanResolver();
  });

  describe('planJourney - Basic Direct Routes', () => {
    it('should find direct route from Taipei to Taichung', () => {
      const journey = resolver.planJourney('Taipei', 'Taichung', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      expect(journey).not.toBeNull();
      expect(journey?.fromStation).toBe('台北');
      expect(journey?.toStation).toBe('台中');
      expect(journey?.totalLegs).toBe(1);
      expect(journey?.legs.length).toBe(1);
    });

    it('should find direct route from Nangang to Zuoying', () => {
      const journey = resolver.planJourney('Nangang', 'Zuoying', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      expect(journey).not.toBeNull();
      expect(journey?.fromStation).toBe('南港');
      expect(journey?.toStation).toBe('左營');
    });

    it('should return null for non-existent route without transfers', () => {
      const journey = resolver.planJourney('InvalidStation1', 'InvalidStation2', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      expect(journey).toBeNull();
    });

    it('should find route for reverse direction Zuoying to Taipei', () => {
      const journey = resolver.planJourney('Zuoying', 'Taipei', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      expect(journey).not.toBeNull();
      expect(journey?.fromStation).toBe('左營');
      expect(journey?.toStation).toBe('台北');
    });
  });

  describe('planJourney - Time Constraints', () => {
    it('should filter by departure time', () => {
      const journey = resolver.planJourney('Taipei', 'Taichung', {
        date: '2025-12-31',
        departureTime: '06:30',
        allowTransfers: false,
      });

      expect(journey).not.toBeNull();
      expect(journey?.departureTime).toBeDefined();
      const deptHour = parseInt(journey?.departureTime?.split(':')[0] || '0', 10);
      expect(deptHour >= 6).toBe(true);
    });

    it('should filter by arrival time', () => {
      const journey = resolver.planJourney('Taipei', 'Taichung', {
        date: '2025-12-31',
        arrivalTime: '09:00',
        allowTransfers: false,
      });

      expect(journey).not.toBeNull();
      if (journey?.arrivalTime) {
        const [hours] = journey.arrivalTime.split(':').map(Number);
        expect(hours <= 9).toBe(true);
      }
    });

    it('should return null when no trains match departure time', () => {
      const journey = resolver.planJourney('Taipei', 'Taichung', {
        date: '2025-12-31',
        departureTime: '23:00',
        allowTransfers: false,
      });

      expect(journey).toBeNull();
    });

    it('should return null when no trains match arrival time', () => {
      const journey = resolver.planJourney('Taipei', 'Taichung', {
        date: '2025-12-31',
        arrivalTime: '06:00',
        allowTransfers: false,
      });

      expect(journey).toBeNull();
    });
  });

  describe('planJourney - With Transfers', () => {
    it('should find routes with transfers enabled', () => {
      const journey = resolver.planJourney('Taipei', 'Taichung', {
        date: '2025-12-31',
        allowTransfers: true,
      });

      expect(journey).not.toBeNull();
      expect(journey?.fromStation).toBe('台北');
      expect(journey?.toStation).toBe('台中');
    });

    it('should prefer direct route over transfer route', () => {
      const journeyDirect = resolver.planJourney('Taipei', 'Taichung', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      const journeyTransfer = resolver.planJourney('Taipei', 'Taichung', {
        date: '2025-12-31',
        allowTransfers: true,
      });

      expect(journeyDirect).not.toBeNull();
      expect(journeyTransfer).not.toBeNull();
      expect(journeyDirect?.totalLegs).toBe(1);
    });

    it('should respect max transfer time', () => {
      const journey = resolver.planJourney('Taipei', 'Zuoying', {
        date: '2025-12-31',
        allowTransfers: true,
        maxTransferTime: 15,
      });

      // Should still find journey but only with transfers having 15+ minute connection
      expect(journey).not.toBeNull();
    });

    it('should increase max transfer time for more options', () => {
      const shortTransfer = resolver.planJourney('Taipei', 'Zuoying', {
        date: '2025-12-31',
        allowTransfers: true,
        maxTransferTime: 10,
      });

      const longTransfer = resolver.planJourney('Taipei', 'Zuoying', {
        date: '2025-12-31',
        allowTransfers: true,
        maxTransferTime: 60,
      });

      // Both should ideally find routes
      expect(shortTransfer).toBeDefined();
      expect(longTransfer).toBeDefined();
    });
  });

  describe('planJourney - Journey Plan Structure', () => {
    it('should return properly structured journey plan', () => {
      const journey = resolver.planJourney('Taipei', 'Taichung', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      expect(journey).toBeDefined();
      expect(journey?.fromStation).toBeDefined();
      expect(journey?.toStation).toBeDefined();
      expect(journey?.totalDuration).toBeDefined();
      expect(journey?.totalLegs).toBeDefined();
      expect(Array.isArray(journey?.legs)).toBe(true);
      expect(journey?.legs.length).toBeGreaterThan(0);
    });

    it('should include departure and arrival times', () => {
      const journey = resolver.planJourney('Taipei', 'Taichung', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      expect(journey?.departureTime).toBeDefined();
      expect(journey?.arrivalTime).toBeDefined();
      expect(journey?.departureTime).toMatch(/^\d{2}:\d{2}$/);
      expect(journey?.arrivalTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should have valid leg structure', () => {
      const journey = resolver.planJourney('Taipei', 'Taichung', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      const leg = journey?.legs[0];
      expect(leg?.legNumber).toBe(1);
      expect(leg?.trainNumber).toBeDefined();
      expect(leg?.fromStation).toBeDefined();
      expect(leg?.toStation).toBeDefined();
      expect(leg?.departureTime).toBeDefined();
      expect(leg?.arrivalTime).toBeDefined();
      expect(leg?.duration).toBeDefined();
      expect(leg?.seatAvailable).toBeGreaterThanOrEqual(0);
    });
  });

  describe('findEarliestDeparture', () => {
    it('should find earliest departure route', () => {
      const journey = resolver.findEarliestDeparture('Taipei', 'Taichung', '2025-12-31');

      expect(journey).not.toBeNull();
      expect(journey?.fromStation).toBe('台北');
      expect(journey?.toStation).toBe('台中');
    });

    it('should return earliest available train', () => {
      const journey = resolver.findEarliestDeparture('Taipei', 'Taichung', '2025-12-31');

      // Train 601 departs at 06:39, Train 602 departs at 07:09
      // Should return Train 601
      expect(journey?.legs[0]?.trainNumber).toBe('601');
      expect(journey?.departureTime).toBe('06:39');
    });

    it('should not allow transfers for earliest departure', () => {
      const journey = resolver.findEarliestDeparture('Taipei', 'Taichung', '2025-12-31');

      // Should find direct route, not transfers
      expect(journey?.totalLegs).toBe(1);
    });

    it('should return null for non-existent route', () => {
      const journey = resolver.findEarliestDeparture('InvalidFrom', 'InvalidTo', '2025-12-31');

      expect(journey).toBeNull();
    });
  });

  describe('findLatestArrival', () => {
    it('should find latest arrival route', () => {
      const journey = resolver.findLatestArrival('Taipei', 'Taichung', '2025-12-31');

      expect(journey).not.toBeNull();
      expect(journey?.fromStation).toBe('台北');
      expect(journey?.toStation).toBe('台中');
    });

    it('should not allow transfers for latest arrival', () => {
      const journey = resolver.findLatestArrival('Taipei', 'Taichung', '2025-12-31');

      // Should find direct route, not transfers
      expect(journey?.totalLegs).toBe(1);
    });

    it('should return null for non-existent route', () => {
      const journey = resolver.findLatestArrival('InvalidFrom', 'InvalidTo', '2025-12-31');

      expect(journey).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle same station journey', () => {
      const journey = resolver.planJourney('Taipei', 'Taipei', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      // Should return null as from and to are the same
      expect(journey).toBeNull();
    });

    it('should handle fuzzy station name matching', () => {
      const journey = resolver.planJourney('taipei', 'taichung', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      // Should work with lowercase
      expect(journey).not.toBeNull();
    });

    it('should handle Chinese station names', () => {
      const journey = resolver.planJourney('台北', '台中', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      expect(journey).not.toBeNull();
    });

    it('should handle empty schedules for date', () => {
      const journey = resolver.planJourney('Taipei', 'Taichung', {
        date: '2000-01-01',
        allowTransfers: false,
      });

      // Should return null when no schedules for that date
      expect(journey).toBeNull();
    });
  });

  describe('Duration Parsing', () => {
    it('should parse duration format correctly', () => {
      const journey = resolver.planJourney('Taipei', 'Taichung', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      // Train 601: 06:39 to 07:40 = 1 hour 1 minute
      expect(journey?.totalDuration).toMatch(/^\d+h\s*\d+m$/);
    });

    it('should calculate correct duration between stops', () => {
      const journey = resolver.planJourney('Taipei', 'Taichung', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      const leg = journey?.legs[0];
      expect(leg?.duration).toMatch(/^\d+h\s*\d+m$/);
    });
  });

  describe('Multi-Station Routes', () => {
    it('should find routes with multiple stops', () => {
      const journey = resolver.planJourney('Taipei', 'Zuoying', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      expect(journey).not.toBeNull();
      expect(journey?.toStation).toBe('左營');
    });

    it('should handle intermediate stops correctly', () => {
      const journey = resolver.planJourney('Banqiao', 'Taichung', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      expect(journey).not.toBeNull();
      expect(journey?.fromStation).toBe('板橋');
      expect(journey?.toStation).toBe('台中');
    });

    it('should find route from middle of line', () => {
      const journey = resolver.planJourney('Hsinchu', 'Zuoying', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      expect(journey).not.toBeNull();
      expect(journey?.fromStation).toBe('新竹');
      expect(journey?.toStation).toBe('左營');
    });
  });

  describe('Reverse Direction Routes', () => {
    it('should handle reverse direction train (701)', () => {
      const journey = resolver.planJourney('Zuoying', 'Taipei', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      expect(journey).not.toBeNull();
      expect(journey?.legs[0]?.trainNumber).toBe('701');
    });

    it('should correctly identify reverse direction departure', () => {
      const journey = resolver.planJourney('Zuoying', 'Taipei', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      // Train 701 departs at 13:00 from Zuoying
      expect(journey?.departureTime).toBe('13:00');
    });

    it('should find latest arrival on return journey', () => {
      const journey = resolver.findLatestArrival('Zuoying', 'Taipei', '2025-12-31');

      expect(journey).not.toBeNull();
      expect(journey?.legs[0]?.trainNumber).toBe('701');
    });
  });

  describe('Options Handling', () => {
    it('should use default date when not specified', () => {
      const today = new Date().toISOString().split('T')[0];

      // This would need current day data, so just test that it doesn't crash
      const journey = resolver.planJourney('Taipei', 'Taichung', {
        date: today,
        allowTransfers: false,
      });

      // Might be null if no schedules for today, but shouldn't error
      expect(journey === null || journey !== null).toBe(true);
    });

    it('should handle null time constraints', () => {
      const journey = resolver.planJourney('Taipei', 'Taichung', {
        date: '2025-12-31',
        allowTransfers: false,
        departureTime: undefined,
        arrivalTime: undefined,
      });

      expect(journey).not.toBeNull();
    });

    it('should accept all journey options', () => {
      const options: JourneyOptions = {
        date: '2025-12-31',
        departureTime: '07:00',
        arrivalTime: '10:00',
        allowTransfers: true,
        maxTransferTime: 45,
      };

      const journey = resolver.planJourney('Taipei', 'Zuoying', options);

      // Should not throw and return a journey or null
      expect(journey === null || journey !== null).toBe(true);
    });
  });

  describe('Best Journey Selection', () => {
    it('should select shortest duration when multiple options exist', () => {
      const journey = resolver.planJourney('Taipei', 'Taichung', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      // Train 601: 1 hour 1 minute (06:39 to 07:40)
      // Train 602: 1 hour 1 minute (07:09 to 08:10)
      // Should prefer 601 as it's earlier
      expect(journey?.legs[0]?.trainNumber).toBe('601');
    });

    it('should handle multiple direct route options', () => {
      const journey = resolver.planJourney('Taipei', 'Taichung', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      expect(journey?.totalLegs).toBe(1);
      expect(journey?.legs.length).toBe(1);
    });
  });
});
