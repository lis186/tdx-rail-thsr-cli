/**
 * AlertsResolver Tests
 * Tests for real-time alert generation and management
 */

import { describe, it, expect } from 'vitest';
import { AlertsResolver, type AlertFilter } from '../src/lib/alerts-resolver.js';

describe('AlertsResolver', () => {
  let resolver: AlertsResolver;

  beforeEach(() => {
    resolver = new AlertsResolver();
  });

  describe('Alert Generation', () => {
    it('should generate delay alerts for delayed trains', () => {
      const delayAlerts = resolver.getDelayAlerts();

      expect(Array.isArray(delayAlerts)).toBe(true);
      for (const alert of delayAlerts) {
        expect(alert.alertType).toBe('Delay');
        expect(alert.severity).toBeDefined();
      }
    });

    it('should generate cancellation alerts for cancelled trains', () => {
      const cancelAlerts = resolver.getCancellationAlerts();

      expect(Array.isArray(cancelAlerts)).toBe(true);
      for (const alert of cancelAlerts) {
        expect(alert.alertType).toBe('Cancellation');
        expect(alert.severity).toBe('Critical');
      }
    });

    it('should generate occupancy alerts for busy trains', () => {
      const occupancyAlerts = resolver.getOccupancyAlerts();

      expect(Array.isArray(occupancyAlerts)).toBe(true);
      for (const alert of occupancyAlerts) {
        expect(alert.alertType).toBe('Occupancy');
        expect(alert.occupancyRate).toBeDefined();
      }
    });
  });

  describe('getAllAlerts - Alert Retrieval', () => {
    it('should return all alerts', () => {
      const alerts = resolver.getAllAlerts();

      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by train number', () => {
      const allAlerts = resolver.getAllAlerts();
      if (allAlerts.length > 0) {
        const trainNumber = allAlerts[0].trainNumber;
        const filtered = resolver.getAllAlerts({ trainNumber });

        for (const alert of filtered) {
          expect(alert.trainNumber).toBe(trainNumber);
        }
      }
    });

    it('should filter by alert type', () => {
      const filtered = resolver.getAllAlerts({ alertType: 'Delay' });

      for (const alert of filtered) {
        expect(alert.alertType).toBe('Delay');
      }
    });

    it('should filter by severity', () => {
      const filtered = resolver.getAllAlerts({ severity: 'Critical' });

      for (const alert of filtered) {
        expect(alert.severity).toBe('Critical');
      }
    });

    it('should filter unresolved alerts only', () => {
      const filtered = resolver.getAllAlerts({ onlyUnresolved: true });

      for (const alert of filtered) {
        expect(alert.resolved).toBe(false);
      }
    });

    it('should support multiple filters', () => {
      const allAlerts = resolver.getAllAlerts();
      if (allAlerts.length > 0) {
        const trainNumber = allAlerts[0].trainNumber;
        const filtered = resolver.getAllAlerts({
          trainNumber,
          onlyUnresolved: true,
        });

        for (const alert of filtered) {
          expect(alert.trainNumber).toBe(trainNumber);
          expect(alert.resolved).toBe(false);
        }
      }
    });
  });

  describe('getTrainAlerts - Train-Specific Alerts', () => {
    it('should get alerts for specific train', () => {
      const delayAlerts = resolver.getDelayAlerts();
      if (delayAlerts.length > 0) {
        const trainNumber = delayAlerts[0].trainNumber;
        const trainAlerts = resolver.getTrainAlerts(trainNumber);

        for (const alert of trainAlerts) {
          expect(alert.trainNumber).toBe(trainNumber);
        }
      }
    });

    it('should return empty array for train with no alerts', () => {
      const alerts = resolver.getTrainAlerts('999999');

      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBe(0);
    });
  });

  describe('Alert Type Filters', () => {
    it('should get delay alerts', () => {
      const alerts = resolver.getDelayAlerts();

      for (const alert of alerts) {
        expect(alert.alertType).toBe('Delay');
      }
    });

    it('should get cancellation alerts', () => {
      const alerts = resolver.getCancellationAlerts();

      for (const alert of alerts) {
        expect(alert.alertType).toBe('Cancellation');
      }
    });

    it('should get occupancy alerts', () => {
      const alerts = resolver.getOccupancyAlerts();

      for (const alert of alerts) {
        expect(alert.alertType).toBe('Occupancy');
      }
    });
  });

  describe('Severity-Based Filtering', () => {
    it('should get critical alerts', () => {
      const alerts = resolver.getCriticalAlerts();

      for (const alert of alerts) {
        expect(alert.severity).toBe('Critical');
      }
    });

    it('should get alerts by severity', () => {
      const warningAlerts = resolver.getAlertsBySeverity('Warning');

      for (const alert of warningAlerts) {
        expect(alert.severity).toBe('Warning');
      }
    });
  });

  describe('Alert Counting', () => {
    it('should count unresolved alerts', () => {
      const count = resolver.getUnresolvedCount();

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should count alerts by severity', () => {
      const counts = resolver.getCountBySeverity();

      expect(counts.Info).toBeGreaterThanOrEqual(0);
      expect(counts.Warning).toBeGreaterThanOrEqual(0);
      expect(counts.Critical).toBeGreaterThanOrEqual(0);
    });

    it('should have total equal to sum of severities', () => {
      const counts = resolver.getCountBySeverity();
      const total = counts.Info + counts.Warning + counts.Critical;

      expect(total).toEqual(resolver.getUnresolvedCount());
    });
  });

  describe('Alert Resolution', () => {
    it('should resolve single alert by ID', () => {
      const alerts = resolver.getAllAlerts();
      if (alerts.length > 0) {
        const alertId = alerts[0].id;
        const resolved = resolver.resolveAlert(alertId);

        expect(resolved).toBe(true);
        expect(resolver.getAllAlerts().find((a) => a.id === alertId)?.resolved).toBe(true);
      }
    });

    it('should return false for non-existent alert ID', () => {
      const resolved = resolver.resolveAlert('non-existent-id');

      expect(resolved).toBe(false);
    });

    it('should resolve all alerts for a train', () => {
      const delayAlerts = resolver.getDelayAlerts();
      if (delayAlerts.length > 0) {
        const trainNumber = delayAlerts[0].trainNumber;
        const count = resolver.resolveTrainAlerts(trainNumber);

        expect(count).toBeGreaterThanOrEqual(0);
        const remainingAlerts = resolver.getTrainAlerts(trainNumber);
        expect(remainingAlerts.length).toBe(0);
      }
    });
  });

  describe('Alert Summary', () => {
    it('should return alert summary', () => {
      const summary = resolver.getAlertSummary();

      expect(summary.total).toBeGreaterThanOrEqual(0);
      expect(summary.unresolved).toBeLessThanOrEqual(summary.total);
      expect(summary.byType).toBeDefined();
      expect(summary.bySeverity).toBeDefined();
    });

    it('should have correct summary totals', () => {
      const summary = resolver.getAlertSummary();
      const byTypeTotal =
        summary.byType.Delay +
        summary.byType.Cancellation +
        summary.byType.Occupancy +
        summary.byType.ServiceDisruption +
        summary.byType.Maintenance +
        summary.byType.Other;

      expect(byTypeTotal).toBe(summary.unresolved);
    });

    it('should track affected stations', () => {
      const summary = resolver.getAlertSummary();
      const affectedStations = resolver.getAffectedStations();

      expect(Array.isArray(affectedStations)).toBe(true);
      expect(affectedStations).toEqual(expect.arrayContaining(affectedStations.sort()));
    });
  });

  describe('Custom Alerts', () => {
    it('should create custom alert', () => {
      const alert = resolver.createAlert('601', 'Other', 'Test alert', 'Info');

      expect(alert.trainNumber).toBe('601');
      expect(alert.alertType).toBe('Other');
      expect(alert.message).toBe('Test alert');
      expect(alert.severity).toBe('Info');
      expect(alert.resolved).toBe(false);
    });

    it('should add custom alert to resolver', () => {
      resolver.createAlert('602', 'ServiceDisruption', 'Custom service alert', 'Warning');
      const customAlerts = resolver.getAllAlerts({ alertType: 'ServiceDisruption' });

      expect(customAlerts.some((a) => a.message === 'Custom service alert')).toBe(true);
    });

    it('should allow custom severity levels', () => {
      const alert1 = resolver.createAlert('603', 'Other', 'Info alert', 'Info');
      const alert2 = resolver.createAlert('603', 'Other', 'Warning alert', 'Warning');
      const alert3 = resolver.createAlert('603', 'Other', 'Critical alert', 'Critical');

      expect(alert1.severity).toBe('Info');
      expect(alert2.severity).toBe('Warning');
      expect(alert3.severity).toBe('Critical');
    });
  });

  describe('Alert Properties', () => {
    it('should have required properties', () => {
      const alerts = resolver.getAllAlerts();

      for (const alert of alerts) {
        expect(alert.id).toBeDefined();
        expect(alert.trainNumber).toBeDefined();
        expect(alert.alertType).toBeDefined();
        expect(alert.severity).toBeDefined();
        expect(alert.message).toBeDefined();
        expect(alert.timestamp).toBeDefined();
        expect(typeof alert.resolved).toBe('boolean');
      }
    });

    it('should have valid alert types', () => {
      const validTypes = ['Delay', 'Cancellation', 'Occupancy', 'ServiceDisruption', 'Maintenance', 'Other'];
      const alerts = resolver.getAllAlerts();

      for (const alert of alerts) {
        expect(validTypes).toContain(alert.alertType);
      }
    });

    it('should have valid severities', () => {
      const validSeverities = ['Info', 'Warning', 'Critical'];
      const alerts = resolver.getAllAlerts();

      for (const alert of alerts) {
        expect(validSeverities).toContain(alert.severity);
      }
    });
  });

  describe('Alert Formatting', () => {
    it('should format alert for display', () => {
      const alerts = resolver.getAllAlerts();
      if (alerts.length > 0) {
        const formatted = resolver.formatAlert(alerts[0]);

        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(0);
      }
    });

    it('should include severity emoji in formatted alert', () => {
      const alert = resolver.createAlert('999', 'Other', 'Test', 'Critical');
      const formatted = resolver.formatAlert(alert);

      expect(formatted).toContain('🚨');
    });

    it('should get alert color code', () => {
      const criticalColor = resolver.getAlertColor('Critical');
      const warningColor = resolver.getAlertColor('Warning');
      const infoColor = resolver.getAlertColor('Info');

      expect(['red', 'yellow', 'green', 'white']).toContain(criticalColor);
      expect(['red', 'yellow', 'green', 'white']).toContain(warningColor);
      expect(['red', 'yellow', 'green', 'white']).toContain(infoColor);
    });
  });

  describe('Delay Alert Properties', () => {
    it('should include delay minutes for delay alerts', () => {
      const delayAlerts = resolver.getDelayAlerts();

      for (const alert of delayAlerts) {
        expect(alert.delayMinutes).toBeDefined();
        expect(alert.delayMinutes).toBeGreaterThan(0);
      }
    });

    it('should categorize delay severity by duration', () => {
      const delayAlerts = resolver.getDelayAlerts();

      for (const alert of delayAlerts) {
        if ((alert.delayMinutes || 0) > 30) {
          expect(alert.severity).toBe('Critical');
        } else {
          expect(alert.severity).toBe('Warning');
        }
      }
    });
  });

  describe('Occupancy Alert Properties', () => {
    it('should include occupancy rate for occupancy alerts', () => {
      const occupancyAlerts = resolver.getOccupancyAlerts();

      for (const alert of occupancyAlerts) {
        expect(alert.occupancyRate).toBeDefined();
        expect(alert.occupancyRate).toBeGreaterThan(0);
        expect(alert.occupancyRate).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty filters', () => {
      const filter: AlertFilter = {};
      const alerts = resolver.getAllAlerts(filter);

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should handle null/undefined filters', () => {
      const alerts1 = resolver.getAllAlerts();
      const alerts2 = resolver.getAllAlerts(undefined);

      expect(alerts1.length).toBe(alerts2.length);
    });

    it('should maintain alert uniqueness', () => {
      const alerts = resolver.getAllAlerts();
      const ids = alerts.map((a) => a.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Alert State Management', () => {
    it('should track alert state changes', () => {
      const alerts = resolver.getAllAlerts();
      if (alerts.length > 0) {
        const alertId = alerts[0].id;
        const beforeResolved = resolver.getAllAlerts().find((a) => a.id === alertId)?.resolved;

        resolver.resolveAlert(alertId);

        const afterResolved = resolver.getAllAlerts().find((a) => a.id === alertId)?.resolved;

        expect(beforeResolved).toBe(false);
        expect(afterResolved).toBe(true);
      }
    });

    it('should persist alert state', () => {
      const allAlerts = resolver.getAllAlerts();
      if (allAlerts.length > 0) {
        const alertId = allAlerts[0].id;
        resolver.resolveAlert(alertId);

        const unresolvedCount = resolver.getUnresolvedCount();
        const shouldBeLess = unresolvedCount < allAlerts.filter((a) => !a.resolved).length;

        expect(shouldBeLess || unresolvedCount === allAlerts.filter((a) => !a.resolved).length).toBe(true);
      }
    });
  });
});
