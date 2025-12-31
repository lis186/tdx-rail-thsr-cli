/**
 * ScheduleResolver - resolves train schedules between stations
 * Parses THSR Schedule data into readable format
 */

import type { THSRSchedule, ScheduleStop } from '../types/api.js';
import { StationResolver } from './station-resolver.js';
import { applyODataOptions, type ODataOptions } from './odata-utils.js';
import thsrStations from '../data/stations.js';

export interface ResolvedSchedule {
  trainNumber: string;
  direction: number;
  startStation: string;
  endStation: string;
  date: string;
  stops: ResolvedStop[];
  duration?: string;
}

export interface ResolvedStop {
  stationId: string;
  stationName: string;
  arrivalTime?: string;
  departureTime?: string;
  stopSequence: number;
}

export class ScheduleResolver {
  private schedules: Map<string, THSRSchedule>;
  private stationResolver: StationResolver;

  constructor(schedules: THSRSchedule[]) {
    this.schedules = new Map();
    this.stationResolver = new StationResolver(thsrStations);

    // Index schedules by train number and date key
    for (const schedule of schedules) {
      const key = `${schedule.TrainNumber}-${schedule.ScheduleDate}`;
      this.schedules.set(key, schedule);
    }
  }

  /**
   * Get schedule by train number and date
   */
  getSchedule(trainNumber: string, date: string): ResolvedSchedule | null {
    const key = `${trainNumber}-${date}`;
    const schedule = this.schedules.get(key);

    if (!schedule) {
      return null;
    }

    return this.resolveSchedule(schedule);
  }

  /**
   * Get all schedules for a specific date
   */
  getSchedulesByDate(date: string): ResolvedSchedule[] {
    const result: ResolvedSchedule[] = [];

    for (const schedule of this.schedules.values()) {
      if (schedule.ScheduleDate === date) {
        result.push(this.resolveSchedule(schedule));
      }
    }

    return result;
  }

  /**
   * Get schedules for a station on a specific date
   */
  getSchedulesByStation(stationName: string, date: string): ResolvedSchedule[] {
    const station = this.stationResolver.resolveStation(stationName);
    if (!station) {
      return [];
    }

    const result: ResolvedSchedule[] = [];

    for (const schedule of this.schedules.values()) {
      if (schedule.ScheduleDate !== date) continue;

      // Check if station is in the stop times
      if (schedule.StopTimes.some((stop) => stop.StationID === station.StationID)) {
        result.push(this.resolveSchedule(schedule));
      }
    }

    return result;
  }

  /**
   * Get schedules for a route (from-to) on a specific date
   */
  getSchedulesByRoute(
    fromStation: string,
    toStation: string,
    date: string
  ): ResolvedSchedule[] {
    const from = this.stationResolver.resolveStation(fromStation);
    const to = this.stationResolver.resolveStation(toStation);

    if (!from || !to) {
      return [];
    }

    const result: ResolvedSchedule[] = [];

    for (const schedule of this.schedules.values()) {
      if (schedule.ScheduleDate !== date) continue;

      const hasFrom = schedule.StopTimes.some((stop) => stop.StationID === from.StationID);
      const hasTo = schedule.StopTimes.some((stop) => stop.StationID === to.StationID);

      if (hasFrom && hasTo) {
        // Check that from comes before to
        const fromIndex = schedule.StopTimes.findIndex((stop) => stop.StationID === from.StationID);
        const toIndex = schedule.StopTimes.findIndex((stop) => stop.StationID === to.StationID);

        if (fromIndex < toIndex) {
          result.push(this.resolveSchedule(schedule));
        }
      }
    }

    return result;
  }

  /**
   * Get all schedules with OData query options
   */
  getAllSchedulesWithOData(options: ODataOptions): (THSRSchedule | Record<string, unknown>)[] {
    const schedulesArray = Array.from(this.schedules.values());
    const schedulesAsRecords = schedulesArray as unknown as Record<string, unknown>[];
    return applyODataOptions(schedulesAsRecords, options) as (
      | THSRSchedule
      | Record<string, unknown>
    )[];
  }

  /**
   * List all available train numbers
   */
  listTrainNumbers(): string[] {
    const trainNumbers = new Set<string>();
    for (const schedule of this.schedules.values()) {
      trainNumbers.add(schedule.TrainNumber);
    }
    return Array.from(trainNumbers).sort();
  }

  /**
   * List all available dates
   */
  listDates(): string[] {
    const dates = new Set<string>();
    for (const schedule of this.schedules.values()) {
      dates.add(schedule.ScheduleDate);
    }
    return Array.from(dates).sort();
  }

  /**
   * Get stop information for a train on a route
   */
  getStopsForTrain(trainNumber: string, date: string): ResolvedStop[] {
    const schedule = this.getSchedule(trainNumber, date);
    if (!schedule) {
      return [];
    }
    return schedule.stops;
  }

  /**
   * Private helper: Resolve raw schedule data
   */
  private resolveSchedule(schedule: THSRSchedule): ResolvedSchedule {
    const stops = schedule.StopTimes.map((stop) => ({
      stationId: stop.StationID,
      stationName: stop.StationName.Zh_tw,
      arrivalTime: stop.ArrivalTime,
      departureTime: stop.DepartureTime,
      stopSequence: stop.StopSequence,
    }));

    // Calculate duration from first departure to last arrival
    let duration: string | undefined;
    const firstStop = stops[0];
    const lastStop = stops[stops.length - 1];
    if (firstStop?.departureTime && lastStop?.arrivalTime) {
      duration = this.calculateDuration(firstStop.departureTime, lastStop.arrivalTime);
    }

    return {
      trainNumber: schedule.TrainNumber,
      direction: schedule.Direction,
      startStation: schedule.StartingStationName.Zh_tw,
      endStation: schedule.EndingStationName.Zh_tw,
      date: schedule.ScheduleDate,
      stops,
      duration,
    };
  }

  /**
   * Private helper: Calculate duration between two times
   */
  private calculateDuration(departureTime: string, arrivalTime: string): string {
    const [depH, depM] = departureTime.split(':').map(Number);
    const [arrH, arrM] = arrivalTime.split(':').map(Number);

    const depMinutes = depH * 60 + depM;
    const arrMinutes = arrH * 60 + arrM;

    const durationMinutes = arrMinutes - depMinutes;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}
