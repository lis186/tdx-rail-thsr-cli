/**
 * OccupancyAnalyzer - Analyzes and predicts train occupancy rates
 * Provides real-time occupancy estimates based on seat availability
 */

import type { THSRAvailability } from '../types/api.js';
import { AvailabilityResolver } from './availability-resolver.js';
import { ScheduleResolver } from './schedule-resolver.js';
import thsrSchedules from '../data/schedules.js';
import thsrAvailability from '../data/availability.js';

export interface OccupancyInfo {
  trainNumber: string;
  fromStation: string;
  toStation: string;
  date: string;
  standardOccupancyRate: number; // 0-100%
  businessOccupancyRate: number; // 0-100%
  overallOccupancyRate: number; // 0-100%
  totalSeats: number;
  availableSeats: number;
  reservedSeats: number;
  occupancyStatus: 'Empty' | 'Low' | 'Moderate' | 'High' | 'Full';
  crowdLevel: 'Very Quiet' | 'Quiet' | 'Moderate' | 'Busy' | 'Very Busy';
}

export interface OccupancyTrend {
  trainNumber: string;
  date: string;
  peakOccupancy: number;
  averageOccupancy: number;
  trend: 'Increasing' | 'Decreasing' | 'Stable';
}

export class OccupancyAnalyzer {
  private availabilityResolver: AvailabilityResolver;
  private scheduleResolver: ScheduleResolver;

  constructor() {
    this.availabilityResolver = new AvailabilityResolver(thsrAvailability);
    this.scheduleResolver = new ScheduleResolver(thsrSchedules);
  }

  /**
   * Get occupancy information for a specific train
   */
  getTrainOccupancy(trainNumber: string, date: string): OccupancyInfo | null {
    const availability = this.availabilityResolver.getAvailability(trainNumber, date);

    if (!availability) {
      return null;
    }

    const totalStandardSeats = availability.standard.total;
    const availableStandardSeats = availability.standard.available;
    const totalBusinessSeats = availability.business.total;
    const availableBusinessSeats = availability.business.available;

    const totalSeats = totalStandardSeats + totalBusinessSeats;
    const availableSeats = availableStandardSeats + availableBusinessSeats;
    const reservedSeats = totalSeats - availableSeats;

    const standardOccupancyRate =
      totalStandardSeats > 0 ? ((totalStandardSeats - availableStandardSeats) / totalStandardSeats) * 100 : 0;
    const businessOccupancyRate =
      totalBusinessSeats > 0 ? ((totalBusinessSeats - availableBusinessSeats) / totalBusinessSeats) * 100 : 0;
    const overallOccupancyRate = totalSeats > 0 ? (reservedSeats / totalSeats) * 100 : 0;

    const occupancyStatus = this.getOccupancyStatus(overallOccupancyRate);
    const crowdLevel = this.getCrowdLevel(overallOccupancyRate);

    return {
      trainNumber,
      fromStation: availability.from,
      toStation: availability.to,
      date,
      standardOccupancyRate: Math.round(standardOccupancyRate),
      businessOccupancyRate: Math.round(businessOccupancyRate),
      overallOccupancyRate: Math.round(overallOccupancyRate),
      totalSeats,
      availableSeats,
      reservedSeats,
      occupancyStatus,
      crowdLevel,
    };
  }

  /**
   * Get occupancy for all trains on a specific date
   */
  getOccupancyByDate(date: string): OccupancyInfo[] {
    const availabilities = this.availabilityResolver.getAvailabilitiesByDate(date);
    const occupancies: OccupancyInfo[] = [];

    const seenTrains = new Set<string>();
    for (const avail of availabilities) {
      if (!seenTrains.has(avail.trainNumber)) {
        seenTrains.add(avail.trainNumber);
        const occupancy = this.getTrainOccupancy(avail.trainNumber, date);
        if (occupancy) {
          occupancies.push(occupancy);
        }
      }
    }

    return occupancies.sort((a, b) => b.overallOccupancyRate - a.overallOccupancyRate);
  }

  /**
   * Get occupancy for trains on a specific route
   */
  getOccupancyByRoute(fromStation: string, toStation: string, date: string): OccupancyInfo[] {
    const schedules = this.scheduleResolver.getSchedulesByRoute(fromStation, toStation, date);
    const occupancies: OccupancyInfo[] = [];

    for (const schedule of schedules) {
      const occupancy = this.getTrainOccupancy(schedule.trainNumber, date);
      if (occupancy) {
        occupancies.push(occupancy);
      }
    }

    return occupancies.sort((a, b) => a.overallOccupancyRate - b.overallOccupancyRate);
  }

  /**
   * Get high-occupancy trains (above 70%)
   */
  getBusyTrains(date: string, threshold: number = 70): OccupancyInfo[] {
    const allOccupancies = this.getOccupancyByDate(date);
    return allOccupancies.filter((occ) => occ.overallOccupancyRate >= threshold);
  }

  /**
   * Get low-occupancy trains (below 30%)
   */
  getAvailableTrains(date: string, threshold: number = 30): OccupancyInfo[] {
    const allOccupancies = this.getOccupancyByDate(date);
    return allOccupancies.filter((occ) => occ.overallOccupancyRate <= threshold);
  }

  /**
   * Get occupancy status based on percentage
   */
  private getOccupancyStatus(occupancyRate: number): OccupancyInfo['occupancyStatus'] {
    if (occupancyRate >= 100) return 'Full';
    if (occupancyRate >= 70) return 'High';
    if (occupancyRate >= 40) return 'Moderate';
    if (occupancyRate > 0) return 'Low';
    return 'Empty';
  }

  /**
   * Get crowd level description
   */
  private getCrowdLevel(occupancyRate: number): OccupancyInfo['crowdLevel'] {
    if (occupancyRate >= 85) return 'Very Busy';
    if (occupancyRate >= 65) return 'Busy';
    if (occupancyRate >= 40) return 'Moderate';
    if (occupancyRate > 0) return 'Quiet';
    return 'Very Quiet';
  }

  /**
   * Get recommended trains (low occupancy, good seats)
   */
  getRecommendedTrains(fromStation: string, toStation: string, date: string): OccupancyInfo[] {
    const occupancies = this.getOccupancyByRoute(fromStation, toStation, date);
    // Recommend trains with occupancy below 60% and at least 20 available seats
    return occupancies.filter((occ) => occ.overallOccupancyRate < 60 && occ.availableSeats >= 20);
  }

  /**
   * Format occupancy percentage for display
   */
  formatOccupancy(rate: number): string {
    return `${rate}%`;
  }

  /**
   * Get occupancy bar visualization
   */
  getOccupancyBar(rate: number, width: number = 20): string {
    const filled = Math.round((rate / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
}
