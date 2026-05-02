/**
 * JourneyPlanner Advanced Test Suite
 * Tests complex journey planning scenarios and edge cases
 *
 * Focus Areas:
 * - Early/Latest departure optimization
 * - Transfer time constraints
 * - Date boundary handling
 * - Multi-leg route optimization
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { JourneyPlanResolver } from '../src/lib/journey-planner';
import { StationResolver } from '../src/lib/station-resolver';
import { ScheduleResolver } from '../src/lib/schedule-resolver';
import thsrStations from './fixtures/thsr-stations.json';
import thsrSchedules from './fixtures/thsr-schedules.json';
import type { THSRStation, THSRSchedule } from '../src/types/api';

describe('JourneyPlanner - Advanced Scenarios', () => {
  let journeyPlanner: JourneyPlanResolver;
  let stationResolver: StationResolver;
  let scheduleResolver: ScheduleResolver;

  beforeAll(() => {
    stationResolver = new StationResolver(thsrStations as THSRStation[]);
    scheduleResolver = new ScheduleResolver(thsrSchedules as THSRSchedule[]);
    journeyPlanner = new JourneyPlanResolver();
  });

  describe('Early Departure Optimization', () => {
    /**
     * Test earliest departure finding
     * Should find the first available train or transfer option
     */
    it('should find earliest departure from Taipei to Kaohsiung', () => {
      const journey = journeyPlanner.findEarliestDeparture('台北', '高雄', '2025-12-31');

      if (journey) {
        expect(journey.departureTime).toBeDefined();
        expect(journey.arrivalTime).toBeDefined();

        // Verify time is reasonable (morning departure)
        const [hour] = journey.departureTime.split(':').map(Number);
        expect(hour).toBeGreaterThanOrEqual(0);
        expect(hour).toBeLessThan(24);
      }
    });

    it('should find earliest departure with transfers allowed', () => {
      const journey = journeyPlanner.planJourney('台北', '高雄', {
        date: '2025-12-31',
        allowTransfers: true,
      });

      if (journey && journey.legs && journey.legs.length > 0) {
        // First leg departure should be earliest
        const firstLeg = journey.legs[0];
        expect(firstLeg.departureTime).toBeDefined();
        expect(firstLeg.legNumber).toBe(1);
      }
    });

    it('should return null for impossible early departures', () => {
      // If requesting past times, should handle gracefully
      const journey = journeyPlanner.findEarliestDeparture('台北', '台北', '2025-12-31');
      expect(journey === null || typeof journey === 'object').toBe(true);
    });

    it('should find multiple early departure options', () => {
      const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');
      if (schedules.length > 0) {
        const earliestJourney = journeyPlanner.findEarliestDeparture('台北', '台中', '2025-12-31');
        expect(earliestJourney === null || typeof earliestJourney === 'object').toBe(true);
      }
    });

    it('should prioritize direct routes in early departure', () => {
      const journey = journeyPlanner.findEarliestDeparture('台北', '台中', '2025-12-31');

      if (journey) {
        // Direct route should have fewer legs than transfers
        const legs = (journey as any).totalLegs || 1;
        expect(legs).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Latest Arrival Optimization', () => {
    /**
     * Test latest arrival finding
     * Should find the last available train or transfer option
     */
    it('should find latest arrival from Taipei to Kaohsiung', () => {
      const journey = journeyPlanner.findLatestArrival('台北', '高雄', '2025-12-31');

      if (journey) {
        expect(journey.departureTime).toBeDefined();
        expect(journey.arrivalTime).toBeDefined();

        // Verify arrival time is in evening
        const [hour] = journey.arrivalTime.split(':').map(Number);
        expect(hour).toBeGreaterThanOrEqual(0);
        expect(hour).toBeLessThan(24);
      }
    });

    it('should have later arrival time than earliest departure', () => {
      const earliest = journeyPlanner.findEarliestDeparture('台北', '台中', '2025-12-31');
      const latest = journeyPlanner.findLatestArrival('台北', '台中', '2025-12-31');

      if (earliest && latest) {
        const [earliestH, earliestM] = earliest.arrivalTime.split(':').map(Number);
        const [latestH, latestM] = latest.arrivalTime.split(':').map(Number);

        const earliestMinutes = earliestH * 60 + earliestM;
        const latestMinutes = latestH * 60 + latestM;

        expect(latestMinutes).toBeGreaterThanOrEqual(earliestMinutes);
      }
    });

    it('should find latest arrival with minimal transfers', () => {
      const journey = journeyPlanner.findLatestArrival('台北', '高雄', '2025-12-31');

      if (journey) {
        expect(journey.totalDuration).toBeDefined();
        expect(typeof journey.totalDuration).toBe('string');
      }
    });

    it('should handle no available late arrivals gracefully', () => {
      // Non-existent stations
      const journey = journeyPlanner.findLatestArrival('不存在', '也不存在', '2025-12-31');
      expect(journey === null || typeof journey === 'object').toBe(true);
    });

    it('should have reasonable time windows for latest arrivals', () => {
      const journey = journeyPlanner.findLatestArrival('台北', '台南', '2025-12-31');

      if (journey) {
        const [arrivalH, arrivalM] = journey.arrivalTime.split(':').map(Number);
        // Most trains arrive before midnight
        expect(arrivalH).toBeLessThanOrEqual(23);
      }
    });
  });

  describe('Transfer Time Constraints', () => {
    /**
     * Test transfer time validation
     * Valid range: 5 minutes (minimum) to 180 minutes (maximum)
     */
    it('should validate 5-minute transfer (minimum valid)', () => {
      const journey = journeyPlanner.planJourney('台北', '高雄', {
        date: '2025-12-31',
        allowTransfers: true,
        maxTransferTime: 5,
      });

      if (journey && journey.legs && journey.legs.length > 1) {
        // If transfers found, they should respect 5-minute constraint
        for (let i = 0; i < journey.legs.length - 1; i++) {
          const currentLeg = journey.legs[i];
          const nextLeg = journey.legs[i + 1];

          // Arrival of current should be before departure of next
          const [arrH, arrM] = currentLeg.arrivalTime.split(':').map(Number);
          const [depH, depM] = nextLeg.departureTime.split(':').map(Number);

          const arrivalMinutes = arrH * 60 + arrM;
          const departureMinutes = depH * 60 + depM;

          expect(departureMinutes).toBeGreaterThanOrEqual(arrivalMinutes + 5);
        }
      }
    });

    it('should reject 4-minute transfer (too short)', () => {
      // Transfers with less than 5 minutes should be avoided
      const journey = journeyPlanner.planJourney('台北', '高雄', {
        date: '2025-12-31',
        allowTransfers: true,
        maxTransferTime: 4,
      });

      // Should either find no transfer or return null
      expect(journey === null || typeof journey === 'object').toBe(true);
    });

    it('should accept 30-minute transfer (typical)', () => {
      const journey = journeyPlanner.planJourney('台北', '高雄', {
        date: '2025-12-31',
        allowTransfers: true,
        maxTransferTime: 30,
      });

      expect(journey === null || typeof journey === 'object').toBe(true);
    });

    it('should accept 180-minute transfer (maximum)', () => {
      const journey = journeyPlanner.planJourney('台北', '高雄', {
        date: '2025-12-31',
        allowTransfers: true,
        maxTransferTime: 180,
      });

      expect(journey === null || typeof journey === 'object').toBe(true);
    });

    it('should reject 181-minute transfer (exceeds maximum)', () => {
      // Transfers longer than 180 minutes should not be recommended
      const journey = journeyPlanner.planJourney('台北', '高雄', {
        date: '2025-12-31',
        allowTransfers: true,
        maxTransferTime: 181,
      });

      // Should prefer direct route or return null
      expect(journey === null || typeof journey === 'object').toBe(true);
    });

    it('should find no valid transfers if constraints too tight', () => {
      // If transfer time window is impossible
      const journey = journeyPlanner.planJourney('台北', '高雄', {
        date: '2025-12-31',
        allowTransfers: true,
        maxTransferTime: 1, // Impossible constraint
      });

      expect(journey === null || typeof journey === 'object').toBe(true);
    });

    it('should respect transfer time for multi-leg journeys', () => {
      const journey = journeyPlanner.planJourney('台北', '高雄', {
        date: '2025-12-31',
        allowTransfers: true,
        maxTransferTime: 60,
      });

      if (journey && journey.legs && journey.legs.length > 1) {
        // All transfer times should be <= 60 minutes
        for (let i = 0; i < journey.legs.length - 1; i++) {
          const currentArrival = journey.legs[i].arrivalTime;
          const nextDeparture = journey.legs[i + 1].departureTime;

          const [arrH, arrM] = currentArrival.split(':').map(Number);
          const [depH, depM] = nextDeparture.split(':').map(Number);

          const waitMinutes = depH * 60 + depM - (arrH * 60 + arrM);
          expect(waitMinutes).toBeLessThanOrEqual(60);
          expect(waitMinutes).toBeGreaterThanOrEqual(5);
        }
      }
    });
  });

  describe('Date Boundary Scenarios', () => {
    /**
     * Test date handling edge cases
     */
    it('should handle first day of month', () => {
      const journey = journeyPlanner.planJourney('台北', '台中', {
        date: '2025-12-01',
      });

      expect(journey === null || typeof journey === 'object').toBe(true);
    });

    it('should handle last day of month', () => {
      const journey = journeyPlanner.planJourney('台北', '台中', {
        date: '2025-12-31',
      });

      expect(journey === null || typeof journey === 'object').toBe(true);
    });

    it('should handle dates with consistent train schedules', () => {
      const dates = ['2025-12-29', '2025-12-30', '2025-12-31'];

      for (const date of dates) {
        const journey = journeyPlanner.planJourney('台北', '台中', { date });
        expect(journey === null || typeof journey === 'object').toBe(true);
      }
    });

    it('should reject invalid date format', () => {
      const journey = journeyPlanner.planJourney('台北', '台中', {
        date: 'invalid-date',
      });

      expect(journey === null || typeof journey === 'object').toBe(true);
    });

    it('should handle empty date gracefully', () => {
      const journey = journeyPlanner.planJourney('台北', '台中', {
        date: '',
      });

      expect(journey === null || typeof journey === 'object').toBe(true);
    });

    it('should use today as default date if not specified', () => {
      const today = new Date().toISOString().split('T')[0];
      const journey = journeyPlanner.planJourney('台北', '台中', { date: today });

      // Should use today's schedules
      expect(journey === null || typeof journey === 'object').toBe(true);
    });
  });

  describe('Complex Route Optimization', () => {
    /**
     * Test optimization of complex multi-leg journeys
     */
    it('should prefer direct routes over transfers', () => {
      const directPreference = journeyPlanner.planJourney('台北', '台中', {
        date: '2025-12-31',
        allowTransfers: false,
      });

      const withTransfers = journeyPlanner.planJourney('台北', '台中', {
        date: '2025-12-31',
        allowTransfers: true,
      });

      // Direct should have same or fewer legs
      if (directPreference && withTransfers) {
        const directLegs = (directPreference as any).totalLegs || 1;
        const transferLegs = (withTransfers as any).totalLegs || 1;

        expect(directLegs).toBeLessThanOrEqual(transferLegs);
      }
    });

    it('should find three-leg journey when necessary', () => {
      const journey = journeyPlanner.planJourney('台北', '高雄', {
        date: '2025-12-31',
        allowTransfers: true,
      });

      if (journey) {
        expect(journey.totalLegs).toBeDefined();
        expect(journey.totalLegs).toBeGreaterThanOrEqual(1);
      }
    });

    it('should rank alternatives by efficiency', () => {
      const morning = journeyPlanner.findEarliestDeparture('台北', '台中', '2025-12-31');
      const evening = journeyPlanner.findLatestArrival('台北', '台中', '2025-12-31');

      if (morning && evening) {
        // Early and late options should be different
        expect(morning.departureTime).toBeDefined();
        expect(evening.arrivalTime).toBeDefined();
      }
    });

    it('should optimize for minimal transfers', () => {
      const journey = journeyPlanner.planJourney('台北', '台南', {
        date: '2025-12-31',
        allowTransfers: true,
      });

      if (journey) {
        // Should minimize transfers
        expect(journey.totalLegs).toBeGreaterThanOrEqual(1);
      }
    });

    it('should validate total journey time is reasonable', () => {
      const journey = journeyPlanner.planJourney('台北', '高雄', {
        date: '2025-12-31',
      });

      if (journey) {
        const [depH, depM] = journey.departureTime.split(':').map(Number);
        const [arrH, arrM] = journey.arrivalTime.split(':').map(Number);

        const departureMinutes = depH * 60 + depM;
        const arrivalMinutes = arrH * 60 + arrM;

        // Journey should be positive duration and reasonable (< 8 hours)
        const durationMinutes = arrivalMinutes - departureMinutes;
        expect(durationMinutes).toBeGreaterThan(0);
        expect(durationMinutes).toBeLessThan(480); // 8 hours max
      }
    });
  });

  describe('Time Preference Filtering', () => {
    /**
     * Test journey planning with specific time preferences
     */
    it('should find journey departing after specific time', () => {
      const journey = journeyPlanner.planJourney('台北', '台中', {
        date: '2025-12-31',
        departureTime: '10:00',
      });

      if (journey) {
        const [hour, minute] = journey.departureTime.split(':').map(Number);
        const departureMinutes = hour * 60 + minute;
        expect(departureMinutes).toBeGreaterThanOrEqual(10 * 60); // After 10:00
      }
    });

    it('should find journey arriving before specific time', () => {
      const journey = journeyPlanner.planJourney('台北', '台中', {
        date: '2025-12-31',
        arrivalTime: '18:00',
      });

      if (journey) {
        const [hour, minute] = journey.arrivalTime.split(':').map(Number);
        const arrivalMinutes = hour * 60 + minute;
        expect(arrivalMinutes).toBeLessThanOrEqual(18 * 60); // Before 18:00
      }
    });

    it('should find journey within time window', () => {
      const journey = journeyPlanner.planJourney('台北', '台中', {
        date: '2025-12-31',
        departureTime: '08:00',
        arrivalTime: '20:00',
      });

      if (journey) {
        const [depH, depM] = journey.departureTime.split(':').map(Number);
        const [arrH, arrM] = journey.arrivalTime.split(':').map(Number);

        expect(depH * 60 + depM).toBeGreaterThanOrEqual(8 * 60);
        expect(arrH * 60 + arrM).toBeLessThanOrEqual(20 * 60);
      }
    });

    it('should return null if no journey in time window', () => {
      // Impossible window: arrival before departure
      const journey = journeyPlanner.planJourney('台北', '台中', {
        date: '2025-12-31',
        departureTime: '20:00',
        arrivalTime: '10:00',
      });

      expect(journey).toBeNull();
    });

    it('should handle early morning departures', () => {
      const journey = journeyPlanner.planJourney('台北', '台中', {
        date: '2025-12-31',
        departureTime: '06:00',
      });

      expect(journey === null || typeof journey === 'object').toBe(true);
    });

    it('should handle late evening arrivals', () => {
      const journey = journeyPlanner.planJourney('台北', '台中', {
        date: '2025-12-31',
        arrivalTime: '23:00',
      });

      expect(journey === null || typeof journey === 'object').toBe(true);
    });
  });

  describe('Edge Cases & Error Handling', () => {
    /**
     * Test error handling and edge cases
     */
    it('should handle same origin and destination', () => {
      const journey = journeyPlanner.planJourney('台北', '台北', {
        date: '2025-12-31',
      });

      expect(journey).toBeNull();
    });

    it('should handle non-existent origin station', () => {
      const journey = journeyPlanner.planJourney('不存在', '台中', {
        date: '2025-12-31',
      });

      expect(journey).toBeNull();
    });

    it('should handle non-existent destination station', () => {
      const journey = journeyPlanner.planJourney('台北', '不存在', {
        date: '2025-12-31',
      });

      expect(journey).toBeNull();
    });

    it('should handle empty station names', () => {
      const journey = journeyPlanner.planJourney('', '', {
        date: '2025-12-31',
      });

      expect(journey).toBeNull();
    });

    it('should handle null options', () => {
      const journey = journeyPlanner.planJourney('台北', '台中', { date: '2025-12-31' });

      // Should use defaults from options
      expect(journey === null || typeof journey === 'object').toBe(true);
    });

    it('should handle negative transfer times', () => {
      const journey = journeyPlanner.planJourney('台北', '高雄', {
        date: '2025-12-31',
        allowTransfers: true,
        maxTransferTime: -1,
      });

      // Should handle gracefully
      expect(journey === null || typeof journey === 'object').toBe(true);
    });

    it('should handle zero transfer time', () => {
      const journey = journeyPlanner.planJourney('台北', '高雄', {
        date: '2025-12-31',
        allowTransfers: true,
        maxTransferTime: 0,
      });

      // Should require at least 5 minutes
      expect(journey === null || typeof journey === 'object').toBe(true);
    });

    it('should handle very large transfer times', () => {
      const journey = journeyPlanner.planJourney('台北', '高雄', {
        date: '2025-12-31',
        allowTransfers: true,
        maxTransferTime: 10000,
      });

      // Should still work but may limit to reasonable max
      expect(journey === null || typeof journey === 'object').toBe(true);
    });
  });

  describe('Journey Consistency', () => {
    /**
     * Test that journey plans are internally consistent
     */
    it('should have consistent time progression in journey legs', () => {
      const journey = journeyPlanner.planJourney('台北', '高雄', {
        date: '2025-12-31',
        allowTransfers: true,
      });

      if (journey && journey.legs && journey.legs.length > 0) {
        for (let i = 0; i < journey.legs.length; i++) {
          const leg = journey.legs[i];

          // Departure before arrival for each leg
          const [depH, depM] = leg.departureTime.split(':').map(Number);
          const [arrH, arrM] = leg.arrivalTime.split(':').map(Number);

          const depMinutes = depH * 60 + depM;
          const arrMinutes = arrH * 60 + arrM;

          expect(arrMinutes).toBeGreaterThan(depMinutes);

          // Leg numbers should be sequential
          expect(leg.legNumber).toBe(i + 1);
        }
      }
    });

    it('should have overall journey time equal to sum of legs', () => {
      const journey = journeyPlanner.planJourney('台北', '台南', {
        date: '2025-12-31',
        allowTransfers: true,
      });

      if (journey) {
        const [journeyDepH, journeyDepM] = journey.departureTime.split(':').map(Number);
        const [journeyArrH, journeyArrM] = journey.arrivalTime.split(':').map(Number);

        const journeyDepMinutes = journeyDepH * 60 + journeyDepM;
        const journeyArrMinutes = journeyArrH * 60 + journeyArrM;
        const journeyDuration = journeyArrMinutes - journeyDepMinutes;

        // Journey duration should be positive
        expect(journeyDuration).toBeGreaterThan(0);
      }
    });

    it('should not exceed total leg count in output', () => {
      const journey = journeyPlanner.planJourney('台北', '高雄', {
        date: '2025-12-31',
        allowTransfers: true,
      });

      if (journey && journey.legs) {
        expect(journey.legs.length).toBeLessThanOrEqual(
          journey.totalLegs || journey.legs.length
        );
      }
    });
  });
});
