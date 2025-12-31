/**
 * ConnectionChecker - Validates train connection feasibility
 * Determines if passengers can realistically make connections between trains
 */

import type { Transfer } from '../types/api.js';
import { ScheduleResolver } from './schedule-resolver.js';
import { TrainStatusResolver } from './train-status-resolver.js';
import { OccupancyAnalyzer } from './occupancy-analyzer.js';
import thsrSchedules from '../data/schedules.js';
import thsrTrainStatus from '../data/train-status.js';
import thsrAvailability from '../data/availability.js';

export interface ConnectionFeasibility {
  feasible: boolean;
  confidence: number; // 0-100% likelihood of success
  firstTrain: string;
  secondTrain: string;
  transferStation: string;
  arrivalTime: string;
  departureTime: string;
  waitTime: number; // minutes
  risks: ConnectionRisk[];
  recommendations: string[];
  score: number; // 0-100 feasibility score
}

export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface ConnectionRisk {
  type: 'Delay' | 'Occupancy' | 'Distance' | 'Time' | 'Status';
  level: RiskLevel;
  message: string;
  impact: number; // 1-10
}

export class ConnectionChecker {
  private scheduleResolver: ScheduleResolver;
  private trainStatusResolver: TrainStatusResolver;
  private occupancyAnalyzer: OccupancyAnalyzer;
  private minSafeTransferTime: number = 15; // minutes
  private maxDesirableWaitTime: number = 60; // minutes

  constructor() {
    this.scheduleResolver = new ScheduleResolver(thsrSchedules);
    this.trainStatusResolver = new TrainStatusResolver(thsrTrainStatus);
    this.occupancyAnalyzer = new OccupancyAnalyzer();
  }

  /**
   * Check if connection between two trains is feasible
   */
  checkConnection(
    firstTrain: string,
    secondTrain: string,
    transferStation: string,
    date: string
  ): ConnectionFeasibility | null {
    const schedules = this.scheduleResolver.getSchedulesByDate(date);

    // Find the two trains
    const first = schedules.find((s) => s.trainNumber === firstTrain);
    const second = schedules.find((s) => s.trainNumber === secondTrain);

    if (!first || !second) {
      return null;
    }

    // Find stops at transfer station
    const firstStop = first.stops.find((s) => s.stationName === transferStation);
    const secondStop = second.stops.find((s) => s.stationName === transferStation);

    if (!firstStop?.arrivalTime || !secondStop?.departureTime) {
      return null;
    }

    // Parse times
    const [arrH, arrM] = firstStop.arrivalTime.split(':').map(Number);
    const arrivalMinutes = arrH * 60 + arrM;

    const [deptH, deptM] = secondStop.departureTime.split(':').map(Number);
    const departureMinutes = deptH * 60 + deptM;

    const waitTime = departureMinutes - arrivalMinutes;

    // Check if feasible
    const feasible = waitTime >= this.minSafeTransferTime;

    // Assess risks
    const risks = this.assessRisks(firstTrain, secondTrain, waitTime, date, transferStation);

    // Calculate confidence score
    const confidence = this.calculateConfidence(waitTime, risks);

    // Get recommendations
    const recommendations = this.generateRecommendations(waitTime, risks, confidence);

    // Calculate feasibility score (0-100)
    const score = Math.max(0, Math.min(100, confidence - risks.reduce((sum, r) => sum + r.impact * 10, 0)));

    return {
      feasible,
      confidence: Math.round(confidence),
      firstTrain,
      secondTrain,
      transferStation,
      arrivalTime: firstStop.arrivalTime,
      departureTime: secondStop.departureTime,
      waitTime,
      risks,
      recommendations,
      score,
    };
  }

