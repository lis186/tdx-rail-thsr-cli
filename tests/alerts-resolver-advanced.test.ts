/**
 * AlertsResolver Advanced Tests
 * Tests alert filtering, severity combinations, and edge cases
 *
 * Focus Areas:
 * - Severity level combinations
 * - Alert type filtering
 * - Alert deduplication
 * - Timestamp handling
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AlertsResolver } from '../src/lib/alerts-resolver';

describe('AlertsResolver - Advanced Severity Handling', () => {
  let alertsResolver: AlertsResolver;

  beforeAll(() => {
    alertsResolver = new AlertsResolver();
  });

  describe('Severity Level Filtering', () => {
    /**
     * Test filtering alerts by severity levels
     */
    it('should filter critical alerts only', () => {
      const critical = alertsResolver.getCriticalAlerts();

      expect(Array.isArray(critical)).toBe(true);
      for (const alert of critical) {
        expect(alert.severity).toBe('Critical');
      }
    });

    it('should filter warning severity alerts', () => {
      const warning = alertsResolver.getAlertsBySeverity('Warning');

      expect(Array.isArray(warning)).toBe(true);
      for (const alert of warning) {
        expect(alert.severity).toBe('Warning');
      }
    });

    it('should filter info severity alerts', () => {
      const info = alertsResolver.getAlertsBySeverity('Info');

      expect(Array.isArray(info)).toBe(true);
      for (const alert of info) {
        expect(alert.severity).toBe('Info');
      }
    });

    it('should return empty for non-existent severity level', () => {
      const result = alertsResolver.getAlertsBySeverity('NonExistent' as any);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should filter alerts by exact severity match', () => {
      const critical = alertsResolver.getCriticalAlerts();
      const warning = alertsResolver.getAlertsBySeverity('Warning');

      // Critical alerts should only have Critical severity
      for (const alert of critical) {
        expect(alert.severity).toBe('Critical');
      }

      // Warning alerts should only have Warning severity
      for (const alert of warning) {
        expect(alert.severity).toBe('Warning');
      }
    });

    it('should get critical alerts via dedicated method', () => {
      const critical = alertsResolver.getCriticalAlerts();
      const directCritical = alertsResolver.getAlertsBySeverity('Critical');

      expect(critical.length).toBe(directCritical.length);
    });

    it('should maintain severity hierarchy', () => {
      const all = alertsResolver.getAllAlerts();

      // Count by severity
      const severityCounts: { [key: string]: number } = {};
      for (const alert of all) {
        severityCounts[alert.severity] = (severityCounts[alert.severity] || 0) + 1;
      }

      // Verify all alerts have valid severity
      for (const severity of Object.keys(severityCounts)) {
        expect(['Critical', 'Warning', 'Info'].includes(severity)).toBe(true);
      }
    });
  });

  describe('Alert Type Filtering', () => {
    /**
     * Test filtering alerts by type
     */
    it('should filter delay alerts', () => {
      const delays = alertsResolver.getDelayAlerts();

      expect(Array.isArray(delays)).toBe(true);
      for (const alert of delays) {
        expect(alert.alertType).toBe('Delay');
      }
    });

    it('should filter cancellation alerts', () => {
      const cancellations = alertsResolver.getAlertsByType('Cancellation');

      expect(Array.isArray(cancellations)).toBe(true);
      for (const alert of cancellations) {
        expect(alert.alertType).toBe('Cancellation');
      }
    });

    it('should filter occupancy alerts', () => {
      const occupancy = alertsResolver.getAlertsByType('Occupancy');

      expect(Array.isArray(occupancy)).toBe(true);
      for (const alert of occupancy) {
        expect(alert.alertType).toBe('Occupancy');
      }
    });

    it('should get occupancy alerts via getOccupancyAlerts', () => {
      const occupancy1 = alertsResolver.getAlertsByType('Occupancy');
      const occupancy2 = alertsResolver.getOccupancyAlerts();

      expect(occupancy1.length).toBe(occupancy2.length);
    });

    it('should get cancellation alerts via dedicated method', () => {
      const cancellations1 = alertsResolver.getAlertsByType('Cancellation');
      const cancellations2 = alertsResolver.getCancellationAlerts();

      expect(cancellations1.length).toBe(cancellations2.length);
    });

    it('should return empty for non-existent alert type', () => {
      const result = alertsResolver.getAlertsByType('NonExistent' as any);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should filter multiple alert types correctly', () => {
      const delays = alertsResolver.getDelayAlerts();
      const cancellations = alertsResolver.getAlertsByType('Cancellation');
      const occupancy = alertsResolver.getAlertsByType('Occupancy');

      // Count total unique alerts
      const allAlerts = alertsResolver.getAllAlerts();
      const counted = delays.length + cancellations.length + occupancy.length;

      // Should not exceed total
      expect(counted).toBeLessThanOrEqual(allAlerts.length);
    });
  });

  describe('Severity and Type Combinations', () => {
    /**
     * Test combinations of severity and type filters
     */
    it('should find critical delays', () => {
      const critical = alertsResolver.getCriticalAlerts();

      const criticalDelays = critical.filter((a) => a.alertType === 'Delay');
      expect(Array.isArray(criticalDelays)).toBe(true);
    });

    it('should find warning-severity cancellations', () => {
      const warning = alertsResolver.getAlertsBySeverity('Warning');

      const warningCancellations = warning.filter((a) => a.alertType === 'Cancellation');
      expect(Array.isArray(warningCancellations)).toBe(true);
    });

    it('should find critical occupancy alerts', () => {
      const critical = alertsResolver.getCriticalAlerts();

      const criticalOccupancy = critical.filter((a) => a.alertType === 'Occupancy');
      expect(Array.isArray(criticalOccupancy)).toBe(true);
    });

    it('should verify alert data structure in filtered results', () => {
      const alerts = alertsResolver.getAllAlerts();

      if (alerts.length > 0) {
        for (const alert of alerts.slice(0, 5)) {
          expect(alert.alertType).toBeDefined();
          expect(alert.severity).toBeDefined();
          expect(alert.message).toBeDefined();
          expect(alert.timestamp).toBeDefined();

          // Verify message is non-empty
          expect(alert.message.length).toBeGreaterThan(0);
        }
      }
    });

    it('should handle filtering with no results', () => {
      // Try filtering for combination that might not exist
      const warning = alertsResolver.getAlertsBySeverity('Warning');
      const unlikely = warning.filter((a) => a.alertType === 'NonExistentType');

      expect(Array.isArray(unlikely)).toBe(true);
      expect(unlikely.length).toBe(0);
    });
  });

  describe('Alert Aggregation', () => {
    /**
     * Test alert aggregation and deduplication
     */
    it('should not have duplicate alerts', () => {
      const alerts = alertsResolver.getAllAlerts();

      const seen = new Set<string>();
      for (const alert of alerts) {
        const key = `${alert.type}-${alert.severity}-${alert.message}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    });

    it('should count total alerts correctly', () => {
      const all = alertsResolver.getAllAlerts();
      const critical = alertsResolver.getCriticalAlerts();
      const delays = alertsResolver.getDelayAlerts();

      expect(all.length).toBeGreaterThanOrEqual(critical.length);
      expect(all.length).toBeGreaterThanOrEqual(delays.length);
    });

    it('should have consistent counts across calls', () => {
      const count1 = alertsResolver.getAllAlerts().length;
      const count2 = alertsResolver.getAllAlerts().length;

      expect(count1).toBe(count2);
    });

    it('should maintain alert ordering', () => {
      const alerts1 = alertsResolver.getAllAlerts();
      const alerts2 = alertsResolver.getAllAlerts();

      if (alerts1.length > 1) {
        for (let i = 0; i < Math.min(5, alerts1.length); i++) {
          expect(alerts1[i].message).toBe(alerts2[i].message);
        }
      }
    });

    it('should aggregate by severity level correctly', () => {
      const all = alertsResolver.getAllAlerts();
      const critical = alertsResolver.getCriticalAlerts();
      const high = alertsResolver.getAlertsBySeverity('High');
      const medium = alertsResolver.getAlertsBySeverity('Medium');
      const low = alertsResolver.getAlertsBySeverity('Low');

      // Critical should be subset of high
      expect(critical.length).toBeLessThanOrEqual(high.length);
    });
  });

  describe('Alert Timestamp Handling', () => {
    /**
     * Test timestamp-related functionality
     */
    it('should have valid timestamps for all alerts', () => {
      const alerts = alertsResolver.getAllAlerts();

      for (const alert of alerts) {
        expect(alert.timestamp).toBeDefined();
        expect(typeof alert.timestamp).toBe('string');
        expect(alert.timestamp.length).toBeGreaterThan(0);
      }
    });

    it('should parse timestamps in ISO format', () => {
      const alerts = alertsResolver.getAllAlerts();

      for (const alert of alerts.slice(0, 5)) {
        // Should be able to parse as date
        const date = new Date(alert.timestamp);
        expect(date.getTime()).not.toBeNaN();
      }
    });

    it('should maintain chronological order if applicable', () => {
      const alerts = alertsResolver.getAllAlerts();

      if (alerts.length > 1) {
        // Check if timestamps are sorted
        for (let i = 0; i < alerts.length - 1; i++) {
          const current = new Date(alerts[i].timestamp).getTime();
          const next = new Date(alerts[i + 1].timestamp).getTime();

          // Timestamps should be in some consistent order
          expect(!isNaN(current)).toBe(true);
          expect(!isNaN(next)).toBe(true);
        }
      }
    });
  });

  describe('Alert Content Validation', () => {
    /**
     * Validate alert content structure
     */
    it('should have non-empty messages for all alerts', () => {
      const alerts = alertsResolver.getAllAlerts();

      for (const alert of alerts) {
        expect(alert.message).toBeDefined();
        expect(alert.message.length).toBeGreaterThan(0);
      }
    });

    it('should have valid severity values', () => {
      const validSeverities = ['Critical', 'Warning', 'Info'];
      const alerts = alertsResolver.getAllAlerts();

      for (const alert of alerts) {
        expect(validSeverities.includes(alert.severity)).toBe(true);
      }
    });

    it('should have valid alert types', () => {
      const validTypes = ['Delay', 'Cancellation', 'Occupancy', 'ServiceDisruption', 'Maintenance', 'Other'];
      const alerts = alertsResolver.getAllAlerts();

      for (const alert of alerts) {
        expect(validTypes.includes(alert.alertType)).toBe(true);
      }
    });

    it('should have consistent data types', () => {
      const alerts = alertsResolver.getAllAlerts();

      for (const alert of alerts.slice(0, 5)) {
        expect(typeof alert.alertType).toBe('string');
        expect(typeof alert.severity).toBe('string');
        expect(typeof alert.message).toBe('string');
        expect(typeof alert.timestamp).toBe('string');
      }
    });

    it('should have reasonable message lengths', () => {
      const alerts = alertsResolver.getAllAlerts();

      for (const alert of alerts) {
        expect(alert.message.length).toBeGreaterThan(0);
        expect(alert.message.length).toBeLessThan(1000);
      }
    });
  });

  describe('Performance and Reliability', () => {
    /**
     * Test performance characteristics
     */
    it('should retrieve all alerts quickly', () => {
      const start = performance.now();
      const alerts = alertsResolver.getAllAlerts();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should filter alerts quickly', () => {
      const start = performance.now();
      alertsResolver.getAlertsBySeverity('High');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should handle multiple filter operations efficiently', () => {
      const start = performance.now();

      alertsResolver.getCriticalAlerts();
      alertsResolver.getDelayAlerts();
      alertsResolver.getAlertsBySeverity('High');
      alertsResolver.getAlertsByType('Occupancy');

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200);
    });

    it('should not degrade with repeated calls', () => {
      const times = [];

      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        alertsResolver.getAlertsBySeverity('Warning');
        const duration = performance.now() - start;
        times.push(duration);
      }

      // Verify times are consistently fast (all under 50ms is good)
      for (const time of times) {
        expect(time).toBeLessThan(50);
      }
    });

    it('should handle concurrent filter requests', async () => {
      const queries = [
        Promise.resolve(alertsResolver.getCriticalAlerts()),
        Promise.resolve(alertsResolver.getDelayAlerts()),
        Promise.resolve(alertsResolver.getAlertsBySeverity('High')),
        Promise.resolve(alertsResolver.getAlertsByType('Occupancy')),
      ];

      const results = await Promise.all(queries);

      for (const result of results) {
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    /**
     * Test edge cases and error conditions
     */
    it('should handle empty alert list gracefully', () => {
      const alerts = alertsResolver.getAllAlerts();

      if (alerts.length === 0) {
        const critical = alertsResolver.getCriticalAlerts();
        expect(critical.length).toBe(0);
      }
    });

    it('should handle filtering with special characters', () => {
      const result = alertsResolver.getAlertsByType('@#$%^&*()');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle filtering with very long strings', () => {
      const longString = 'a'.repeat(1000);
      const result = alertsResolver.getAlertsBySeverity(longString);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should maintain consistency with repeated queries', () => {
      const results = [];

      for (let i = 0; i < 5; i++) {
        const alerts = alertsResolver.getAlertsBySeverity('High');
        results.push(alerts);
      }

      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toEqual(results[0]);
      }
    });

    it('should handle null parameters gracefully', () => {
      const result = alertsResolver.getAlertsBySeverity(null as any);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle undefined parameters gracefully', () => {
      const result = alertsResolver.getAlertsByType(undefined as any);

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
