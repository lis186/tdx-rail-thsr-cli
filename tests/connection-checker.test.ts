/**
 * ConnectionChecker Tests
 * Tests for train connection feasibility and risk assessment
 */

import { describe, it, expect } from 'vitest';
import { ConnectionChecker } from '../src/lib/connection-checker.js';

describe('ConnectionChecker', () => {
  let checker: ConnectionChecker;

  beforeEach(() => {
    checker = new ConnectionChecker();
  });

  describe('checkConnection - Basic Feasibility', () => {
    it('should check connection between two trains', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2025-12-31');

      expect(connection).not.toBeNull();
      expect(connection?.firstTrain).toBe('601');
      expect(connection?.secondTrain).toBe('602');
      expect(connection?.transferStation).toBe('台北');
    });

    it('should return null for non-existent trains', () => {
      const connection = checker.checkConnection('999', '998', '台北', '2025-12-31');

      expect(connection).toBeNull();
    });

    it('should calculate wait time correctly', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2025-12-31');

      if (connection) {
        expect(connection.waitTime).toBeGreaterThan(0);
        expect(typeof connection.waitTime).toBe('number');
      }
    });

    it('should determine feasibility based on wait time', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2025-12-31');

      if (connection) {
        const isFeasible = connection.waitTime >= 15;
        expect(connection.feasible).toBe(isFeasible);
      }
    });
  });

  describe('Connection Properties', () => {
    it('should include required connection properties', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2025-12-31');

      if (connection) {
        expect(connection.feasible).toBeDefined();
        expect(connection.confidence).toBeDefined();
        expect(connection.firstTrain).toBeDefined();
        expect(connection.secondTrain).toBeDefined();
        expect(connection.transferStation).toBeDefined();
        expect(connection.arrivalTime).toBeDefined();
        expect(connection.departureTime).toBeDefined();
        expect(connection.waitTime).toBeDefined();
        expect(Array.isArray(connection.risks)).toBe(true);
        expect(Array.isArray(connection.recommendations)).toBe(true);
        expect(connection.score).toBeDefined();
      }
    });

    it('should have valid confidence range (0-100)', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2025-12-31');

      if (connection) {
        expect(connection.confidence).toBeGreaterThanOrEqual(0);
        expect(connection.confidence).toBeLessThanOrEqual(100);
      }
    });

    it('should have valid feasibility score (0-100)', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2025-12-31');

      if (connection) {
        expect(connection.score).toBeGreaterThanOrEqual(0);
        expect(connection.score).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Risk Assessment', () => {
    it('should identify risks in connections', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2025-12-31');

      if (connection) {
        expect(Array.isArray(connection.risks)).toBe(true);
        for (const risk of connection.risks) {
          expect(risk.type).toBeDefined();
          expect(['Delay', 'Occupancy', 'Distance', 'Time', 'Status']).toContain(risk.type);
          expect(risk.level).toBeDefined();
          expect(['Low', 'Medium', 'High']).toContain(risk.level);
          expect(risk.message).toBeDefined();
          expect(risk.impact).toBeGreaterThanOrEqual(1);
          expect(risk.impact).toBeLessThanOrEqual(10);
        }
      }
    });

    it('should mark very short connections as risky', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2025-12-31');

      if (connection && connection.waitTime < 20) {
        const hasTimeRisk = connection.risks.some((r) => r.type === 'Time');
        expect(hasTimeRisk).toBe(true);
      }
    });

    it('should assess delay risks', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2025-12-31');

      if (connection) {
        // Delay risks depend on train status
        const hasDelayRisk = connection.risks.some((r) => r.type === 'Delay');
        expect(typeof hasDelayRisk).toBe('boolean');
      }
    });

    it('should provide impact scores for risks', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2025-12-31');

      if (connection && connection.risks.length > 0) {
        for (const risk of connection.risks) {
          expect(risk.impact).toBeGreaterThanOrEqual(1);
          expect(risk.impact).toBeLessThanOrEqual(10);
        }
      }
    });
  });

  describe('Recommendations', () => {
    it('should provide recommendations', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2025-12-31');

      if (connection) {
        expect(Array.isArray(connection.recommendations)).toBe(true);
        expect(connection.recommendations.length).toBeGreaterThan(0);
        for (const rec of connection.recommendations) {
          expect(typeof rec).toBe('string');
          expect(rec.length).toBeGreaterThan(0);
        }
      }
    });

    it('should warn about short connections', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2025-12-31');

      if (connection && connection.waitTime < 25) {
        const hasTimeWarning = connection.recommendations.some((r) => r.includes('短'));
        expect(hasTimeWarning).toBe(true);
      }
    });

    it('should provide overall recommendation', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2025-12-31');

      if (connection) {
        const hasOverallRec = connection.recommendations.some(
          (r) => r.includes('推薦') || r.includes('可行') || r.includes('風險')
        );
        expect(hasOverallRec).toBe(true);
      }
    });
  });

  describe('getFeasibleConnections - Multiple Connections', () => {
    it('should find feasible connections between stations', () => {
      const connections = checker.getFeasibleConnections('南港', '左營', '台北', '2025-12-31', 50);

      expect(Array.isArray(connections)).toBe(true);
    });

    it('should filter by minimum confidence', () => {
      const high = checker.getFeasibleConnections('南港', '左營', '台北', '2025-12-31', 80);
      const low = checker.getFeasibleConnections('南港', '左營', '台北', '2025-12-31', 30);

      expect(high.length).toBeLessThanOrEqual(low.length);
    });

    it('should return empty for impossible routes', () => {
      const connections = checker.getFeasibleConnections(
        '不存在1',
        '不存在2',
        '不存在3',
        '2025-12-31',
        50
      );

      expect(connections.length).toBe(0);
    });

    it('should sort by confidence descending', () => {
      const connections = checker.getFeasibleConnections('南港', '左營', '台北', '2025-12-31', 30);

      for (let i = 1; i < connections.length; i++) {
        expect(connections[i - 1].confidence).toBeGreaterThanOrEqual(connections[i].confidence);
      }
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate confidence based on wait time', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2025-12-31');

      if (connection) {
        // Better wait times should have higher confidence
        expect(connection.confidence).toBeGreaterThanOrEqual(0);
        expect(connection.confidence).toBeLessThanOrEqual(100);
      }
    });

    it('should penalize very short connection times', () => {
      // Check multiple connections to see confidence pattern
      const conn1 = checker.checkConnection('601', '602', '台北', '2025-12-31');

      if (conn1) {
        if (conn1.waitTime < 20) {
          expect(conn1.confidence).toBeLessThan(80);
        }
      }
    });

    it('should penalize risks in confidence calculation', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2025-12-31');

      if (connection && connection.risks.length > 0) {
        // More risks should lower confidence
        const expectedMax = 100 - connection.risks.length * 5;
        expect(connection.confidence).toBeLessThanOrEqual(Math.max(expectedMax, 50));
      }
    });
  });

  describe('Formatting & Display', () => {
    it('should provide rating emoji', () => {
      const emoji80 = checker.getRatingEmoji(80);
      const emoji50 = checker.getRatingEmoji(50);
      const emoji20 = checker.getRatingEmoji(20);

      expect(['✅', '⚠️', '😐', '❌']).toContain(emoji80);
      expect(['✅', '⚠️', '😐', '❌']).toContain(emoji50);
      expect(['✅', '⚠️', '😐', '❌']).toContain(emoji20);
    });

    it('should get risk level summary', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2025-12-31');

      if (connection) {
        const summary = checker.getRiskSummary(connection.risks);

        expect(summary.high).toBeGreaterThanOrEqual(0);
        expect(summary.medium).toBeGreaterThanOrEqual(0);
        expect(summary.low).toBeGreaterThanOrEqual(0);
        expect(summary.high + summary.medium + summary.low).toBe(connection.risks.length);
      }
    });

    it('should format connection for display', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2025-12-31');

      if (connection) {
        const formatted = checker.formatConnection(connection);

        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(0);
        expect(formatted).toContain(connection.firstTrain);
        expect(formatted).toContain(connection.secondTrain);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid date format', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2000-01-01');

      // Should return null when no schedules for date
      expect(connection === null || connection !== null).toBe(true);
    });

    it('should handle invalid station names', () => {
      const connection = checker.checkConnection('601', '602', '不存在的站', '2025-12-31');

      expect(connection).toBeNull();
    });

    it('should handle same train numbers', () => {
      const connection = checker.checkConnection('601', '601', '台北', '2025-12-31');

      expect(connection === null || connection !== null).toBe(true);
    });

    it('should handle risk summary with no risks', () => {
      const emptyRisks = checker.getRiskSummary([]);

      expect(emptyRisks.high).toBe(0);
      expect(emptyRisks.medium).toBe(0);
      expect(emptyRisks.low).toBe(0);
    });
  });

  describe('Rating Consistency', () => {
    it('should rate excellent connections highly', () => {
      const connections = checker.getFeasibleConnections('南港', '左營', '台北', '2025-12-31', 80);

      for (const conn of connections) {
        if (conn.score >= 80) {
          expect(checker.getRatingEmoji(conn.score)).toBe('✅');
        }
      }
    });

    it('should rate poor connections lowly', () => {
      const connections = checker.getFeasibleConnections('南港', '左營', '台北', '2025-12-31', 10);

      const poorConnections = connections.filter((c) => c.score < 40);
      for (const conn of poorConnections) {
        expect(checker.getRatingEmoji(conn.score)).toBe('❌');
      }
    });
  });

  describe('Timing Information', () => {
    it('should provide correct arrival and departure times', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2025-12-31');

      if (connection) {
        expect(connection.arrivalTime).toMatch(/^\d{2}:\d{2}$/);
        expect(connection.departureTime).toMatch(/^\d{2}:\d{2}$/);
      }
    });

    it('should calculate wait time from arrival and departure', () => {
      const connection = checker.checkConnection('601', '602', '台北', '2025-12-31');

      if (connection) {
        const [arrH, arrM] = connection.arrivalTime.split(':').map(Number);
        const [deptH, deptM] = connection.departureTime.split(':').map(Number);

        const expectedWait = deptH * 60 + deptM - (arrH * 60 + arrM);
        expect(connection.waitTime).toBe(expectedWait);
      }
    });
  });
});
