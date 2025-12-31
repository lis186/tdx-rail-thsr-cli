import type { THSRTrainDelay } from '../types/api.js';

export interface ResolvedDelay {
  trainNumber: string;
  station: string;
  delayMinutes: number;
  reason?: string;
  estimatedArrival?: string;
  updateTime: string;
}

export class TrainDelayResolver {
  private delays: Map<string, THSRTrainDelay>;

  constructor(delays: THSRTrainDelay[]) {
    this.delays = new Map();
    for (const delay of delays) {
      this.delays.set(delay.TrainNumber, delay);
    }
  }

  getDelay(trainNumber: string): ResolvedDelay | null {
    const delay = this.delays.get(trainNumber);
    if (!delay) return null;
    return {
      trainNumber: delay.TrainNumber,
      station: delay.CurrentStationName.Zh_tw,
      delayMinutes: delay.DelayMinutes,
      reason: delay.DelayReason,
      estimatedArrival: delay.EstimatedArrivalTime,
      updateTime: delay.UpdateTime,
    };
  }

  getAllDelays(): ResolvedDelay[] {
    return Array.from(this.delays.values()).map((d) => ({
      trainNumber: d.TrainNumber,
      station: d.CurrentStationName.Zh_tw,
      delayMinutes: d.DelayMinutes,
      reason: d.DelayReason,
      estimatedArrival: d.EstimatedArrivalTime,
      updateTime: d.UpdateTime,
    }));
  }

  getDelaysByStation(stationName: string): ResolvedDelay[] {
    return Array.from(this.delays.values())
      .filter((d) => d.CurrentStationName.Zh_tw === stationName)
      .map((d) => ({
        trainNumber: d.TrainNumber,
        station: d.CurrentStationName.Zh_tw,
        delayMinutes: d.DelayMinutes,
        reason: d.DelayReason,
        estimatedArrival: d.EstimatedArrivalTime,
        updateTime: d.UpdateTime,
      }));
  }

  getDelaysGreaterThan(minutes: number): ResolvedDelay[] {
    return this.getAllDelays().filter((d) => d.delayMinutes > minutes);
  }
}
