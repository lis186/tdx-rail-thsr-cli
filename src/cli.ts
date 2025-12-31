import { Command } from 'commander';
import { stationsCommand } from './commands/stations.js';
import { fareCommand } from './commands/fare.js';
import { operatorCommand } from './commands/operator.js';
import { scheduleCommand } from './commands/schedule.js';
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
cli.addCommand(operatorCommand);
cli.addCommand(scheduleCommand);
cli.addCommand(healthCommand);

// Add help
cli.addHelpCommand();
