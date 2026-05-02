/**
 * Alerts Command
 * Wraps TDX /AlertInfo for THSR.
 *
 * The live response only carries announcement-shaped fields (Title, Status,
 * publish/start timestamps). It does NOT expose per-train delay minutes,
 * cancellation flags, severity, or occupancy — every such field that the
 * fixture-era code referenced was fabricated. This command therefore lists
 * raw alerts and offers no severity/type/delay subcommands.
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import { loadAlerts } from '../services/data-source.js';

export const alertsCommand = new Command()
  .name('alerts')
  .description('查詢高鐵警報公告 (TDX /AlertInfo)')
  .option('--status <status>', '依 Status 字串篩選 (例: Normal)')
  .action(async (options: { status?: string }) => {
    const all = await loadAlerts();
    const filtered = options.status
      ? all.filter((a) => a.Status === options.status)
      : all;

    console.log('\n📡 高鐵警報公告');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`共 ${filtered.length} 則 (TDX /AlertInfo)\n`);

    if (filtered.length === 0) {
      console.log(
        all.length === 0
          ? '✅ 目前無 TDX 警報公告\n'
          : `✅ 沒有狀態為 "${options.status}" 的警報\n`,
      );
      return;
    }

    const table = new Table({
      head: ['標題', 'Status', '發布時間'],
      style: { head: [], border: ['cyan'] },
      colWidths: [40, 15, 30],
      wordWrap: true,
    });
    for (const a of filtered) {
      table.push([a.Title, a.Status || '-', a.PublishTime || a.UpdateTime || '-']);
    }
    console.log(table.toString());
    console.log();
  });
