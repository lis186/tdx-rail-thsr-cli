import { describe, it, expect, beforeAll } from 'vitest';
import { cli } from '../src/cli';

/**
 * CLI Integration Tests
 * Tests the command structure and basic command execution
 */
describe('CLI Integration', () => {
  describe('CLI Structure', () => {
    it('should have cli instance with name thsr', () => {
      expect(cli.name()).toBe('thsr');
    });

    it('should have version 0.1.0', () => {
      const version = cli.version();
      expect(version).toBe('0.1.0');
    });

    it('should have description', () => {
      const description = cli.description();
      expect(description).toBeDefined();
    });
  });

  describe('Command Registration', () => {
    it('should have stations command', () => {
      const commands = cli.commands;
      const stationsCmd = commands.find((cmd) => cmd.name() === 'stations');
      expect(stationsCmd).toBeDefined();
    });

    it('should have fare command', () => {
      const commands = cli.commands;
      const fareCmd = commands.find((cmd) => cmd.name() === 'fare');
      expect(fareCmd).toBeDefined();
    });

    it('should have schedule command', () => {
      const commands = cli.commands;
      const scheduleCmd = commands.find((cmd) => cmd.name() === 'schedule');
      expect(scheduleCmd).toBeDefined();
    });

    it('should have seat-availability command', () => {
      const commands = cli.commands;
      const seatCmd = commands.find((cmd) => cmd.name() === 'seat-availability');
      expect(seatCmd).toBeDefined();
    });

    it('should have occupancy command', () => {
      const commands = cli.commands;
      const occupancyCmd = commands.find((cmd) => cmd.name() === 'occupancy');
      expect(occupancyCmd).toBeDefined();
    });

    it('should have alerts command', () => {
      const commands = cli.commands;
      const alertsCmd = commands.find((cmd) => cmd.name() === 'alerts');
      expect(alertsCmd).toBeDefined();
    });

    it('should have journey-plan command', () => {
      const commands = cli.commands;
      const journeyCmd = commands.find((cmd) => cmd.name() === 'journey-plan');
      expect(journeyCmd).toBeDefined();
    });

    it('should have transfers command', () => {
      const commands = cli.commands;
      const transfersCmd = commands.find((cmd) => cmd.name() === 'transfers');
      expect(transfersCmd).toBeDefined();
    });

    it('should have health command', () => {
      const commands = cli.commands;
      const healthCmd = commands.find((cmd) => cmd.name() === 'health');
      expect(healthCmd).toBeDefined();
    });
  });

  describe('Stations Command', () => {
    it('should have description', () => {
      const commands = cli.commands;
      const stationsCmd = commands.find((cmd) => cmd.name() === 'stations');
      expect(stationsCmd?.description()).toBeDefined();
    });

    it('should accept search subcommand', () => {
      const commands = cli.commands;
      const stationsCmd = commands.find((cmd) => cmd.name() === 'stations');
      const subcommands = stationsCmd?.commands || [];
      const searchCmd = subcommands.find((cmd) => cmd.name() === 'search');
      expect(searchCmd).toBeDefined();
    });

    it('should accept info subcommand', () => {
      const commands = cli.commands;
      const stationsCmd = commands.find((cmd) => cmd.name() === 'stations');
      const subcommands = stationsCmd?.commands || [];
      const infoCmd = subcommands.find((cmd) => cmd.name() === 'info');
      expect(infoCmd).toBeDefined();
    });
  });

  describe('Occupancy Command', () => {
    it('should have subcommands', () => {
      const commands = cli.commands;
      const occupancyCmd = commands.find((cmd) => cmd.name() === 'occupancy');
      const subcommands = occupancyCmd?.commands || [];
      expect(subcommands.length).toBeGreaterThan(0);
    });

    it('should have recommend subcommand', () => {
      const commands = cli.commands;
      const occupancyCmd = commands.find((cmd) => cmd.name() === 'occupancy');
      const subcommands = occupancyCmd?.commands || [];
      const recommendCmd = subcommands.find((cmd) => cmd.name() === 'recommend');
      expect(recommendCmd).toBeDefined();
    });
  });

  describe('Alerts Command', () => {
    it('should have multiple subcommands', () => {
      const commands = cli.commands;
      const alertsCmd = commands.find((cmd) => cmd.name() === 'alerts');
      const subcommands = alertsCmd?.commands || [];
      expect(subcommands.length).toBeGreaterThanOrEqual(5);
    });

    it('should have critical subcommand', () => {
      const commands = cli.commands;
      const alertsCmd = commands.find((cmd) => cmd.name() === 'alerts');
      const subcommands = alertsCmd?.commands || [];
      const criticalCmd = subcommands.find((cmd) => cmd.name() === 'critical');
      expect(criticalCmd).toBeDefined();
    });

    it('should have delays subcommand', () => {
      const commands = cli.commands;
      const alertsCmd = commands.find((cmd) => cmd.name() === 'alerts');
      const subcommands = alertsCmd?.commands || [];
      const delaysCmd = subcommands.find((cmd) => cmd.name() === 'delays');
      expect(delaysCmd).toBeDefined();
    });

    it('should have cancellations subcommand', () => {
      const commands = cli.commands;
      const alertsCmd = commands.find((cmd) => cmd.name() === 'alerts');
      const subcommands = alertsCmd?.commands || [];
      const cancelCmd = subcommands.find((cmd) => cmd.name() === 'cancellations');
      expect(cancelCmd).toBeDefined();
    });

    it('should have occupancy subcommand', () => {
      const commands = cli.commands;
      const alertsCmd = commands.find((cmd) => cmd.name() === 'alerts');
      const subcommands = alertsCmd?.commands || [];
      const occupancyCmd = subcommands.find((cmd) => cmd.name() === 'occupancy');
      expect(occupancyCmd).toBeDefined();
    });

    it('should have summary subcommand', () => {
      const commands = cli.commands;
      const alertsCmd = commands.find((cmd) => cmd.name() === 'alerts');
      const subcommands = alertsCmd?.commands || [];
      const summaryCmd = subcommands.find((cmd) => cmd.name() === 'summary');
      expect(summaryCmd).toBeDefined();
    });
  });

  describe('Journey Plan Command', () => {
    it('should have subcommands', () => {
      const commands = cli.commands;
      const journeyCmd = commands.find((cmd) => cmd.name() === 'journey-plan');
      const subcommands = journeyCmd?.commands || [];
      expect(subcommands.length).toBeGreaterThan(0);
    });

    it('should have earliest subcommand', () => {
      const commands = cli.commands;
      const journeyCmd = commands.find((cmd) => cmd.name() === 'journey-plan');
      const subcommands = journeyCmd?.commands || [];
      const earliestCmd = subcommands.find((cmd) => cmd.name() === 'earliest');
      expect(earliestCmd).toBeDefined();
    });

    it('should have latest subcommand', () => {
      const commands = cli.commands;
      const journeyCmd = commands.find((cmd) => cmd.name() === 'journey-plan');
      const subcommands = journeyCmd?.commands || [];
      const latestCmd = subcommands.find((cmd) => cmd.name() === 'latest');
      expect(latestCmd).toBeDefined();
    });
  });

  describe('Transfers Command', () => {
    it('should have subcommands', () => {
      const commands = cli.commands;
      const transfersCmd = commands.find((cmd) => cmd.name() === 'transfers');
      const subcommands = transfersCmd?.commands || [];
      expect(subcommands.length).toBeGreaterThan(0);
    });

    it('should have best subcommand', () => {
      const commands = cli.commands;
      const transfersCmd = commands.find((cmd) => cmd.name() === 'transfers');
      const subcommands = transfersCmd?.commands || [];
      const bestCmd = subcommands.find((cmd) => cmd.name() === 'best');
      expect(bestCmd).toBeDefined();
    });

    it('should have compare subcommand', () => {
      const commands = cli.commands;
      const transfersCmd = commands.find((cmd) => cmd.name() === 'transfers');
      const subcommands = transfersCmd?.commands || [];
      const compareCmd = subcommands.find((cmd) => cmd.name() === 'compare');
      expect(compareCmd).toBeDefined();
    });
  });

  describe('Command Options', () => {
    it('stations should support --select option', () => {
      const commands = cli.commands;
      const stationsCmd = commands.find((cmd) => cmd.name() === 'stations');
      const opts = stationsCmd?.options || [];
      const selectOpt = opts.find((opt) => opt.long === '--select');
      expect(selectOpt).toBeDefined();
    });

    it('stations should support --filter option', () => {
      const commands = cli.commands;
      const stationsCmd = commands.find((cmd) => cmd.name() === 'stations');
      const opts = stationsCmd?.options || [];
      const filterOpt = opts.find((opt) => opt.long === '--filter');
      expect(filterOpt).toBeDefined();
    });

    it('stations should support --orderby option', () => {
      const commands = cli.commands;
      const stationsCmd = commands.find((cmd) => cmd.name() === 'stations');
      const opts = stationsCmd?.options || [];
      const orderbyOpt = opts.find((opt) => opt.long === '--orderby');
      expect(orderbyOpt).toBeDefined();
    });

    it('schedule subcommands should support --date option', () => {
      const commands = cli.commands;
      const scheduleCmd = commands.find((cmd) => cmd.name() === 'schedule');
      const subcommands = scheduleCmd?.commands || [];

      // Check that at least one subcommand has --date option
      const hasDateOption = subcommands.some((subcmd) => {
        const opts = subcmd.options || [];
        return opts.some((opt) => opt.long === '--date');
      });
      expect(hasDateOption).toBe(true);
    });

    it('occupancy should support --route option', () => {
      const commands = cli.commands;
      const occupancyCmd = commands.find((cmd) => cmd.name() === 'occupancy');
      const opts = occupancyCmd?.options || [];
      const routeOpt = opts.find((opt) => opt.long === '--route');
      expect(routeOpt).toBeDefined();
    });

    it('alerts should support --train option', () => {
      const commands = cli.commands;
      const alertsCmd = commands.find((cmd) => cmd.name() === 'alerts');
      const opts = alertsCmd?.options || [];
      const trainOpt = opts.find((opt) => opt.long === '--train');
      expect(trainOpt).toBeDefined();
    });

    it('journey-plan should support --departure-time option', () => {
      const commands = cli.commands;
      const journeyCmd = commands.find((cmd) => cmd.name() === 'journey-plan');
      const opts = journeyCmd?.options || [];
      const depOpt = opts.find((opt) => opt.long === '--departure-time');
      expect(depOpt).toBeDefined();
    });
  });
});
