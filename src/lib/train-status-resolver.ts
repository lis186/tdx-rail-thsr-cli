/**
 * TrainStatusResolver - resolves real-time train status information
 * Provides current position, delays, and status for trains
 */

import type { THSRTrainStatus } from '../types/api.js';
import { StationResolver } from './station-resolver.js';
import { applyODataOptions, type ODataOptions } from './odata-utils.js';
import thsrStations from '../data/stations.js';

export interface ResolvedTrainStatus {
  trainNumber: string;
  direction: number;
  currentStation: string;
  currentStationId: string;
  status: 'OnTime' | 'Delayed' | 'Cancelled' | 'NotStarted';
  delayMinutes?: number;
  scheduledDepartureTime?: string;
  actualDepartureTime?: string;
  nextStation?: string;
  updateTime: string;
}

export class TrainStatusResolver {
  private statuses: Map<string, THSRTrainStatus>;
  private stationResolver: StationResolver;

  constructor(statuses: THSRTrainStatus[]) {
    this.statuses = new Map();
    this.stationResolver = new StationResolver(thsrStations);

    // Index by train number
    for (const status of statuses) {
      this.statuses.set(status.TrainNumber, status);
    }
  }

  /**
   * Get status for a specific train
   */
  getTrainStatus(trainNumber: string): ResolvedTrainStatus | null {
    const status = this.statuses.get(trainNumber);

    if (!status) {
      return null;
    }

    return this.resolveStatus(status);
  }

  /**
   * Get status for all trains
   */
  getAllTrainStatuses(): ResolvedTrainStatus[] {
    return Array.from(this.statuses.values()).map((s) => this.resolveStatus(s));
  }

  /**
   * Get status for trains at a specific station
   */
  getStatusesByStation(stationName: string): ResolvedTrainStatus[] {
    const station = this.stationResolver.resolveStation(stationName);
    if (!station) {
      return [];
    }

    return Array.from(this.statuses.values())
      .filter((s) => s.CurrentStationID === station.StationID)
      .map((s) => this.resolveStatus(s));
  }

  /**
   * Get delayed trains
   */
  getDelayedTrains(): ResolvedTrainStatus[] {
    return Array.from(this.statuses.values())
      .filter((s) => s.Status === 'Delayed')
      .map((s) => this.resolveStatus(s));
  }

  /**
   * Get cancelled trains
   */
  getCancelledTrains(): ResolvedTrainStatus[] {
    return Array.from(this.statuses.values())
      .filter((s) => s.Status === 'Cancelled')
      .map((s) => this.resolveStatus(s));
  }

  /**
   * Get trains with delay > threshold
   */
  getTrainsWithDelayGreaterThan(minutes: number): ResolvedTrainStatus[] {
    return Array.from(this.statuses.values())
      .filter((s) => s.DelayMinutes && s.DelayMinutes > minutes)
      .map((s) => this.resolveStatus(s));
  }

  /**
   * Get all statuses with OData options
   */
  getAllStatusesWithOData(options: ODataOptions): (THSRTrainStatus | Record<string, unknown>)[] {
    const statusesArray = Array.from(this.statuses.values());
    const statusesAsRecords = statusesArray as unknown as Record<string, unknown>[];
    return applyODataOptions(statusesAsRecords, options) as (
      | THSRTrainStatus
      | Record<string, unknown>
    )[];
  }

  /**
   * Private helper: Resolve status data
   */
  private resolveStatus(status: THSRTrainStatus): ResolvedTrainStatus {
    return {
      trainNumber: status.TrainNumber,
      direction: status.Direction,
      currentStation: status.CurrentStationName.Zh_tw,
      currentStationId: status.CurrentStationID,
      status: status.Status as 'OnTime' | 'Delayed' | 'Cancelled' | 'NotStarted',
      delayMinutes: status.DelayMinutes,
      scheduledDepartureTime: status.ScheduledDepartureTime,
      actualDepartureTime: status.ActualDepartureTime,
      nextStation: status.NextStationName?.Zh_tw,
      updateTime: status.UpdateTime,
    };
  }
}
