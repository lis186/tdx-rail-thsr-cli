/**
 * Service Status Command
 * Query overall THSR service status and alerts
 */

import { Command } from 'commander';
import Table from 'cli-table3';

export const serviceStatusCommand = new Command()
  .name('service-status')
  .description('查詢高鐵整體服務狀態')
  .action(handleServiceStatusCommand);

async function handleServiceStatusCommand() {
  // For now, return a simulated service status
  const overallStatus = 'Normal';
  const alerts: Array<{ type: string; message: string; severity: string }> = [
    {
      type: 'Maintenance',
      message: '新竹站12/31進行月度維護',
      severity: 'Info',
    },
  ];

  console.log('\n📊 高鐵服務狀態');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const statusDisplay =
    overallStatus === 'Normal'
      ? '✅ 正常運行'
      : overallStatus === 'Warning'
        ? '⚠️  警告'
        : '❌ 關鍵';

  console.log(`整體狀態: ${statusDisplay}`);
  console.log(`更新時間: ${new Date().toLocaleString('zh-TW')}\n`);

  if (alerts.length > 0) {
    console.log('📢 重要通知:');
    const table = new Table({
      head: ['類型', '訊息', '嚴重度'],
      style: { head: [], border: ['cyan'] },
    });

    for (const alert of alerts) {
      const severityDisplay =
        alert.severity === 'Info'
          ? 'ℹ️  '
          : alert.severity === 'Warning'
            ? '⚠️  '
            : '❌';
      table.push([alert.type, alert.message, severityDisplay]);
    }

    console.log(table.toString());
  } else {
    console.log('✅ 目前沒有重要通知');
  }

  console.log();
}
