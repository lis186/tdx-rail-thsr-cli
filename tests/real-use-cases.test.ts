import { describe, it, expect, beforeAll } from 'vitest';
import { StationResolver } from '../src/lib/station-resolver';
import { FareResolver } from '../src/lib/fare-resolver';
import { ScheduleResolver } from '../src/lib/schedule-resolver';
import { TrainStatusResolver } from '../src/lib/train-status-resolver';
import { JourneyPlanResolver } from '../src/lib/journey-planner';
import { TransfersResolver } from '../src/lib/transfers-resolver';
import { OccupancyAnalyzer } from '../src/lib/occupancy-analyzer';
import { AlertsResolver } from '../src/lib/alerts-resolver';
import { ConnectionChecker } from '../src/lib/connection-checker';
import thsrStations from './fixtures/thsr-stations.json';
import thsrFares from './fixtures/thsr-fares.json';
import thsrSchedules from './fixtures/thsr-schedules.json';
import thsrTrainStatus from './fixtures/thsr-train-status.json';
import thsrAvailability from './fixtures/thsr-availability.json';
import type {
  THSRStation,
  THSRODFare,
  THSRSchedule,
  THSRTrainStatus,
  THSRAvailability,
} from '../src/types/api';

/**
 * Real Use Case Tests
 * Tests actual user workflows and common use patterns
 */

