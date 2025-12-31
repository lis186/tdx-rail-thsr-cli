/**
 * AlertsResolver - Generates real-time alerts for train operations
 * Monitors train status, delays, cancellations, and service disruptions
 */

import type { THSRTrainStatus, ServiceAlert } from '../types/api.js';
import { TrainStatusResolver } from './train-status-resolver.js';
import { TrainDelayResolver } from './train-delay-resolver.js';
import { OccupancyAnalyzer } from './occupancy-analyzer.js';
import thsrTrainStatus from '../data/train-status.js';
import thsrTrainDelay from '../data/train-delay.js';
import thsrAvailability from '../data/availability.js';

export type AlertType = 'Delay' | 'Cancellation' | 'Occupancy' | 'ServiceDisruption' | 'Maintenance' | 'Other';
export type AlertSeverity = 'Info' | 'Warning' | 'Critical';

export interface TrainAlert {
  id: string;
  trainNumber: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
  affectedStation?: string;
  fromStation?: string;
  toStation?: string;
  delayMinutes?: number;
  occupancyRate?: number;
  resolved: boolean;
}

export interface AlertFilter {
  trainNumber?: string;
  alertType?: AlertType;
  severity?: AlertSeverity;
  fromStation?: string;
  toStation?: string;
  onlyUnresolved?: boolean;
}

export class AlertsResolver {
  private trainStatusResolver: TrainStatusResolver;
  private trainDelayResolver: TrainDelayResolver;
  private occupancyAnalyzer: OccupancyAnalyzer;
  private alerts: Map<string, TrainAlert>;

  constructor() {
    this.trainStatusResolver = new TrainStatusResolver(thsrTrainStatus);
    this.trainDelayResolver = new TrainDelayResolver(thsrTrainDelay);
    this.occupancyAnalyzer = new OccupancyAnalyzer();
    this.alerts = new Map();
    this.generateAllAlerts();
  }

  /**
   * Generate all alerts based on current data
   */
  private generateAllAlerts(): void {
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // Generate delay alerts
    const delayedTrains = this.trainStatusResolver.getAllTrainStatuses();
    for (const train of delayedTrains) {
      if (train.status === 'Delayed' && train.delayMinutes && train.delayMinutes > 0) {
        const alertId = `delay-${train.trainNumber}-${now}`;
        const severity: AlertSeverity = train.delayMinutes > 30 ? 'Critical' : 'Warning';
        const alert: TrainAlert = {
          id: alertId,
          trainNumber: train.trainNumber,
          alertType: 'Delay',
          severity,
          message: `列車 ${train.trainNumber} 延誤 ${train.delayMinutes} 分鐘`,
          timestamp: now,
          affectedStation: train.currentStation,
          delayMinutes: train.delayMinutes,
          resolved: false,
        };
        this.alerts.set(alertId, alert);
      }

      // Generate cancellation alerts
      if (train.status === 'Cancelled') {
        const alertId = `cancel-${train.trainNumber}-${now}`;
        const alert: TrainAlert = {
          id: alertId,
          trainNumber: train.trainNumber,
          alertType: 'Cancellation',
          severity: 'Critical',
          message: `列車 ${train.trainNumber} 已取消`,
          timestamp: now,
          affectedStation: train.currentStation,
          resolved: false,
        };
        this.alerts.set(alertId, alert);
      }
    }

    // Generate occupancy alerts
    const busyTrains = this.occupancyAnalyzer.getBusyTrains(today, 85);
    for (const train of busyTrains) {
      const alertId = `occupancy-${train.trainNumber}-${now}`;
      const alert: TrainAlert = {
        id: alertId,
        trainNumber: train.trainNumber,
        alertType: 'Occupancy',
        severity: 'Warning',
        message: `列車 ${train.trainNumber} 載客率達 ${train.overallOccupancyRate}%，建議搭乘其他班次`,
        timestamp: now,
        occupancyRate: train.overallOccupancyRate,
        resolved: false,
      };
      this.alerts.set(alertId, alert);
    }
  }

  /**
   * Get all active alerts
   */
  getAllAlerts(filter?: AlertFilter): TrainAlert[] {
    const alerts = Array.from(this.alerts.values());

    return alerts.filter((alert) => {
      if (filter?.onlyUnresolved && alert.resolved) return false;
      if (filter?.trainNumber && alert.trainNumber !== filter.trainNumber) return false;
      if (filter?.alertType && alert.alertType !== filter.alertType) return false;
      if (filter?.severity && alert.severity !== filter.severity) return false;
      if (filter?.fromStation && alert.fromStation !== filter.fromStation) return false;
      if (filter?.toStation && alert.toStation !== filter.toStation) return false;
      return true;
    });
  }

