/**
 * TransfersResolver - Finds optimal transfer options between stations
 * Analyzes multiple routing options and suggests best transfer points
 */

import type { Transfer, THSRSchedule, THSRStation } from '../types/api.js';
import { ScheduleResolver } from './schedule-resolver.js';
import { StationResolver } from './station-resolver.js';
import bundledSchedules from '../data/schedules.js';
import bundledStations from '../data/stations.js';

export interface TransferOption {
  fromStation: string;
  toStation: string;
  connectingStation: string;
  departTrain: string;
  departTime: string;
  connectTrain: string;
  connectTime: string;
  transferDuration: number; // minutes
  totalDuration: number; // minutes
  transferWaitTime: number; // minutes at connecting station
  feasible: boolean;
}

export class TransfersResolver {
  private scheduleResolver: ScheduleResolver;
  private stationResolver: StationResolver;

  /**
   * Both arguments default to bundled fixtures so existing tests and
   * code paths that call `new TransfersResolver()` keep working.
   * Production callers pass live data via the data-source loaders.
   */
  constructor(schedules: THSRSchedule[] = bundledSchedules, stations: THSRStation[] = bundledStations) {
    this.scheduleResolver = new ScheduleResolver(schedules);
    this.stationResolver = new StationResolver(stations);
  }

  /**
   * Find all possible transfer options between two stations
   */
  findTransfers(
    fromStation: string,
    toStation: string,
    date: string,
    maxWaitTime: number = 120
  ): TransferOption[] {
    const from = this.stationResolver.resolveStation(fromStation);
    const to = this.stationResolver.resolveStation(toStation);

    if (!from || !to) {
      return [];
    }

    const fromCN = from.StationName.Zh_tw;
    const toCN = to.StationName.Zh_tw;

    // Get all schedules for the date
    const allSchedules = this.scheduleResolver.getSchedulesByDate(date);

    const transfers: TransferOption[] = [];
    const hubStations = ['台北', '台中', '新竹', '嘉義'];

    // Try each hub station as connection point
    for (const hub of hubStations) {
      // Find trains from origin to hub
      const firstLegs = allSchedules.filter((schedule) => {
        const fromStop = schedule.stops.find((s) => s.stationName === fromCN);
        const hubStop = schedule.stops.find((s) => s.stationName === hub);
        return fromStop && hubStop && fromStop.stopSequence < hubStop.stopSequence;
      });

      // Find trains from hub to destination
      const secondLegs = allSchedules.filter((schedule) => {
        const hubStop = schedule.stops.find((s) => s.stationName === hub);
        const toStop = schedule.stops.find((s) => s.stationName === toCN);
        return hubStop && toStop && hubStop.stopSequence < toStop.stopSequence;
      });

      // Match first and second legs
      for (const firstTrain of firstLegs) {
        const firstFromStop = firstTrain.stops.find((s) => s.stationName === fromCN);
        const firstHubStop = firstTrain.stops.find((s) => s.stationName === hub);

        if (!firstFromStop?.departureTime || !firstHubStop?.arrivalTime) continue;

        const [hubArrH, hubArrM] = firstHubStop.arrivalTime.split(':').map(Number);
        const hubArrMinutes = hubArrH * 60 + hubArrM;

        for (const secondTrain of secondLegs) {
          const secondHubStop = secondTrain.stops.find((s) => s.stationName === hub);
          const secondToStop = secondTrain.stops.find((s) => s.stationName === toCN);

          if (!secondHubStop?.departureTime || !secondToStop?.arrivalTime) continue;

          const [hubDeptH, hubDeptM] = secondHubStop.departureTime.split(':').map(Number);
          const hubDeptMinutes = hubDeptH * 60 + hubDeptM;

          const waitTime = hubDeptMinutes - hubArrMinutes;

          // Check if transfer is feasible (positive wait time and within max)
          if (waitTime > 0 && waitTime <= maxWaitTime) {
            // Calculate total duration
            const [deptH, deptM] = firstFromStop.departureTime.split(':').map(Number);
            const deptMinutes = deptH * 60 + deptM;

            const [arrH, arrM] = secondToStop.arrivalTime.split(':').map(Number);
            const arrMinutes = arrH * 60 + arrM;

            let totalMinutes = arrMinutes - deptMinutes;
            // Handle day boundary
            if (totalMinutes < 0) totalMinutes += 24 * 60;

            transfers.push({
              fromStation: fromCN,
              toStation: toCN,
              connectingStation: hub,
              departTrain: firstTrain.trainNumber,
              departTime: firstFromStop.departureTime,
              connectTrain: secondTrain.trainNumber,
              connectTime: secondHubStop.departureTime,
              transferDuration: waitTime,
              totalDuration: totalMinutes,
              transferWaitTime: waitTime,
              feasible: true,
            });
          }
        }
      }
    }

    // Sort by total duration, then by wait time
    return transfers.sort((a, b) => {
      if (a.totalDuration !== b.totalDuration) {
        return a.totalDuration - b.totalDuration;
      }
      return a.transferWaitTime - b.transferWaitTime;
    });
  }

