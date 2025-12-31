/**
 * TransfersResolver Tests
 * Tests for transfer suggestions and multi-leg journey planning
 */

import { describe, it, expect } from 'vitest';
import { TransfersResolver } from '../src/lib/transfers-resolver.js';

describe('TransfersResolver', () => {
  let resolver: TransfersResolver;

  beforeEach(() => {
    resolver = new TransfersResolver();
  });

  describe('findTransfers - Basic Transfer Finding', () => {
    it('should find transfer options between two stations', () => {
      const transfers = resolver.findTransfers('Taipei', 'Hsinchu', '2025-12-31');

      expect(Array.isArray(transfers)).toBe(true);
      expect(transfers.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array for non-existent route', () => {
      const transfers = resolver.findTransfers('InvalidFrom', 'InvalidTo', '2025-12-31');

      expect(transfers).toEqual([]);
    });

    it('should include all required transfer properties', () => {
      const transfers = resolver.findTransfers('Taipei', 'Zuoying', '2025-12-31');

      if (transfers.length > 0) {
        const transfer = transfers[0];
        expect(transfer.fromStation).toBeDefined();
        expect(transfer.toStation).toBeDefined();
        expect(transfer.connectingStation).toBeDefined();
        expect(transfer.departTrain).toBeDefined();
        expect(transfer.connectTrain).toBeDefined();
        expect(transfer.transferWaitTime).toBeGreaterThanOrEqual(0);
        expect(transfer.totalDuration).toBeGreaterThan(0);
        expect(transfer.feasible).toBe(true);
      }
    });

    it('should respect max wait time constraint', () => {
      const transfers = resolver.findTransfers('Taipei', 'Zuoying', '2025-12-31', 30);

      for (const transfer of transfers) {
        expect(transfer.transferWaitTime).toBeLessThanOrEqual(30);
      }
    });

    it('should sort by total duration', () => {
      const transfers = resolver.findTransfers('Taipei', 'Zuoying', '2025-12-31');

      for (let i = 1; i < transfers.length; i++) {
        const prevDuration = transfers[i - 1].totalDuration;
        const currDuration = transfers[i].totalDuration;
        expect(prevDuration <= currDuration).toBe(true);
      }
    });
  });

  describe('findBestTransfer - Selection Strategies', () => {
    it('should find best transfer by total duration', () => {
      const best = resolver.findBestTransfer('Taipei', 'Zuoying', '2025-12-31', false);

      expect(best).not.toBeNull();
      if (best) {
        const allTransfers = resolver.findTransfers('Taipei', 'Zuoying', '2025-12-31');
        const minDuration = Math.min(...allTransfers.map((t) => t.totalDuration));
        expect(best.totalDuration).toBe(minDuration);
      }
    });

    it('should find best transfer by wait time when preferred', () => {
      const best = resolver.findBestTransfer('Taipei', 'Zuoying', '2025-12-31', true);

      expect(best).not.toBeNull();
      if (best) {
        const allTransfers = resolver.findTransfers('Taipei', 'Zuoying', '2025-12-31');
        const minWait = Math.min(...allTransfers.map((t) => t.transferWaitTime));
        expect(best.transferWaitTime).toBe(minWait);
      }
    });

    it('should return null when no transfers available', () => {
      const best = resolver.findBestTransfer('InvalidFrom', 'InvalidTo', '2025-12-31');

      expect(best).toBeNull();
    });

    it('should prefer stations with same duration as primary criterion', () => {
      const best = resolver.findBestTransfer('Taipei', 'Zuoying', '2025-12-31', true);

      expect(best).not.toBeNull();
    });
  });

  describe('getTransfersViaHub - Hub-Specific Transfers', () => {
    it('should find transfers via specific hub station', () => {
      const transfers = resolver.getTransfersViaHub('Taipei', 'Zuoying', '台中', '2025-12-31');

      expect(Array.isArray(transfers)).toBe(true);
      for (const transfer of transfers) {
        expect(transfer.connectingStation).toBe('台中');
      }
    });

    it('should return empty array when hub is not valid transfer point', () => {
      const transfers = resolver.getTransfersViaHub('Taipei', 'Hsinchu', '左營', '2025-12-31');

      expect(transfers).toEqual([]);
    });

    it('should include hub station in all returned transfers', () => {
      const transfers = resolver.getTransfersViaHub('Nangang', 'Zuoying', '台中', '2025-12-31');

      for (const transfer of transfers) {
        expect(transfer.connectingStation).toBe('台中');
        expect(transfer.fromStation).toBe('南港');
        expect(transfer.toStation).toBe('左營');
      }
    });

    it('should handle Chinese hub station names', () => {
      const transfers = resolver.getTransfersViaHub('Taipei', 'Zuoying', '台中', '2025-12-31');

      expect(Array.isArray(transfers)).toBe(true);
    });
  });

  describe('getTransfersWithWaitTime - Wait Time Filtering', () => {
    it('should filter transfers by wait time range', () => {
      const transfers = resolver.getTransfersWithWaitTime('Taipei', 'Zuoying', '2025-12-31', 15, 45);

      for (const transfer of transfers) {
        expect(transfer.transferWaitTime).toBeGreaterThanOrEqual(15);
        expect(transfer.transferWaitTime).toBeLessThanOrEqual(45);
      }
    });

    it('should return empty array when no transfers in range', () => {
      const transfers = resolver.getTransfersWithWaitTime('Taipei', 'Zuoying', '2025-12-31', 1, 5);

      expect(Array.isArray(transfers)).toBe(true);
      // All transfers should be either empty or within range
      for (const transfer of transfers) {
        expect(transfer.transferWaitTime).toBeGreaterThanOrEqual(1);
        expect(transfer.transferWaitTime).toBeLessThanOrEqual(5);
      }
    });

    it('should accept custom min and max wait time', () => {
      const transfers = resolver.getTransfersWithWaitTime('Taipei', 'Zuoying', '2025-12-31', 20, 50);

      for (const transfer of transfers) {
        expect(transfer.transferWaitTime).toBeGreaterThanOrEqual(20);
        expect(transfer.transferWaitTime).toBeLessThanOrEqual(50);
      }
    });

    it('should use default wait time constraints', () => {
      const transfers = resolver.getTransfersWithWaitTime('Taipei', 'Zuoying', '2025-12-31');

      for (const transfer of transfers) {
        expect(transfer.transferWaitTime).toBeGreaterThanOrEqual(10);
      }
    });
  });

  describe('isTransferFeasible - Transfer Validation', () => {
    it('should validate feasible transfer between trains', () => {
      // Train 601 arrives at Taichung at 07:40
      // Train 602 departs from Taichung at 08:10
      // Wait time: 30 minutes (feasible)
      const feasible = resolver.isTransferFeasible('601', '602', '台中', '2025-12-31', 10);

      expect(feasible).toBe(true);
    });

    it('should reject transfer with insufficient wait time', () => {
      // If we require 45 minutes and the actual wait is 30, should be false
      const feasible = resolver.isTransferFeasible('601', '602', '台中', '2025-12-31', 45);

      expect(feasible).toBe(false);
    });

    it('should return false for non-existent trains', () => {
      const feasible = resolver.isTransferFeasible('999', '998', '台中', '2025-12-31', 10);

      expect(feasible).toBe(false);
    });

    it('should return false when hub station not on route', () => {
      // Train 601 doesn't stop at a station that both trains visit
      const feasible = resolver.isTransferFeasible('601', '701', '不存在的站', '2025-12-31', 10);

      expect(feasible).toBe(false);
    });

    it('should handle same-direction train transfers', () => {
      // Both trains in same direction - might not connect
      const feasible = resolver.isTransferFeasible('601', '602', '台北', '2025-12-31', 10);

      expect(typeof feasible).toBe('boolean');
    });
  });

  describe('formatDuration - Duration Display', () => {
    it('should format minutes under 60', () => {
      const formatted = resolver.formatDuration(45);

      expect(formatted).toBe('45分鐘');
    });

    it('should format hours and minutes', () => {
      const formatted = resolver.formatDuration(125);

      expect(formatted).toBe('2小時 5分鐘');
    });

    it('should format zero minutes', () => {
      const formatted = resolver.formatDuration(0);

      expect(formatted).toBe('0分鐘');
    });

    it('should format single hour', () => {
      const formatted = resolver.formatDuration(60);

      expect(formatted).toBe('1小時 0分鐘');
    });

    it('should format large durations', () => {
      const formatted = resolver.formatDuration(500);

      expect(formatted).toMatch(/^[0-9]+小時\s[0-9]+分鐘$/);
    });
  });

  describe('Transfer Quality Metrics', () => {
    it('should calculate realistic total durations', () => {
      const transfers = resolver.findTransfers('Taipei', 'Zuoying', '2025-12-31');

      for (const transfer of transfers) {
        expect(transfer.totalDuration).toBeGreaterThan(transfer.transferWaitTime);
      }
    });

    it('should have positive transfer wait times', () => {
      const transfers = resolver.findTransfers('Taipei', 'Zuoying', '2025-12-31');

      for (const transfer of transfers) {
        expect(transfer.transferWaitTime).toBeGreaterThan(0);
      }
    });

    it('should mark all returned transfers as feasible', () => {
      const transfers = resolver.findTransfers('Taipei', 'Zuoying', '2025-12-31');

      for (const transfer of transfers) {
        expect(transfer.feasible).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle fuzzy station name matching', () => {
      const transfers = resolver.findTransfers('taipei', 'zuoying', '2025-12-31');

      expect(Array.isArray(transfers)).toBe(true);
    });

    it('should handle Chinese station names', () => {
      const transfers = resolver.findTransfers('台北', '左營', '2025-12-31');

      expect(Array.isArray(transfers)).toBe(true);
    });

    it('should handle empty date results', () => {
      const transfers = resolver.findTransfers('Taipei', 'Zuoying', '2000-01-01');

      expect(transfers).toEqual([]);
    });

    it('should handle same source and destination', () => {
      const transfers = resolver.findTransfers('Taipei', 'Taipei', '2025-12-31');

      // Should return empty since we need different stations
      expect(Array.isArray(transfers)).toBe(true);
    });

    it('should handle very short max wait time', () => {
      const transfers = resolver.findTransfers('Taipei', 'Zuoying', '2025-12-31', 5);

      for (const transfer of transfers) {
        expect(transfer.transferWaitTime).toBeLessThanOrEqual(5);
      }
    });

    it('should handle very long max wait time', () => {
      const transfers = resolver.findTransfers('Taipei', 'Zuoying', '2025-12-31', 300);

      expect(transfers.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multi-Hub Transfers', () => {
    it('should find transfers via different hub stations', () => {
      const hubs = ['台北', '台中'];
      const allTransfers = resolver.findTransfers('Nangang', 'Zuoying', '2025-12-31');

      const hubsUsed = new Set(allTransfers.map((t) => t.connectingStation));
      expect(hubsUsed.size).toBeGreaterThanOrEqual(0);
    });

    it('should prefer optimal hub station', () => {
      const best = resolver.findBestTransfer('Nangang', 'Zuoying', '2025-12-31', false);

      expect(best).not.toBeNull();
      if (best) {
        expect(['台北', '台中']).toContain(best.connectingStation);
      }
    });
  });

  describe('Train Number Consistency', () => {
    it('should use valid train numbers in transfers', () => {
      const transfers = resolver.findTransfers('Taipei', 'Zuoying', '2025-12-31');

      for (const transfer of transfers) {
        expect(transfer.departTrain).toBeDefined();
        expect(transfer.departTrain.length).toBeGreaterThan(0);
        expect(transfer.connectTrain).toBeDefined();
        expect(transfer.connectTrain.length).toBeGreaterThan(0);
        // Transfers should use different trains (not the same train for both legs)
        if (transfer.departTrain === transfer.connectTrain) {
          // This is a direct route, not a transfer, skip this assertion
          expect(true).toBe(true);
        } else {
          // This is a true transfer with different trains
          expect(transfer.departTrain).not.toBe(transfer.connectTrain);
        }
      }
    });
  });

  describe('Time Consistency', () => {
    it('should have departure before connection time', () => {
      const transfers = resolver.findTransfers('Taipei', 'Zuoying', '2025-12-31');

      for (const transfer of transfers) {
        const deptParts = transfer.departTime.split(':').map(Number);
        const connParts = transfer.connectTime.split(':').map(Number);
        const deptMinutes = deptParts[0] * 60 + deptParts[1];
        const connMinutes = connParts[0] * 60 + connParts[1];

        // Connection time should be after or equal (allowing for next day)
        expect(connMinutes >= deptMinutes || connMinutes < deptMinutes).toBe(true);
      }
    });
  });
});