  /**
   * Get alerts for a specific train
   */
  getTrainAlerts(trainNumber: string): TrainAlert[] {
    return this.getAllAlerts({ trainNumber, onlyUnresolved: true });
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity): TrainAlert[] {
    return this.getAllAlerts({ severity, onlyUnresolved: true });
  }

  /**
   * Get alerts by type
   */
  getAlertsByType(alertType: AlertType): TrainAlert[] {
    return this.getAllAlerts({ alertType, onlyUnresolved: true });
  }

  /**
   * Get critical alerts
   */
  getCriticalAlerts(): TrainAlert[] {
    return this.getAlertsBySeverity('Critical');
  }

  /**
   * Get delay alerts
   */
  getDelayAlerts(): TrainAlert[] {
    return this.getAlertsByType('Delay');
  }

  /**
   * Get cancellation alerts
   */
  getCancellationAlerts(): TrainAlert[] {
    return this.getAlertsByType('Cancellation');
  }

  /**
   * Get occupancy alerts
   */
  getOccupancyAlerts(): TrainAlert[] {
    return this.getAlertsByType('Occupancy');
  }

  /**
   * Count unresolved alerts
   */
  getUnresolvedCount(): number {
    return this.getAllAlerts({ onlyUnresolved: true }).length;
  }

  /**
   * Count alerts by severity
   */
  getCountBySeverity(): { Info: number; Warning: number; Critical: number } {
    const alerts = this.getAllAlerts({ onlyUnresolved: true });
    return {
      Info: alerts.filter((a) => a.severity === 'Info').length,
      Warning: alerts.filter((a) => a.severity === 'Warning').length,
      Critical: alerts.filter((a) => a.severity === 'Critical').length,
    };
  }

  /**
   * Mark alert as resolved
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * Resolve all alerts for a train
   */
  resolveTrainAlerts(trainNumber: string): number {
    let count = 0;
    for (const alert of this.alerts.values()) {
      if (alert.trainNumber === trainNumber && !alert.resolved) {
        alert.resolved = true;
        count++;
      }
    }
    return count;
  }

  /**
   * Get alert summary
   */
  getAlertSummary(): {
    total: number;
    unresolved: number;
    byType: Record<AlertType, number>;
    bySeverity: Record<AlertSeverity, number>;
  } {
    const alerts = this.getAllAlerts();
    const unresolvedAlerts = alerts.filter((a) => !a.resolved);

    const byType: Record<AlertType, number> = {
      Delay: 0,
      Cancellation: 0,
      Occupancy: 0,
      ServiceDisruption: 0,
      Maintenance: 0,
      Other: 0,
    };

    const bySeverity: Record<AlertSeverity, number> = {
      Info: 0,
      Warning: 0,
      Critical: 0,
    };

    for (const alert of unresolvedAlerts) {
      byType[alert.alertType]++;
      bySeverity[alert.severity]++;
    }

    return {
      total: alerts.length,
      unresolved: unresolvedAlerts.length,
      byType,
      bySeverity,
    };
  }

  /**
   * Get affected stations
   */
  getAffectedStations(): string[] {
    const stations = new Set<string>();
    for (const alert of this.getAllAlerts({ onlyUnresolved: true })) {
      if (alert.affectedStation) {
        stations.add(alert.affectedStation);
      }
    }
    return Array.from(stations).sort();
  }

  /**
   * Create custom alert
   */
  createAlert(
    trainNumber: string,
    alertType: AlertType,
    message: string,
    severity: AlertSeverity = 'Info'
  ): TrainAlert {
    const now = new Date().toISOString();
    const alertId = `custom-${trainNumber}-${Date.now()}`;
    const alert: TrainAlert = {
      id: alertId,
      trainNumber,
      alertType,
      severity,
      message,
      timestamp: now,
      resolved: false,
    };
    this.alerts.set(alertId, alert);
    return alert;
  }

  /**
   * Format alert for display
   */
  formatAlert(alert: TrainAlert): string {
    const severityEmoji = {
      Info: 'ℹ️',
      Warning: '⚠️',
      Critical: '🚨',
    };
    return `${severityEmoji[alert.severity]} [${alert.alertType}] ${alert.message}`;
  }

  /**
   * Get alert color code
   */
  getAlertColor(severity: AlertSeverity): string {
    switch (severity) {
      case 'Critical':
        return 'red';
      case 'Warning':
        return 'yellow';
      case 'Info':
        return 'green';
      default:
        return 'white';
    }
  }
}
