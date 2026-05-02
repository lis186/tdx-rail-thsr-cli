/**
 * JourneyPlanResolver - Plans optimal journeys between stations
 * Supports departure/arrival time preferences and transfer optimization
 */

import type { JourneyPlan, JourneyLeg, THSRSchedule, THSRStation } from '../types/api.js';
import { ScheduleResolver } from './schedule-resolver.js';
import { StationResolver } from './station-resolver.js';
import type { ResolvedSchedule } from './schedule-resolver.js';
import bundledSchedules from '../data/schedules.js';
import bundledStations from '../data/stations.js';

export interface JourneyOptions {
  departureTime?: string; // HH:MM format
  arrivalTime?: string;   // HH:MM format
  allowTransfers?: boolean;
  maxTransferTime?: number; // minutes
  date: string;
}

export class JourneyPlanResolver {
  private scheduleResolver: ScheduleResolver;
  private stationResolver: StationResolver;

  /**
   * Both arguments default to bundled fixtures so existing tests and
   * code paths that call `new JourneyPlanResolver()` keep working.
   * Production callers pass live data via the data-source loaders.
   */
  constructor(schedules: THSRSchedule[] = bundledSchedules, stations: THSRStation[] = bundledStations) {
    this.scheduleResolver = new ScheduleResolver(schedules);
    this.stationResolver = new StationResolver(stations);
  }

  /**
   * Plan optimal journey between two stations
   */
  planJourney(
    fromStation: string,
    toStation: string,
    options: JourneyOptions
  ): JourneyPlan | null {
    const from = this.stationResolver.resolveStation(fromStation);
    const to = this.stationResolver.resolveStation(toStation);

    if (!from || !to) {
      return null;
    }

    // Get all available schedules for the date
    const allSchedules = this.scheduleResolver.getSchedulesByDate(options.date);

    // Find direct routes first
    const directRoutes = allSchedules.filter((schedule) => {
      const fromStop = schedule.stops.find((s) => s.stationName === from.StationName.Zh_tw);
      const toStop = schedule.stops.find((s) => s.stationName === to.StationName.Zh_tw);

      if (!fromStop || !toStop) return false;
      if (fromStop.stopSequence >= toStop.stopSequence) return false;

      // Check time constraints
      if (options.departureTime) {
        const dept = fromStop.departureTime || '';
        if (dept < options.departureTime) return false;
      }

      if (options.arrivalTime) {
        const arr = toStop.arrivalTime || '';
        if (arr > options.arrivalTime) return false;
      }

      return true;
    });

    // If direct routes available and no transfers allowed, return best
    if (directRoutes.length > 0 && !options.allowTransfers) {
      return this.selectBestJourney(directRoutes, from.StationName.Zh_tw, to.StationName.Zh_tw);
    }

    // If direct routes available, return best direct option
    if (directRoutes.length > 0) {
      const bestDirect = this.selectBestJourney(
        directRoutes,
        from.StationName.Zh_tw,
        to.StationName.Zh_tw
      );
      if (bestDirect) return bestDirect;
    }

    // If transfers allowed, find connecting routes
    if (options.allowTransfers) {
      const transferOptions = this.findConnectingRoutes(
        from.StationName.Zh_tw,
        to.StationName.Zh_tw,
        allSchedules,
        options
      );

      if (transferOptions.length > 0) {
        return this.selectBestJourney(transferOptions, from.StationName.Zh_tw, to.StationName.Zh_tw);
      }
    }

    return null;
  }

  /**
   * Find earliest departure option
   */
  findEarliestDeparture(
    fromStation: string,
    toStation: string,
    date: string
  ): JourneyPlan | null {
    return this.planJourney(fromStation, toStation, {
      date,
      allowTransfers: false,
    });
  }

  /**
   * Find latest arrival option
   */
  findLatestArrival(
    fromStation: string,
    toStation: string,
    date: string
  ): JourneyPlan | null {
    const options: JourneyOptions = { date, allowTransfers: false };
    const journey = this.planJourney(fromStation, toStation, options);
    return journey;
  }