  /**
   * Assess risks for a connection
   */
  private assessRisks(
    firstTrain: string,
    secondTrain: string,
    waitTime: number,
    date: string,
    transferStation: string
  ): ConnectionRisk[] {
    const risks: ConnectionRisk[] = [];

    // Check first train delay status
    const firstStatus = this.trainStatusResolver.getTrainStatus(firstTrain);
    if (firstStatus?.status === 'Delayed' && firstStatus.delayMinutes) {
      const delayRisk: ConnectionRisk = {
        type: 'Delay',
        level: firstStatus.delayMinutes > 15 ? 'High' : 'Medium',
        message: `First train potentially delayed ${firstStatus.delayMinutes} minutes`,
        impact: Math.min(10, Math.ceil(firstStatus.delayMinutes / 5)),
      };
      risks.push(delayRisk);
    }

    // Check second train status
    const secondStatus = this.trainStatusResolver.getTrainStatus(secondTrain);
    if (secondStatus?.status === 'Cancelled') {
      const cancelRisk: ConnectionRisk = {
        type: 'Status',
        level: 'High',
        message: 'Second train is cancelled',
        impact: 10,
      };
      risks.push(cancelRisk);
    }

    // Check occupancy of first train (if full, might not make it)
    const firstOccupancy = this.occupancyAnalyzer.getTrainOccupancy(firstTrain, date);
    if (firstOccupancy && firstOccupancy.overallOccupancyRate > 95) {
      const occupancyRisk: ConnectionRisk = {
        type: 'Occupancy',
        level: 'High',
        message: 'First train nearly full, standing room only',
        impact: 5,
      };
      risks.push(occupancyRisk);
    }

    // Check second train occupancy (booking concern)
    const secondOccupancy = this.occupancyAnalyzer.getTrainOccupancy(secondTrain, date);
    if (secondOccupancy && secondOccupancy.overallOccupancyRate > 85) {
      const secondOccupancyRisk: ConnectionRisk = {
        type: 'Occupancy',
        level: 'Medium',
        message: 'Second train is quite full',
        impact: 3,
      };
      risks.push(secondOccupancyRisk);
    }

    // Check wait time
    if (waitTime < 20) {
      const timeRisk: ConnectionRisk = {
        type: 'Time',
        level: waitTime < 15 ? 'High' : 'Medium',
        message: `Short connection window: ${waitTime} minutes`,
        impact: Math.max(1, 10 - Math.floor(waitTime / 2)),
      };
      risks.push(timeRisk);
    }

    // Distance risk (walking between platforms)
    // In a real system, this would use station layout data
    const distanceRisk: ConnectionRisk = {
      type: 'Distance',
      level: 'Low',
      message: 'Standard station connection time required',
      impact: 1,
    };
    risks.push(distanceRisk);

    return risks.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Calculate confidence percentage
   */
  private calculateConfidence(waitTime: number, risks: ConnectionRisk[]): number {
    let confidence = 100;

    // Base confidence from wait time
    if (waitTime < 15) confidence -= 30;
    else if (waitTime < 20) confidence -= 20;
    else if (waitTime < 30) confidence -= 10;
    else if (waitTime > 120) confidence -= 5; // Very long wait isn't ideal but safe

    // Deduct for each risk
    for (const risk of risks) {
      const deduction = risk.level === 'High' ? 20 : risk.level === 'Medium' ? 10 : 5;
      confidence -= deduction;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(waitTime: number, risks: ConnectionRisk[], confidence: number): string[] {
    const recommendations: string[] = [];

    // Wait time recommendations
    if (waitTime < 15) {
      recommendations.push('❌ 轉運時間過短 - 高風險錯過第二班列車');
    } else if (waitTime < 20) {
      recommendations.push('⚠️ 轉運時間緊迫 - 應迅速通過車站');
    } else if (waitTime < 30) {
      recommendations.push('✓ 轉運時間充足但餘裕有限');
    } else if (waitTime <= 60) {
      recommendations.push('✓ 轉運時間充足');
    } else {
      recommendations.push('ℹ️ 等待時間過長 - 考慮其他路線');
    }

    // Risk-based recommendations
    const hasDelayRisk = risks.some((r) => r.type === 'Delay');
    if (hasDelayRisk) {
      recommendations.push('⚠️ 第一班列車可能延誤 - 預留額外時間');
    }

    const hasCancelRisk = risks.some((r) => r.type === 'Status' && r.level === 'High');
    if (hasCancelRisk) {
      recommendations.push('❌ 第二班列車已取消 - 選擇替代方案');
    }

    const hasOccupancyRisk = risks.some((r) => r.type === 'Occupancy' && r.level === 'High');
    if (hasOccupancyRisk) {
      recommendations.push('⚠️ 列車擁擠 - 考慮更早或更晚的班次');
    }

    // Overall recommendation
    if (confidence >= 80) {
      recommendations.push('👍 推薦 - 這是一個可靠的轉運');
    } else if (confidence >= 50) {
      recommendations.push('😐 可行 - 這個轉運是可能的但有風險');
    } else if (confidence < 50) {
      recommendations.push('❌ 不推薦 - 高風險錯過轉運');
    }

    return recommendations;
  }

  /**
   * Get all feasible connections between two stations
   */
  getFeasibleConnections(
    fromStation: string,
    toStation: string,
    viaStation: string,
    date: string,
    minConfidence: number = 50
  ): ConnectionFeasibility[] {
    const schedules = this.scheduleResolver.getSchedulesByDate(date);
    const feasibleConnections: ConnectionFeasibility[] = [];

    // Find all trains from->via and via->to
    const firstLegs = schedules.filter((s) => {
      const fromStop = s.stops.find((st) => st.stationName === fromStation);
      const viaStop = s.stops.find((st) => st.stationName === viaStation);
      return fromStop && viaStop && fromStop.stopSequence < viaStop.stopSequence;
    });

    const secondLegs = schedules.filter((s) => {
      const viaStop = s.stops.find((st) => st.stationName === viaStation);
      const toStop = s.stops.find((st) => st.stationName === toStation);
      return viaStop && toStop && viaStop.stopSequence < toStop.stopSequence;
    });

    // Check all combinations
    for (const first of firstLegs) {
      for (const second of secondLegs) {
        const connection = this.checkConnection(first.trainNumber, second.trainNumber, viaStation, date);
        if (connection && connection.feasible && connection.confidence >= minConfidence) {
          feasibleConnections.push(connection);
        }
      }
    }

    // Sort by confidence descending
    return feasibleConnections.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get connection rating emoji
   */
  getRatingEmoji(score: number): string {
    if (score >= 80) return '✅'; // Excellent
    if (score >= 60) return '⚠️'; // Good
    if (score >= 40) return '😐'; // Fair
    return '❌'; // Poor
  }

  /**
   * Get risk level summary
   */
  getRiskSummary(risks: ConnectionRisk[]): { high: number; medium: number; low: number } {
    return {
      high: risks.filter((r) => r.level === 'High').length,
      medium: risks.filter((r) => r.level === 'Medium').length,
      low: risks.filter((r) => r.level === 'Low').length,
    };
  }

  /**
   * Format connection for display
   */
  formatConnection(connection: ConnectionFeasibility): string {
    const rating = this.getRatingEmoji(connection.score);
    const risks = this.getRiskSummary(connection.risks);
    return `${rating} ${connection.firstTrain} → ${connection.secondTrain} @ ${connection.transferStation} (${connection.waitTime}min, Score: ${connection.score}/100)`;
  }
}