  /**
   * Find best transfer option with preferred criteria
   */
  findBestTransfer(
    fromStation: string,
    toStation: string,
    date: string,
    preferShortWait: boolean = true
  ): TransferOption | null {
    const transfers = this.findTransfers(fromStation, toStation, date);

    if (transfers.length === 0) return null;

    if (preferShortWait) {
      // Sort by wait time first, then total duration
      return transfers.sort((a, b) => {
        if (a.transferWaitTime !== b.transferWaitTime) {
          return a.transferWaitTime - b.transferWaitTime;
        }
        return a.totalDuration - b.totalDuration;
      })[0];
    } else {
      // Sort by total duration (already done in findTransfers)
      return transfers[0];
    }
  }

  /**
   * Get transfers for a specific hub station
   */
  getTransfersViaHub(
    fromStation: string,
    toStation: string,
    hubStation: string,
    date: string
  ): TransferOption[] {
    const allTransfers = this.findTransfers(fromStation, toStation, date);
    return allTransfers.filter((t) => t.connectingStation === hubStation);
  }

  /**
   * Get transfers within a specific wait time range
   */
  getTransfersWithWaitTime(
    fromStation: string,
    toStation: string,
    date: string,
    minWait: number = 10,
    maxWait: number = 60
  ): TransferOption[] {
    const transfers = this.findTransfers(fromStation, toStation, date, maxWait);
    return transfers.filter((t) => t.transferWaitTime >= minWait && t.transferWaitTime <= maxWait);
  }

  /**
   * Calculate transfer feasibility for a specific pair of trains
   */
  isTransferFeasible(
    fromTrainNumber: string,
    toTrainNumber: string,
    hubStation: string,
    date: string,
    minWait: number = 10
  ): boolean {
    const schedules = this.scheduleResolver.getSchedulesByDate(date);

    const fromTrain = schedules.find((s) => s.trainNumber === fromTrainNumber);
    const toTrain = schedules.find((s) => s.trainNumber === toTrainNumber);

    if (!fromTrain || !toTrain) return false;

    const fromHubStop = fromTrain.stops.find((s) => s.stationName === hubStation);
    const toHubStop = toTrain.stops.find((s) => s.stationName === hubStation);

    if (!fromHubStop?.arrivalTime || !toHubStop?.departureTime) return false;

    const [arrH, arrM] = fromHubStop.arrivalTime.split(':').map(Number);
    const arrMinutes = arrH * 60 + arrM;

    const [deptH, deptM] = toHubStop.departureTime.split(':').map(Number);
    const deptMinutes = deptH * 60 + deptM;

    const waitTime = deptMinutes - arrMinutes;

    return waitTime >= minWait;
  }

  /**
   * Format transfer duration for display
   */
  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}分鐘`;
    return `${hours}小時 ${mins}分鐘`;
  }
}