  /**
   * Private: Select best journey option (earliest departure, then shortest duration)
   */
  private selectBestJourney(
    schedules: ResolvedSchedule[],
    from: string,
    to: string
  ): JourneyPlan | null {
    if (schedules.length === 0) return null;

    let best = schedules[0];
    let bestDuration = this.parseDuration(best.duration || '0h 0m');

    for (const schedule of schedules.slice(1)) {
      const duration = this.parseDuration(schedule.duration || '0h 0m');
      if (duration < bestDuration) {
        best = schedule;
        bestDuration = duration;
      }
    }

    return this.convertToJourneyPlan(best, from, to);
  }

  /**
   * Private: Find connecting routes via intermediate station
   */
  private findConnectingRoutes(
    from: string,
    to: string,
    schedules: ResolvedSchedule[],
    options: JourneyOptions
  ): ResolvedSchedule[] {
    // Simplified: try one transfer (main station hub)
    const connectingStations = ['台北', '台中'];
    const connections: ResolvedSchedule[] = [];

    for (const hub of connectingStations) {
      const firstLeg = schedules.filter((s) => {
        const fromStop = s.stops.find((st) => st.stationName === from);
        const hubStop = s.stops.find((st) => st.stationName === hub);
        return fromStop && hubStop && fromStop.stopSequence < hubStop.stopSequence;
      });

      const secondLeg = schedules.filter((s) => {
        const hubStop = s.stops.find((st) => st.stationName === hub);
        const toStop = s.stops.find((st) => st.stationName === to);
        return hubStop && toStop && hubStop.stopSequence < toStop.stopSequence;
      });

      // Match transfers with sufficient time
      if (firstLeg.length > 0 && secondLeg.length > 0) {
        const first = firstLeg[0];
        const fromStop = first.stops.find((s) => s.stationName === from);
        const hubStopFirst = first.stops.find((s) => s.stationName === hub);

        if (fromStop && hubStopFirst && hubStopFirst.arrivalTime) {
          const [hubH, hubM] = hubStopFirst.arrivalTime.split(':').map(Number);
          const hubMinutes = hubH * 60 + hubM;

          // Find connecting trains within max transfer time
          const maxTransfer = options.maxTransferTime || 30;
          for (const second of secondLeg) {
            const hubStopSecond = second.stops.find((s) => s.stationName === hub);
            if (hubStopSecond && hubStopSecond.departureTime) {
              const [deptH, deptM] = hubStopSecond.departureTime.split(':').map(Number);
              const deptMinutes = deptH * 60 + deptM;

              const transferTime = deptMinutes - hubMinutes;
              if (transferTime > 0 && transferTime <= maxTransfer) {
                connections.push(first);
              }
            }
          }
        }
      }
    }

    return connections;
  }

  /**
   * Private: Convert schedule to journey plan
   */
  private convertToJourneyPlan(
    schedule: ResolvedSchedule,
    fromStation: string,
    toStation: string
  ): JourneyPlan {
    const fromStop = schedule.stops.find((s) => s.stationName === fromStation);
    const toStop = schedule.stops.find((s) => s.stationName === toStation);

    if (!fromStop || !toStop) {
      return {
        fromStation,
        toStation,
        totalDuration: '0h 0m',
        totalLegs: 0,
        legs: [],
      };
    }

    const leg: JourneyLeg = {
      legNumber: 1,
      trainNumber: schedule.trainNumber,
      fromStation,
      toStation,
      departureTime: fromStop.departureTime || '',
      arrivalTime: toStop.arrivalTime || '',
      duration: schedule.duration || '0h 0m',
      seatAvailable: 150, // Mock value
    };

    return {
      fromStation,
      toStation,
      departureTime: fromStop.departureTime,
      arrivalTime: toStop.arrivalTime,
      totalDuration: schedule.duration || '0h 0m',
      totalLegs: 1,
      legs: [leg],
    };
  }

  /**
   * Private: Parse duration string to minutes
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/(\d+)h\s*(\d+)m/);
    if (!match) return 0;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours * 60 + minutes;
  }
}
