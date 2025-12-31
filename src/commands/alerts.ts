/**
 * Alerts Command
 * Real-time alerts for train delays, cancellations, and service disruptions
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import { AlertsResolver, type AlertType, type AlertSeverity } from '../lib/alerts-resolver.js';

export const alertsCommand = new Command()
  .name('alerts')
  .description('列車實時警報')
  .option('--train <train-number>', '特定列車警報')
  .option('--type <type>', '警報類型 (Delay, Cancellation, Occupancy, ServiceDisruption)')
  .option('--severity <severity>', '警報級別 (Info, Warning, Critical)')
  .option('--unresolved', '僅顯示未解決警報', true)
  .action(handleAlertsCommand);

async function handleAlertsCommand(options: {
  train?: string;
  type?: string;
  severity?: string;
  unresolved?: boolean;
}) {
  const resolver = new AlertsResolver();

  const alerts = resolver.getAllAlerts({
    trainNumber: options.train,
    alertType: options.type as AlertType | undefined,
    severity: options.severity as AlertSeverity | undefined,
    onlyUnresolved: options.unresolved,
  });

  const summary = resolver.getAlertSummary();

  console.log('\n📡 列車實時警報');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`總警報數: ${summary.total} | 未解決: ${summary.unresolved}`);
  console.log(
    `危急: ${summary.bySeverity.Critical} | 警告: ${summary.bySeverity.Warning} | 提示: ${summary.bySeverity.Info}\n`
  );

  if (alerts.length === 0) {
    console.log('✅ 沒有活動警報\n');
    return;
  }

  const table = new Table({
    head: ['列車', '類型', '級別', '訊息'],
    style: { head: [], border: ['cyan'] },
    colWidths: [10, 15, 10, 50],
  });

  for (const alert of alerts) {
    const severityColor = {
      Critical: '🚨',
      Warning: '⚠️',
      Info: 'ℹ️',
    };
    table.push([
      alert.trainNumber,
      alert.alertType,
      `${severityColor[alert.severity]} ${alert.severity}`,
      alert.message,
    ]);
  }

  console.log(table.toString());
  console.log();
}

// Subcommand for critical alerts
const criticalCommand = new Command()
  .name('critical')
  .description('緊急警報 (Critical)')
  .action(handleCriticalCommand);

async function handleCriticalCommand() {
  const resolver = new AlertsResolver();
  const alerts = resolver.getCriticalAlerts();

  console.log('\n🚨 緊急警報');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`共 ${alerts.length} 個緊急警報\n`);

  if (alerts.length === 0) {
    console.log('✅ 目前沒有緊急警報\n');
    return;
  }

  const table = new Table({
    head: ['列車', '警報類型', '詳細訊息'],
    style: { head: [], border: ['red'] },
  });

  for (const alert of alerts) {
    table.push([alert.trainNumber, alert.alertType, alert.message]);
  }

  console.log(table.toString());
  console.log();
}

// Subcommand for delays
const delaysCommand = new Command()
  .name('delays')
  .description('延誤警報')
  .option('--min-delay <minutes>', '最小延誤時間 (分鐘)', '0')
  .action(handleDelaysCommand);

async function handleDelaysCommand(options: { 'min-delay'?: string }) {
  const resolver = new AlertsResolver();
  let alerts = resolver.getDelayAlerts();

  const minDelay = parseInt(options['min-delay'] || '0', 10);
  if (minDelay > 0) {
    alerts = alerts.filter((a) => (a.delayMinutes || 0) >= minDelay);
  }

  console.log('\n⏱️  列車延誤警報');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`共 ${alerts.length} 班列車延誤\n`);

  if (alerts.length === 0) {
    console.log('✅ 目前沒有延誤列車\n');
    return;
  }

  const table = new Table({
    head: ['列車', '延誤時間', '目前位置', '訊息'],
    style: { head: [], border: ['yellow'] },
  });

  for (const alert of alerts) {
    table.push([
      alert.trainNumber,
      `${alert.delayMinutes || 0} 分鐘`,
      alert.affectedStation || '未知',
      alert.message,
    ]);
  }

  console.log(table.toString());
  console.log();
}

// Subcommand for cancellations
const cancelsCommand = new Command()
  .name('cancellations')
  .description('取消警報')
  .action(handleCancelsCommand);

async function handleCancelsCommand() {
  const resolver = new AlertsResolver();
  const alerts = resolver.getCancellationAlerts();

  console.log('\n❌ 列車取消警報');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`共 ${alerts.length} 班列車已取消\n`);

  if (alerts.length === 0) {
    console.log('✅ 目前沒有取消的列車\n');
    return;
  }

  const table = new Table({
    head: ['列車', '影響站點', '訊息'],
    style: { head: [], border: ['red'] },
  });

  for (const alert of alerts) {
    table.push([alert.trainNumber, alert.affectedStation || '全線', alert.message]);
  }

  console.log(table.toString());
  console.log();
}

// Subcommand for occupancy alerts
const occupancyCommand = new Command()
  .name('occupancy')
  .description('載客率警報')
  .action(handleOccupancyCommand);

async function handleOccupancyCommand() {
  const resolver = new AlertsResolver();
  const alerts = resolver.getOccupancyAlerts();

  console.log('\n👥 列車載客率警報');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`共 ${alerts.length} 班列車載客率過高\n`);

  if (alerts.length === 0) {
    console.log('✅ 目前沒有擁擠的列車\n');
    return;
  }

  const table = new Table({
    head: ['列車', '載客率', '訊息'],
    style: { head: [], border: ['yellow'] },
  });

  for (const alert of alerts) {
    table.push([
      alert.trainNumber,
      `${alert.occupancyRate || 0}%`,
      alert.message,
    ]);
  }

  console.log(table.toString());
  console.log();
}

// Subcommand for summary
const summaryCommand = new Command()
  .name('summary')
  .description('警報統計摘要')
  .action(handleSummaryCommand);

async function handleSummaryCommand() {
  const resolver = new AlertsResolver();
  const summary = resolver.getAlertSummary();
  const affectedStations = resolver.getAffectedStations();

  console.log('\n📊 警報統計摘要');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('整體統計:');
  console.log(`  總警報數: ${summary.total}`);
  console.log(`  未解決: ${summary.unresolved}`);
  console.log(`  已解決: ${summary.total - summary.unresolved}\n`);

  console.log('按級別分類:');
  console.log(`  🚨 危急 (Critical): ${summary.bySeverity.Critical}`);
  console.log(`  ⚠️  警告 (Warning): ${summary.bySeverity.Warning}`);
  console.log(`  ℹ️  提示 (Info): ${summary.bySeverity.Info}\n`);

  console.log('按類型分類:');
  console.log(`  延誤: ${summary.byType.Delay}`);
  console.log(`  取消: ${summary.byType.Cancellation}`);
  console.log(`  載客率: ${summary.byType.Occupancy}`);
  console.log(`  服務中斷: ${summary.byType.ServiceDisruption}`);
  console.log(`  維護: ${summary.byType.Maintenance}`);
  console.log(`  其他: ${summary.byType.Other}\n`);

  if (affectedStations.length > 0) {
    console.log(`受影響車站 (${affectedStations.length}):  ${affectedStations.join(', ')}\n`);
  }
}

// Add subcommands
alertsCommand.addCommand(criticalCommand);
alertsCommand.addCommand(delaysCommand);
alertsCommand.addCommand(cancelsCommand);
alertsCommand.addCommand(occupancyCommand);
alertsCommand.addCommand(summaryCommand);
