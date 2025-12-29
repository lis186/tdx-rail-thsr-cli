/**
 * Health Check Command
 * Check TDX API connectivity
 */

import { Command } from 'commander';
import { TDXApiClient } from '../services/api.js';
import { ConfigService } from '../services/config.js';

export const healthCommand = new Command()
  .name('health')
  .description('檢查 TDX API 連線狀態')
  .action(handleHealthCommand);

async function handleHealthCommand() {
  try {
    const config = new ConfigService();
    const client = new TDXApiClient(
      config.getClientId(),
      config.getClientSecret()
    );

    const health = await client.health();

    if (health.status === 'healthy') {
      console.log(`\n✅ ${health.message}\n`);
      process.exit(0);
    } else {
      console.log(`\n❌ ${health.message}\n`);
      process.exit(1);
    }
  } catch (error) {
    console.log(`\n❌ 錯誤: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    process.exit(1);
  }
}
