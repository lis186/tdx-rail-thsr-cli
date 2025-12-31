/**
 * AvailabilityResolver - resolves seat availability information
 */

import type { THSRAvailability } from '../types/api.js';

export interface ResolvedAvailability {
  trainNumber: string;
  from: string;
  to: string;
  date: string;
  standard: { total: number; available: number; reserved: number };
  business: { total: number; available: number; reserved: number };
}

export class AvailabilityResolver {
  private availabilities: Map<string, THSRAvailability>;

  constructor(availabilities: THSRAvailability[]) {
    this.availabilities = new Map();
    for (const avail of availabilities) {
      const key = `${avail.TrainNumber}-${avail.AvailabilityDate}`;
      this.availabilities.set(key, avail);
    }
  }

  /**
   * Get availability for a train
   */
  getAvailability(trainNumber: string, date: string): ResolvedAvailability | null {
    const key = `${trainNumber}-${date}`;
    const avail = this.availabilities.get(key);
    if (!avail) return null;

    const standard = avail.Availabilities.find((a) => a.SeatType === 'Standard');
    const business = avail.Availabilities.find((a) => a.SeatType === 'Business');

    return {
      trainNumber: avail.TrainNumber,
      from: avail.OriginStationName.Zh_tw,
      to: avail.DestinationStationName.Zh_tw,
      date: avail.AvailabilityDate,
      standard: standard
        ? {
            total: standard.TotalSeats,
            available: standard.AvailableSeats,
            reserved: standard.ReservedSeats,
          }
        : { total: 0, available: 0, reserved: 0 },
      business: business
        ? {
            total: business.TotalSeats,
            available: business.AvailableSeats,
            reserved: business.ReservedSeats,
          }
        : { total: 0, available: 0, reserved: 0 },
    };
  }

  /**
   * Get availabilities by date
   */
  getAvailabilitiesByDate(date: string): ResolvedAvailability[] {
    return Array.from(this.availabilities.values())
      .filter((a) => a.AvailabilityDate === date)
      .map((a) => this.getAvailability(a.TrainNumber, date)!)
      .filter(Boolean);
  }

  /**
   * List all available dates
   */
  listDates(): string[] {
    const dates = new Set<string>();
    for (const avail of this.availabilities.values()) {
      dates.add(avail.AvailabilityDate);
    }
    return Array.from(dates).sort();
  }
}
