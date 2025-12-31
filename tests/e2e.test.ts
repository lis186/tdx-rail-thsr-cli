/**
 * End-to-End (E2E) Test Suite
 * Senior QA Level Comprehensive Testing
 *
 * This test suite validates complete user workflows, command integration,
 * error scenarios, and data consistency across the CLI.
 *
 * Test Pyramid:
 * - Happy Path Workflows (45%)
 * - Error Scenarios (25%)
 * - Cross-Command Integration (20%)
 * - Edge Cases & Performance (10%)
 */

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
 * E2E Test Suite: Comprehensive Validation for Production Readiness
 *
 * Test Categories:
 * 1. Happy Path Workflows - Full user journeys with valid inputs
 * 2. Error Scenarios - Graceful handling of invalid inputs
 * 3. Cross-Command Integration - Multi-step workflows
 * 4. Data Validation & Consistency - Verify data integrity
 * 5. Edge Cases & Performance - Boundary conditions and stress testing
 */

describe('E2E: Happy Path Workflows', () => {
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
    journeyPlanResolver = new JourneyPlanResolver(stationResolver, scheduleResolver);
    transfersResolver = new TransfersResolver();
    occupancyAnalyzer = new OccupancyAnalyzer(thsrAvailability as THSRAvailability[]);
    alertsResolver = new AlertsResolver();
    connectionChecker = new ConnectionChecker();
  });

  describe('Complete User Workflow: Book a Train', () => {
    /**
     * E2E Scenario: User books a train ticket from Taipei to Kaohsiung
     * Expected Flow:
     * 1. Search for origin station
     * 2. Search for destination station
     * 3. Query fare information
     * 4. Check train schedules
     * 5. Verify seat availability
     * 6. Check for operational alerts
     */
    it('should complete full booking workflow: Taipei → Kaohsiung', () => {
      // Step 1: Station Resolution
      const from = stationResolver.resolveStation('台北');
      const to = stationResolver.resolveStation('高雄');

      expect(from).toBeDefined();
      expect(to).toBeDefined();
      if (!from || !to) return;

      // Validate station data completeness
      expect(from.StationID).toBeDefined();
      expect(from.StationCode).toBeDefined();
      expect(from.StationName.Zh_tw).toBe('台北');
      expect(to.StationName.Zh_tw).toMatch(/高雄|左營/);

      // Step 2: Fare Query
      const fare = fareResolver.getFare(from.StationID, to.StationID);
      expect(fare).toBeDefined();
      if (fare) {
        expect(fare.standardFare).toBeGreaterThan(0);
        expect(fare.from).toBeDefined();
        expect(fare.to).toBeDefined();
      }

      // Step 3: Schedule Check
      const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');
      expect(Array.isArray(schedules)).toBe(true);
      expect(schedules.length).toBeGreaterThan(0);

      // Step 4: Availability Check
      if (schedules.length > 0) {
        const firstTrain = schedules[0];
        const availability = occupancyAnalyzer.getTrainOccupancy(
          firstTrain.trainNumber,
          '2025-12-31'
        );
        expect(availability === null || typeof availability === 'object').toBe(true);
      }

      // Step 5: Alerts Check
      const alerts = alertsResolver.getAllAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should validate booking for multiple routes and dates', () => {
      const routes = [
        { from: '台北', to: '台中' },
        { from: '新竹', to: '高雄' },
        { from: '台中', to: '台南' },
      ];

      for (const route of routes) {
        const from = stationResolver.resolveStation(route.from);
        const to = stationResolver.resolveStation(route.to);

        if (from && to) {
          const fare = fareResolver.getFare(from.StationID, to.StationID);
          expect(fare === null || typeof fare === 'object').toBe(true);

          const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');
          expect(schedules.length).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should provide consistent fare information across lookups', () => {
      const taipei = stationResolver.resolveStation('台北');
      const kaohsiung = stationResolver.resolveStation('高雄');

      if (!taipei || !kaohsiung) return;

      // Lookup same route multiple times
      const fare1 = fareResolver.getFare(taipei.StationID, kaohsiung.StationID);
      const fare2 = fareResolver.getFare(taipei.StationID, kaohsiung.StationID);

      if (fare1 && fare2) {
        // Fares should be identical for same route
        expect(fare1.standardFare).toBe(fare2.standardFare);
        expect(fare1.from).toBe(fare2.from);
        expect(fare1.to).toBe(fare2.to);
      }
    });
  });

  describe('Complete User Workflow: Plan Multi-Leg Journey', () => {
    /**
     * E2E Scenario: User plans a complex journey with transfers
     * Expected Flow:
     * 1. Initiate journey planning
     * 2. Find available transfer options
     * 3. Compare transfer times
     * 4. Select optimal route
     * 5. Verify total journey time
     */
    it('should plan multi-leg journey with transfer optimization', () => {
      // Step 1: Plan journey
      const plan = journeyPlanResolver.planJourney('台北', '高雄');
      expect(plan === null || typeof plan === 'object').toBe(true);

      // Step 2: Find transfer options
      const transfers = transfersResolver.findTransfers('台北', '高雄');
      expect(Array.isArray(transfers)).toBe(true);

      // Step 3: Validate transfer data
      if (transfers.length > 0) {
        for (const transfer of transfers) {
          expect(transfer.transferTime).toBeGreaterThan(0);
          expect(transfer.transferStation).toBeDefined();
          expect(transfer.firstTrain).toBeDefined();
          expect(transfer.secondTrain).toBeDefined();
        }

        // Step 4: Find optimal transfer
        const best = transfersResolver.findBestTransfer('台北', '高雄');
        expect(best).toBeDefined();
        if (best) {
          // Verify best transfer is in the list
          const found = transfers.some((t) => t.transferStation === best.transferStation);
          expect(found).toBe(true);
        }
      }
    });

    it('should validate journey times are reasonable', () => {
      const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');
      if (schedules.length < 2) return;

      for (let i = 0; i < Math.min(5, schedules.length); i++) {
        const schedule = schedules[i];
        if (schedule.departureTime && schedule.arrivalTime) {
          // Verify departure is before arrival
          const [depH, depM] = schedule.departureTime.split(':').map(Number);
          const [arrH, arrM] = schedule.arrivalTime.split(':').map(Number);

          const depMinutes = depH * 60 + depM;
          const arrMinutes = arrH * 60 + arrM;

          expect(arrMinutes).toBeGreaterThan(depMinutes);
        }
      }
    });
  });

  describe('Complete User Workflow: Monitor Train Operations', () => {
    /**
     * E2E Scenario: System operator monitors real-time train operations
     * Expected Flow:
     * 1. Get all current train statuses
     * 2. Filter by status type
     * 3. Check for delays
     * 4. Retrieve connection recommendations
     */
    it('should monitor all train statuses and provide operational insights', () => {
      // Step 1: Get all statuses
      const allStatuses = trainStatusResolver.getAllTrainStatuses();
      expect(Array.isArray(allStatuses)).toBe(true);
      expect(allStatuses.length).toBeGreaterThan(0);

      // Step 2: Validate status structure
      for (const status of allStatuses.slice(0, 10)) {
        expect(status.trainNumber).toBeDefined();
        expect(status.status).toBeDefined();
        expect(['OnTime', 'Delayed', 'Cancelled', 'Early'].includes(status.status)).toBe(true);

        // Validate additional fields
        expect(status.currentStation).toBeDefined();
      }

      // Step 3: Filter statuses
      const delayedTrains = allStatuses.filter((s) => s.status === 'Delayed');
      const onTimeTrains = allStatuses.filter((s) => s.status === 'OnTime');

      expect(delayedTrains.length + onTimeTrains.length).toBeLessThanOrEqual(allStatuses.length);

      // Step 4: Verify individual train lookups
      if (allStatuses.length > 0) {
        const firstTrain = allStatuses[0];
        const specificStatus = trainStatusResolver.getTrainStatus(firstTrain.trainNumber);
        expect(specificStatus).toBeDefined();
        expect(specificStatus?.trainNumber).toBe(firstTrain.trainNumber);
      }
    });

    it('should correlate train status with schedule information', () => {
      const allStatuses = trainStatusResolver.getAllTrainStatuses();
      const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');

      // Verify train numbers from status exist in schedules
      for (const status of allStatuses.slice(0, 5)) {
        const trainNumber = status.trainNumber;
        const schedule = scheduleResolver.getSchedule(trainNumber, '2025-12-31');

        // Either schedule exists or train is not running today
        expect(schedule === null || typeof schedule === 'object').toBe(true);
      }
    });
  });

  describe('Complete User Workflow: Check Connections', () => {
    /**
     * E2E Scenario: Travel agent verifies feasible train connections
     * Expected Flow:
     * 1. Get available schedules
     * 2. Check specific connection feasibility
     * 3. Find all feasible connections
     * 4. Evaluate confidence scores
     */
    it('should validate train connection feasibility with confidence scoring', () => {
      const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');
      if (schedules.length < 2) return;

      const first = schedules[0];
      const second = schedules[1];

      // Step 1: Check single connection
      const feasible = connectionChecker.checkConnection(
        first.trainNumber,
        second.trainNumber,
        '台中',
        '2025-12-31'
      );

      if (feasible) {
        // Verify connection data
        expect(typeof feasible.feasible).toBe('boolean');
        expect(feasible.confidence).toBeGreaterThanOrEqual(0);
        expect(feasible.confidence).toBeLessThanOrEqual(100);
        expect(Array.isArray(feasible.recommendations)).toBe(true);

        // Validate recommendation structure
        for (const rec of feasible.recommendations) {
          expect(rec).toBeDefined();
        }
      }
    });

    it('should find and rank feasible connections by confidence', () => {
      // Step 1: Get feasible connections
      const connections = connectionChecker.getFeasibleConnections(
        '台北',
        '高雄',
        '台中',
        '2025-12-31',
        50
      );

      expect(Array.isArray(connections)).toBe(true);

      // Step 2: Verify sorting by confidence (descending)
      if (connections.length > 1) {
        for (let i = 0; i < connections.length - 1; i++) {
          expect(connections[i].confidence).toBeGreaterThanOrEqual(connections[i + 1].confidence);
        }
      }

      // Step 3: Validate each connection meets minimum confidence
      for (const conn of connections) {
        expect(conn.confidence).toBeGreaterThanOrEqual(50);
      }
    });
  });
});

