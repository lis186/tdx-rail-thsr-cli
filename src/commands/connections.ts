/**
 * Connections Command
 * Check if connections between trains are feasible and safe
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import { ConnectionChecker } from '../lib/connection-checker.js';

export const connectionsCommand = new Command()
  .name('connections')
  .description('檢查列車轉運可行性')
  .argument('<train1>', '第一班列車號碼')
  .argument('<train2>', '第二班列車號碼')
  .argument('<station>', '轉運站')
  .option('--date <date>', '查詢日期 (格式: YYYY-MM-DD)', new Date().toISOString().split('T')[0])
  .action(handleConnectionsCommand);

async function handleConnectionsCommand(
  train1: string,
  train2: string,
  station: string,
  options: {
    date: string;
  }
) {
  const checker = new ConnectionChecker();

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    console.log('\n❌ 日期格式錯誤，請使用 YYYY-MM-DD 格式\n');
    return;
  }

  const connection = checker.checkConnection(train1, train2, station, options.date);

  if (!connection) {
    console.log(
      `\n❌ 無法找到列車 ${train1} 和 ${train2} 在 ${station} 的連接資訊\n`
    );
    return;
  }

  const riskSummary = checker.getRiskSummary(connection.risks);

  console.log('\n🔗 列車連接可行性檢查');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`路線: ${train1} → ${train2}`);
  console.log(`轉運站: ${station}`);
  console.log(`日期: ${options.date}\n`);

  // Feasibility result
  const feasibilityEmoji = connection.feasible ? '✅' : '❌';
  console.log(`可行性: ${feasibilityEmoji} ${connection.feasible ? '可行' : '不可行'}`);
  console.log(`信心度: ${connection.confidence}%`);
  console.log(`可行性評分: ${checker.getRatingEmoji(connection.score)} ${connection.score}/100\n`);

  // Timing information
  console.log('時間資訊:');
  console.log(`  第一班列車到達: ${connection.arrivalTime}`);
  console.log(`  第二班列車出發: ${connection.departureTime}`);
  console.log(`  轉運時間: ${connection.waitTime} 分鐘\n`);

  // Risk assessment
  console.log('風險評估:');
  console.log(`  🔴 高風險: ${riskSummary.high}`);
  console.log(`  🟡 中風險: ${riskSummary.medium}`);
  console.log(`  🟢 低風險: ${riskSummary.low}\n`);

  // Detailed risks
  if (connection.risks.length > 0) {
    console.log('風險詳情:');
    for (const risk of connection.risks) {
      const levelEmoji = {
        High: '🔴',
        Medium: '🟡',
        Low: '🟢',
      };
      console.log(`  ${levelEmoji[risk.level]} [${risk.type}] ${risk.message}`);
    }
    console.log();
  }

  // Recommendations
  console.log('建議:');
  for (const rec of connection.recommendations) {
    console.log(`  ${rec}`);
  }
  console.log();
}

// Subcommand for checking multiple connections
const findCommand = new Command()
  .name('find')
  .description('尋找可行的轉運組合')
  .argument('<from>', '出發站')
  .argument('<to>', '目的地站')
  .argument('<via>', '轉運站')
  .option('--date <date>', '查詢日期 (格式: YYYY-MM-DD)', new Date().toISOString().split('T')[0])
  .option('--min-confidence <percent>', '最低信心度百分比', '50')
  .action(handleFindCommand);

async function handleFindCommand(
  from: string,
  to: string,
  via: string,
  options: {
    date: string;
    'min-confidence'?: string;
  }
) {
  const checker = new ConnectionChecker();

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    console.log('\n❌ 日期格式錯誤，請使用 YYYY-MM-DD 格式\n');
    return;
  }

  const minConfidence = parseInt(options['min-confidence'] || '50', 10);
  const connections = checker.getFeasibleConnections(from, to, via, options.date, minConfidence);

  console.log('\n🔗 可行的轉運組合');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`路線: ${from} → ${via} → ${to}`);
  console.log(`日期: ${options.date}`);
  console.log(`最低信心度: ${minConfidence}%`);
  console.log(`找到 ${connections.length} 個可行的轉運組合\n`);

  if (connections.length === 0) {
    console.log('❌ 未找到滿足條件的轉運組合\n');
    return;
  }

  // Show top 5 connections
  const topConnections = connections.slice(0, 5);

  const table = new Table({
    head: ['順序', '列車', '轉運時間', '信心度', '評分', '風險'],
    style: { head: [], border: ['cyan'] },
  });

  for (let i = 0; i < topConnections.length; i++) {
    const conn = topConnections[i];
    const riskCount = conn.risks.length;
    table.push([
      String(i + 1),
      `${conn.firstTrain}→${conn.secondTrain}`,
      `${conn.waitTime} 分`,
      `${conn.confidence}%`,
      `${checker.getRatingEmoji(conn.score)} ${conn.score}`,
      `${riskCount} 項`,
    ]);
  }

  console.log(table.toString());
  console.log();

  // Show details of best connection
  if (topConnections.length > 0) {
    const best = topConnections[0];
    console.log('💡 最佳方案詳情:');
    console.log(`  列車: ${best.firstTrain} → ${best.secondTrain}`);
    console.log(`  轉運時間: ${best.waitTime} 分鐘`);
    console.log(`  可行性評分: ${best.score}/100\n`);
    console.log('  建議:');
    for (const rec of best.recommendations) {
      console.log(`    ${rec}`);
    }
    console.log();
  }
}

// Subcommand for quick check
const quickCommand = new Command()
  .name('quick')
  .description('快速連接檢查')
  .argument('<train1>', '第一班列車')
  .argument('<train2>', '第二班列車')
  .option('--date <date>', '查詢日期 (格式: YYYY-MM-DD)', new Date().toISOString().split('T')[0])
  .action(handleQuickCommand);

async function handleQuickCommand(
  train1: string,
  train2: string,
  options: {
    date: string;
  }
) {
  const checker = new ConnectionChecker();

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    console.log('\n❌ 日期格式錯誤，請使用 YYYY-MM-DD 格式\n');
    return;
  }

  // Try common transfer stations
  const commonStations = ['台北', '台中', '新竹', '嘉義'];
  const validConnections = [];

  for (const station of commonStations) {
    const connection = checker.checkConnection(train1, train2, station, options.date);
    if (connection && connection.feasible) {
      validConnections.push(connection);
    }
  }

  console.log('\n⚡ 快速連接檢查');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`列車: ${train1} → ${train2}`);
  console.log(`日期: ${options.date}\n`);

  if (validConnections.length === 0) {
    console.log('❌ 列車之間沒有可行的轉運\n');
    return;
  }

  console.log(`找到 ${validConnections.length} 個可行的轉運:\n`);

  for (const conn of validConnections) {
    const rating = checker.getRatingEmoji(conn.score);
    console.log(`${rating} 在 ${conn.transferStation}:`);
    console.log(`   到達: ${conn.arrivalTime} | 出發: ${conn.departureTime} | 等待: ${conn.waitTime}分`);
    console.log(`   評分: ${conn.score}/100 | 信心度: ${conn.confidence}%\n`);
  }
}

// Add subcommands
connectionsCommand.addCommand(findCommand);
connectionsCommand.addCommand(quickCommand);
