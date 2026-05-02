import { Command } from 'commander';
import { stationsCommand } from './commands/stations.js';
import { fareCommand } from './commands/fare.js';
import { scheduleCommand } from './commands/schedule.js';
import { seatAvailabilityCommand } from './commands/seat-availability.js';
import { journeyPlanCommand } from './commands/journey-plan.js';
import { transfersCommand } from './commands/transfers.js';
import { alertsCommand } from './commands/alerts.js';
import { newsCommand } from './commands/news.js';
import { healthCommand } from './commands/health.js';

export const cli = new Command();

cli
  .name('thsr')
  .description('台灣高鐵 (THSR) CLI 工具，由 TDX API 驅動')
  .version('0.1.0');

// Global options
cli
  .option('-f, --format <format>', '輸出格式: json (default) | table', 'json')
  .option('-q, --quiet', '安靜模式')
  .option('-v, --verbose', '詳細模式');

// Register commands
cli.addCommand(stationsCommand);
cli.addCommand(fareCommand);
cli.addCommand(scheduleCommand);
cli.addCommand(seatAvailabilityCommand);
cli.addCommand(alertsCommand);
cli.addCommand(newsCommand);
cli.addCommand(journeyPlanCommand);
cli.addCommand(transfersCommand);
cli.addCommand(healthCommand);

// Add help
cli.addHelpCommand();