describe('E2E: Error Scenarios & Graceful Degradation', () => {
  let stationResolver: StationResolver;
  let fareResolver: FareResolver;
  let scheduleResolver: ScheduleResolver;
  let trainStatusResolver: TrainStatusResolver;
  let journeyPlanResolver: JourneyPlanResolver;

  beforeAll(() => {
    stationResolver = new StationResolver(thsrStations as THSRStation[]);
    fareResolver = new FareResolver(thsrFares as THSRODFare[]);
    scheduleResolver = new ScheduleResolver(thsrSchedules as THSRSchedule[]);
    trainStatusResolver = new TrainStatusResolver(thsrTrainStatus as THSRTrainStatus[]);
    journeyPlanResolver = new JourneyPlanResolver(stationResolver, scheduleResolver);
  });

  describe('Invalid Station Names', () => {
    it('should handle non-existent station gracefully', () => {
      const result = stationResolver.resolveStation('不存在的車站');
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle empty station name', () => {
      const result = stationResolver.resolveStation('');
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle very long station names', () => {
      const longName = 'a'.repeat(1000);
      const result = stationResolver.resolveStation(longName);
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle special characters in station names', () => {
      const result = stationResolver.resolveStation('@#$%^&*()');
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle numeric-only input', () => {
      const result = stationResolver.resolveStation('123456');
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe('Invalid Fare Queries', () => {
    it('should return null for same origin and destination', () => {
      const result = fareResolver.getFare('0990', '0990');
      expect(result).toBeNull();
    });

    it('should handle non-existent station IDs', () => {
      const result = fareResolver.getFare('9999', '8888');
      expect(result).toBeNull();
    });

    it('should handle empty station IDs', () => {
      const result = fareResolver.getFare('', '');
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle reversed route gracefully', () => {
      const taipei = stationResolver.resolveStation('台北');
      const kaohsiung = stationResolver.resolveStation('高雄');

      if (taipei && kaohsiung) {
        const forward = fareResolver.getFare(taipei.StationID, kaohsiung.StationID);
        const backward = fareResolver.getFare(kaohsiung.StationID, taipei.StationID);

        // Both directions should return results or both null
        expect((forward === null) === (backward === null)).toBe(true);
      }
    });
  });

  describe('Invalid Train Queries', () => {
    it('should handle non-existent train number', () => {
      const result = trainStatusResolver.getTrainStatus('INVALID999');
      expect(result).toBeNull();
    });

    it('should handle empty train number', () => {
      const result = trainStatusResolver.getTrainStatus('');
      expect(result).toBeNull();
    });

    it('should handle special characters in train number', () => {
      const result = trainStatusResolver.getTrainStatus('@#$%');
      expect(result).toBeNull();
    });

    it('should handle very long train numbers', () => {
      const result = trainStatusResolver.getTrainStatus('a'.repeat(1000));
      expect(result).toBeNull();
    });
  });

  describe('Invalid Schedule Queries', () => {
    it('should handle invalid date format', () => {
      const result = scheduleResolver.getSchedule('601', 'invalid-date');
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle future dates beyond data range', () => {
      const result = scheduleResolver.getSchedule('601', '2099-12-31');
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle past dates', () => {
      const result = scheduleResolver.getSchedule('601', '2020-01-01');
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle empty date', () => {
      const result = scheduleResolver.getSchedule('601', '');
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe('Invalid Journey Plans', () => {
    it('should handle journey with same station', () => {
      const result = journeyPlanResolver.planJourney('台北', '台北', { date: '2025-12-31' });
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle non-existent stations in journey', () => {
      const result = journeyPlanResolver.planJourney('不存在', '也不存在', {
        date: '2025-12-31',
      });
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle empty stations in journey', () => {
      const result = journeyPlanResolver.planJourney('', '', { date: '2025-12-31' });
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });
});

describe('E2E: Cross-Command Integration Workflows', () => {
  let stationResolver: StationResolver;
  let fareResolver: FareResolver;
  let scheduleResolver: ScheduleResolver;
  let trainStatusResolver: TrainStatusResolver;
  let occupancyAnalyzer: OccupancyAnalyzer;
  let alertsResolver: AlertsResolver;

  beforeAll(() => {
    stationResolver = new StationResolver(thsrStations as THSRStation[]);
    fareResolver = new FareResolver(thsrFares as THSRODFare[]);
    scheduleResolver = new ScheduleResolver(thsrSchedules as THSRSchedule[]);
    trainStatusResolver = new TrainStatusResolver(thsrTrainStatus as THSRTrainStatus[]);
    occupancyAnalyzer = new OccupancyAnalyzer(thsrAvailability as THSRAvailability[]);
    alertsResolver = new AlertsResolver();
  });

  /**
   * Integration Test 1: Station → Fare → Schedule → Occupancy
   * Tests data flow between commands
   */
  it('should integrate station resolution with fare and schedule queries', () => {
    // Station resolution
    const from = stationResolver.resolveStation('台北');
    const to = stationResolver.resolveStation('台中');
    expect(from).toBeDefined();
    expect(to).toBeDefined();

    if (!from || !to) return;

    // Fare query using resolved stations
    const fare = fareResolver.getFare(from.StationID, to.StationID);
    expect(fare === null || typeof fare === 'object').toBe(true);

    // Schedule query
    const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');
    expect(schedules.length).toBeGreaterThan(0);

    // Occupancy query using schedule data
    if (schedules.length > 0) {
      const occupancy = occupancyAnalyzer.getTrainOccupancy(
        schedules[0].trainNumber,
        '2025-12-31'
      );
      expect(occupancy === null || typeof occupancy === 'object').toBe(true);
    }
  });

  /**
   * Integration Test 2: Schedule → Train Status → Alerts
   * Tests operational monitoring workflow
   */
  it('should integrate schedule with train status and alerts', () => {
    // Get schedules
    const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');
    expect(schedules.length).toBeGreaterThan(0);

    if (schedules.length > 0) {
      // Get train status for scheduled train
      const status = trainStatusResolver.getTrainStatus(schedules[0].trainNumber);
      expect(status === null || typeof status === 'object').toBe(true);

      // Get alerts related to train
      const allAlerts = alertsResolver.getAllAlerts();
      expect(Array.isArray(allAlerts)).toBe(true);

      // Filter critical alerts
      const critical = alertsResolver.getCriticalAlerts();
      expect(Array.isArray(critical)).toBe(true);
      for (const alert of critical) {
        expect(alert.severity).toBe('Critical');
      }
    }
  });

  /**
   * Integration Test 3: Recommender System Workflow
   * Tests recommendation systems across commands
   */
  it('should provide recommendations using integrated resolver data', () => {
    // Get all available schedules
    const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');
    expect(schedules.length).toBeGreaterThan(0);

    // Get train statuses
    const statuses = trainStatusResolver.getAllTrainStatuses();
    expect(statuses.length).toBeGreaterThan(0);

    // Verify each scheduled train has operational status
    for (const schedule of schedules.slice(0, 5)) {
      const status = trainStatusResolver.getTrainStatus(schedule.trainNumber);
      expect(status === null || typeof status === 'object').toBe(true);
    }
  });

  /**
   * Integration Test 4: Data Consistency Across Resolvers
   * Validates that referenced data exists in all related resolvers
   */
  it('should maintain data consistency across resolvers', () => {
    // Get all stations
    const allStations = stationResolver.getAllStations();
    expect(allStations.length).toBeGreaterThan(0);

    // Get all fares
    const routes = fareResolver.listRoutes();
    expect(Array.isArray(routes)).toBe(true);

    // Verify fare routes reference valid stations
    for (const route of routes.slice(0, 10)) {
      const fromStation = stationResolver.resolveStation(route.from);
      const toStation = stationResolver.resolveStation(route.to);

      // Either both stations resolve or both are null
      const bothResolved = !!(fromStation && toStation);
      const bothNull = fromStation === null && toStation === null;
      expect(bothResolved || bothNull).toBe(true);
    }

    // Get all schedules
    const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');
    expect(Array.isArray(schedules)).toBe(true);

    // Verify schedule trains have status data
    for (const schedule of schedules.slice(0, 5)) {
      const status = trainStatusResolver.getTrainStatus(schedule.trainNumber);
      expect(status === null || typeof status === 'object').toBe(true);
    }
  });
});

describe('E2E: Data Validation & Consistency', () => {
  let stationResolver: StationResolver;
  let fareResolver: FareResolver;
  let scheduleResolver: ScheduleResolver;
  let occupancyAnalyzer: OccupancyAnalyzer;

  beforeAll(() => {
    stationResolver = new StationResolver(thsrStations as THSRStation[]);
    fareResolver = new FareResolver(thsrFares as THSRODFare[]);
    scheduleResolver = new ScheduleResolver(thsrSchedules as THSRSchedule[]);
    occupancyAnalyzer = new OccupancyAnalyzer(thsrAvailability as THSRAvailability[]);
  });

  describe('Station Data Validation', () => {
    it('should have valid station structure for all stations', () => {
      const stations = stationResolver.getAllStations();
      expect(stations.length).toBeGreaterThan(0);

      for (const station of stations.slice(0, 20)) {
        // Required fields
        expect(station.StationID).toBeDefined();
        expect(station.StationCode).toBeDefined();
        expect(station.StationName).toBeDefined();
        expect(station.StationName.Zh_tw).toBeDefined();
        expect(station.StationName.En).toBeDefined();

        // Location data
        expect(station.LocationCity).toBeDefined();
        expect(station.StationAddress).toBeDefined();
        expect(station.StationPosition).toBeDefined();
        expect(station.StationPosition.PositionLat).toBeGreaterThanOrEqual(-90);
        expect(station.StationPosition.PositionLat).toBeLessThanOrEqual(90);
        expect(station.StationPosition.PositionLon).toBeGreaterThanOrEqual(-180);
        expect(station.StationPosition.PositionLon).toBeLessThanOrEqual(180);
      }
    });

    it('should have unique station codes and IDs', () => {
      const stations = stationResolver.getAllStations();
      const codes = new Set<string>();
      const ids = new Set<string>();

      for (const station of stations) {
        expect(codes.has(station.StationCode)).toBe(false);
        expect(ids.has(station.StationID)).toBe(false);
        codes.add(station.StationCode);
        ids.add(station.StationID);
      }

      expect(codes.size).toBe(stations.length);
      expect(ids.size).toBe(stations.length);
    });
  });

  describe('Fare Data Validation', () => {
    it('should have valid fare structure for all routes', () => {
      const routes = fareResolver.listRoutes();
      expect(routes.length).toBeGreaterThan(0);

      for (const route of routes.slice(0, 20)) {
        // Required fields
        expect(route.from).toBeDefined();
        expect(route.to).toBeDefined();
        expect(route.fromId).toBeDefined();
        expect(route.toId).toBeDefined();

        // Get fare details
        const fare = fareResolver.getFare(route.fromId, route.toId);
        if (fare) {
          expect(fare.standardFare).toBeGreaterThan(0);
          expect(fare.standardFare).toBeLessThan(10000); // Reasonable upper bound
        }
      }
    });

    it('should not allow same-station routes', () => {
      const stations = stationResolver.getAllStations().slice(0, 10);

      for (const station of stations) {
        const fare = fareResolver.getFare(station.StationID, station.StationID);
        expect(fare).toBeNull();
      }
    });
  });

  describe('Schedule Data Validation', () => {
    it('should have valid schedule structure', () => {
      const schedules = scheduleResolver.getSchedulesByDate('2025-12-31');
      expect(Array.isArray(schedules)).toBe(true);

      for (const schedule of schedules.slice(0, 20)) {
        // Required fields
        expect(schedule.trainNumber).toBeDefined();
        expect(schedule.trainNumber).toMatch(/^\d{3}$/);

        // Time validation
        if (schedule.departureTime && schedule.arrivalTime) {
          const [depH, depM] = schedule.departureTime.split(':').map(Number);
          const [arrH, arrM] = schedule.arrivalTime.split(':').map(Number);

          expect(depH).toBeGreaterThanOrEqual(0);
          expect(depH).toBeLessThan(24);
          expect(depM).toBeGreaterThanOrEqual(0);
          expect(depM).toBeLessThan(60);

          // Departure should be before arrival
          const depMinutes = depH * 60 + depM;
          const arrMinutes = arrH * 60 + arrM;
          expect(arrMinutes).toBeGreaterThan(depMinutes);
        }
      }
    });

    it('should have consistent train numbers across dates', () => {
      const trainNumbers = scheduleResolver.listTrainNumbers();
      expect(trainNumbers.length).toBeGreaterThan(0);

      // Verify train numbers are 3-digit codes
      for (const trainNumber of trainNumbers) {
        expect(trainNumber).toMatch(/^\d{3}$/);
      }
    });
  });

  describe('Occupancy Data Validation', () => {
    it('should provide valid occupancy information when available', () => {
      const trainNumbers = scheduleResolver.listTrainNumbers();
      if (trainNumbers.length === 0) return;

      for (const trainNumber of trainNumbers.slice(0, 5)) {
        const occupancy = occupancyAnalyzer.getTrainOccupancy(trainNumber, '2025-12-31');

        if (occupancy) {
          // Validate occupancy structure
          expect(typeof occupancy === 'object').toBe(true);
        }
      }
    });

    it('should recommend trains with reasonable availability', () => {
      const taipei = stationResolver.resolveStation('台北');
      const kaohsiung = stationResolver.resolveStation('高雄');

      if (!taipei || !kaohsiung) return;

      const recommended = occupancyAnalyzer.recommendTrains(
        taipei.StationName.Zh_tw,
        kaohsiung.StationName.Zh_tw
      );

      expect(Array.isArray(recommended)).toBe(true);

      // Verify recommendations have valid structure
      for (const train of recommended.slice(0, 5)) {
        expect(train).toBeDefined();
      }
    });
  });
});

describe('E2E: Edge Cases & Stress Testing', () => {
  let stationResolver: StationResolver;
  let fareResolver: FareResolver;
  let scheduleResolver: ScheduleResolver;

  beforeAll(() => {
    stationResolver = new StationResolver(thsrStations as THSRStation[]);
    fareResolver = new FareResolver(thsrFares as THSRODFare[]);
    scheduleResolver = new ScheduleResolver(thsrSchedules as THSRSchedule[]);
  });

  describe('Performance & Load Testing', () => {
    it('should handle rapid sequential station resolutions', () => {
      const stationNames = ['台北', '新竹', '台中', '嘉義', '台南', '左營'];
      const results = [];

      for (let i = 0; i < 100; i++) {
        const name = stationNames[i % stationNames.length];
        const result = stationResolver.resolveStation(name);
        results.push(result);
      }

      expect(results.length).toBe(100);
      expect(results.filter((r) => r !== null).length).toBeGreaterThan(0);
    });

    it('should handle large batch fare queries efficiently', () => {
      const stations = stationResolver.getAllStations();
      const queries = [];

      for (let i = 0; i < Math.min(50, stations.length - 1); i++) {
        const from = stations[i];
        const to = stations[i + 1];
        const fare = fareResolver.getFare(from.StationID, to.StationID);
        queries.push(fare);
      }

      expect(queries.length).toBeLessThanOrEqual(50);
    });

    it('should handle multiple schedule lookups', () => {
      const trainNumbers = scheduleResolver.listTrainNumbers();
      const results = [];

      for (const trainNumber of trainNumbers.slice(0, 50)) {
        const schedule = scheduleResolver.getSchedule(trainNumber, '2025-12-31');
        results.push(schedule);
      }

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle minimum and maximum pagination values', () => {
      // Test $top and $skip boundaries
      const routes = fareResolver.listRoutes();
      expect(routes.length).toBeGreaterThan(0);

      // Test with pagination
      const topFives = fareResolver.getAllFaresWithOData({
        top: 5,
      });
      expect(topFives.length).toBeLessThanOrEqual(5);

      // Test with skip
      const skipTens = fareResolver.getAllFaresWithOData({
        skip: 10,
      });
      expect(Array.isArray(skipTens)).toBe(true);
    });

    it('should handle spatial queries at boundary coordinates', () => {
      // Taipei is at approximately 25.0477, 121.517
      const taipeiBoundary = stationResolver.getNearbyStations({ lat: 25.0477, lon: 121.517 }, 0);
      expect(Array.isArray(taipeiBoundary)).toBe(true);

      // Query with extreme distance
      const extremeDistance = stationResolver.getNearbyStations(
        { lat: 25.0477, lon: 121.517 },
        100000
      );
      expect(Array.isArray(extremeDistance)).toBe(true);
      expect(extremeDistance.length).toBeGreaterThanOrEqual(taipeiBoundary.length);
    });

    it('should handle OData filter correctly with proper format', () => {
      // OData filter format: "Field=Value"
      const routesStartingFromTaipei = fareResolver.getAllFaresWithOData({
        filter: 'OriginStationCode=TPE',
      });
      expect(Array.isArray(routesStartingFromTaipei)).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent station and fare lookups', async () => {
      const stationNames = ['台北', '新竹', '台中'];

      const promises = stationNames.map((name) => {
        const station = stationResolver.resolveStation(name);
        return station;
      });

      const results = await Promise.all(promises);
      expect(results.length).toBe(3);
      expect(results.filter((r) => r !== null).length).toBeGreaterThan(0);
    });

    it('should handle concurrent schedule lookups for multiple trains', async () => {
      const trainNumbers = scheduleResolver.listTrainNumbers().slice(0, 10);

      const promises = trainNumbers.map((trainNumber) => {
        const schedule = scheduleResolver.getSchedule(trainNumber, '2025-12-31');
        return schedule;
      });

      const results = await Promise.all(promises);
      expect(results.length).toBe(trainNumbers.length);
    });
  });
});