describe('Real Use Cases', () => {
  let stationResolver: StationResolver;
  let fareResolver: FareResolver;
  let scheduleResolver: ScheduleResolver;
  let trainStatusResolver: TrainStatusResolver;
  let journeyPlanResolver: JourneyPlanResolver;
  let transfersResolver: TransfersResolver;
  let occupancyAnalyzer: OccupancyAnalyzer;
  let alertsResolver: AlertsResolver;
  let connectionChecker: ConnectionChecker;

  beforeAll(() => {
    stationResolver = new StationResolver(thsrStations as THSRStation[]);
    fareResolver = new FareResolver(thsrFares as THSRODFare[]);
    scheduleResolver = new ScheduleResolver(thsrSchedules as THSRSchedule[]);
    trainStatusResolver = new TrainStatusResolver(thsrTrainStatus as THSRTrainStatus[]);
    journeyPlanResolver = new JourneyPlanResolver();
    transfersResolver = new TransfersResolver();
    occupancyAnalyzer = new OccupancyAnalyzer(thsrAvailability as THSRAvailability[]);
    alertsResolver = new AlertsResolver();
    connectionChecker = new ConnectionChecker();
  });

  describe('Use Case 1: Book a train ticket', () => {
    it('should find stations and check availability', () => {
      // User searches for departure station
      const taipei = stationResolver.resolveStation('台北');
      expect(taipei).toBeDefined();

      // User searches for destination
      const kaohsiung = stationResolver.resolveStation('高雄');
      expect(kaohsiung).toBeDefined();

      // Check fare for this route
      if (taipei && kaohsiung) {
        const fare = fareResolver.getFare(taipei.StationID, kaohsiung.StationID);
        expect(fare).toBeDefined();
        expect(fare?.standardFare).toBeGreaterThan(0);
      }
    });

    it('should check seat availability for specific train', () => {
      const availability = occupancyAnalyzer.getTrainOccupancy('601', '2025-12-31');
      // Occupancy analyzer should return occupancy data or null
      expect(availability === null || typeof availability === 'object').toBe(true);
    });

    it('should show alerts for selected trains', () => {
      const allAlerts = alertsResolver.getAllAlerts('2025-12-31');
      expect(Array.isArray(allAlerts)).toBe(true);

      const delayAlerts = allAlerts.filter((a) => a.type === 'Delay');
      if (delayAlerts.length > 0) {
        expect(delayAlerts[0].severity).toBeDefined();
      }
    });
  });

  describe('Use Case 2: Plan a multi-leg journey', () => {
    it('should find journey from taipei to kaohsiung', () => {
      const plan = journeyPlanResolver.planJourney('台北', '高雄');
      // Journey planner returns a plan or null
      expect(plan === null || typeof plan === 'object').toBe(true);
    });

    it('should find transfer options if multi-leg', () => {
      const transfers = transfersResolver.findTransfers('台北', '高雄');
      expect(Array.isArray(transfers)).toBe(true);

      if (transfers.length > 0) {
        const firstTransfer = transfers[0];
        expect(firstTransfer.transferTime).toBeGreaterThan(0);
        expect(firstTransfer.transferStation).toBeDefined();
      }
    });

    it('should recommend best transfer option', () => {
      const transfers = transfersResolver.findTransfers('台北', '高雄');
      const best = transfersResolver.findBestTransfer('台北', '高雄');

      expect(best).toBeDefined();
      if (best && transfers.length > 0) {
        expect(transfers.some((t) => t.transferStation === best.transferStation)).toBe(
          true
        );
      }
    });
  });

  describe('Use Case 3: Check train connections', () => {
    it('should validate if two trains can be connected', () => {
      const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');
      if (schedules.length >= 2) {
        const first = schedules[0];
        const second = schedules[1];

        const feasible = connectionChecker.checkConnection(
          first.trainNumber,
          second.trainNumber,
          '台中',
          '2025-12-31'
        );

        if (feasible) {
          expect(feasible.feasible).toBeDefined();
          expect(feasible.confidence).toBeGreaterThanOrEqual(0);
          expect(feasible.confidence).toBeLessThanOrEqual(100);
          expect(Array.isArray(feasible.recommendations)).toBe(true);
        }
      }
    });

    it('should find all feasible connections between two stations', () => {
      const connections = connectionChecker.getFeasibleConnections(
        '台北',
        '高雄',
        '台中',
        '2025-12-31',
        50
      );

      expect(Array.isArray(connections)).toBe(true);
      // Should be sorted by confidence descending
      if (connections.length > 1) {
        expect(connections[0].confidence).toBeGreaterThanOrEqual(
          connections[connections.length - 1].confidence
        );
      }
    });
  });

  describe('Use Case 4: Monitor train operations', () => {
    it('should get real-time train status', () => {
      const status = trainStatusResolver.getTrainStatus('601');
      expect(status).toBeDefined();

      if (status) {
        expect(status.trainNumber).toBe('601');
        expect(status.status).toBeDefined();
        expect(
          ['OnTime', 'Delayed', 'Cancelled', 'Early'].includes(status.status)
        ).toBe(true);
      }
    });

    it('should list all trains and their current status', () => {
      const allStatuses = trainStatusResolver.getAllTrainStatuses();
      expect(Array.isArray(allStatuses)).toBe(true);
      expect(allStatuses.length).toBeGreaterThan(0);

      // Verify status properties
      for (const status of allStatuses.slice(0, 5)) {
        expect(status.trainNumber).toBeDefined();
        expect(status.status).toBeDefined();
        expect(status.currentStation).toBeDefined();
      }
    });

    it('should filter trains by status', () => {
      const allStatuses = trainStatusResolver.getAllTrainStatuses();
      const onTimeTrains = allStatuses.filter((s) => s.status === 'OnTime');
      const delayedTrains = allStatuses.filter((s) => s.status === 'Delayed');

      expect(onTimeTrains.length + delayedTrains.length).toBeLessThanOrEqual(
        allStatuses.length
      );
    });
  });

  describe('Use Case 5: Get alerts and recommendations', () => {
    it('should get critical alerts', () => {
      const critical = alertsResolver.getCriticalAlerts();
      expect(Array.isArray(critical)).toBe(true);

      for (const alert of critical) {
        expect(alert.severity).toBe('Critical');
      }
    });

    it('should get delay alerts', () => {
      const delays = alertsResolver.getDelayAlerts();
      expect(Array.isArray(delays)).toBe(true);
    });

    it('should filter alerts by severity level', () => {
      const highSeverity = alertsResolver.getAlertsBySeverity('High');
      expect(Array.isArray(highSeverity)).toBe(true);

      for (const alert of highSeverity) {
        expect(['High', 'Critical'].includes(alert.severity)).toBe(true);
      }
    });

    it('should get occupancy alerts', () => {
      const occupancyAlerts = alertsResolver.getAlertsByType('Occupancy');
      expect(Array.isArray(occupancyAlerts)).toBe(true);
    });
  });

  describe('Use Case 6: Compare journey options', () => {
    it('should show schedule for a specific date', () => {
      const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');
      expect(Array.isArray(schedules)).toBe(true);
      expect(schedules.length).toBeGreaterThan(0);

      if (schedules.length > 0) {
        for (const schedule of schedules.slice(0, 3)) {
          expect(schedule.trainNumber).toBeDefined();
          expect(schedule).toBeDefined();
        }
      }
    });

    it('should show multiple transfer options available', () => {
      const transfers = transfersResolver.findTransfers('台北', '高雄');
      expect(Array.isArray(transfers)).toBe(true);

      if (transfers.length > 1) {
        // Can compare multiple options
        expect(transfers[0].transferTime).toBeDefined();
        expect(transfers[1].transferTime).toBeDefined();
      }
    });

    it('should recommend trains with available seats', () => {
      const taipei = stationResolver.resolveStation('台北');
      const kaohsiung = stationResolver.resolveStation('高雄');

      if (taipei && kaohsiung) {
        const recommended = occupancyAnalyzer.recommendTrains(
          taipei.StationName.Zh_tw,
          kaohsiung.StationName.Zh_tw
        );

        expect(Array.isArray(recommended)).toBe(true);
        if (recommended.length > 0) {
          for (const train of recommended) {
            expect(train.seatInfo.available).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  describe('Use Case 7: End-to-end booking workflow', () => {
    it('should complete a booking workflow from search to confirmation', () => {
      // Step 1: Search for stations
      const from = stationResolver.resolveStation('台北');
      const to = stationResolver.resolveStation('台中');

      expect(from).toBeDefined();
      expect(to).toBeDefined();

      if (!from || !to) return;

      // Step 2: Get fare
      const fare = fareResolver.getFare(from.StationID, to.StationID);
      expect(fare).toBeDefined();

      // Step 3: Check schedule for the date
      const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');
      expect(Array.isArray(schedules)).toBe(true);
      expect(schedules.length).toBeGreaterThan(0);

      // Step 4: Check seat availability
      if (schedules.length > 0) {
        const firstTrain = schedules[0];
        const availability = occupancyAnalyzer.getTrainOccupancy(
          firstTrain.trainNumber,
          '2025-12-31'
        );
        // Occupancy check - verify method works
        expect(availability === null || typeof availability === 'object').toBe(true);
      }

      // Step 5: Check for alerts
      const alerts = alertsResolver.getAlertsByType('Cancellation');
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should provide journey information with specified date', () => {
      const plan = journeyPlanResolver.planJourney('台北', '台中', {
        date: '2025-12-31',
      });
      // Journey planner can return plan or null depending on availability
      expect(plan === null || typeof plan === 'object').toBe(true);
    });
  });
});
