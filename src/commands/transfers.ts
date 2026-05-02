/**
 * Transfers Command
 * Find optimal transfer options between stations
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import { TransfersResolver } from '../lib/transfers-resolver.js';
import { loadSchedules, loadStations } from '../services/data-source.js';

export const transfersCommand = new Command()
  .name('transfers')
  .description('轉運選項建議')
  .argument('<from>', '出發站')
  .argument('<to>', '目的地站')
  .option('--date <date>', '旅程日期 (格式: YYYY-MM-DD)', new Date().toISOString().split('T')[0])
  .option('--max-wait <minutes>', '最大轉運等待時間 (分鐘)', '120')
  .option('--prefer-short-wait', '優先選擇短轉運時間', false)
  .option('--hub <station>', '指定轉運站')
  .action(handleTransfersCommand);

async function handleTransfersCommand(
  from: string,
  to: string,
  options: {
    date: string;
    'max-wait'?: string;
    'prefer-short-wait'?: boolean;
    hub?: string;
  }
) {
  const resolver = new TransfersResolver(await loadSchedules(), await loadStations());

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    console.log('\n❌ 日期格式錯誤，請使用 YYYY-MM-DD 格式\n');
    return;
  }

  const maxWait = parseInt(options['max-wait'] || '120', 10);

  let transfers;

  if (options.hub) {
    // Get transfers for specific hub
    transfers = resolver.getTransfersViaHub(from, to, options.hub, options.date);
  } else {
    // Get all available transfers
    transfers = resolver.findTransfers(from, to, options.date, maxWait);
  }

  if (!transfers || transfers.length === 0) {
    console.log(
      `\n❌ 找不到從 \"${from}\" 到 \"${to}\" 的轉運選項\n`
    );
    return;
  }

  console.log('\n🔄 轉運選項');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`路線: ${transfers[0].fromStation} → ${transfers[0].toStation}`);
  console.log(`日期: ${options.date}`);
  console.log(`找到 ${transfers.length} 個轉運選項\n`);

  // Show top 5 transfer options
  const topTransfers = transfers.slice(0, 5);

  for (let i = 0; i < topTransfers.length; i++) {
    const transfer = topTransfers[i];

    console.log(`選項 ${i + 1} - 轉運站: ${transfer.connectingStation}`);
    console.log('  ├─ 第一段: 列車 ' + transfer.departTrain);
    console.log(`  │  ├─ 出發: ${transfer.departTime}`);
    console.log(`  │  └─ 抵達: ${transfer.connectTime}`);
    console.log('  └─ 第二段: 列車 ' + transfer.connectTrain);
    console.log(`     ├─ 出發: ${transfer.connectTime}`);
    console.log(`     └─ 轉運時間: ${resolver.formatDuration(transfer.transferWaitTime)}`);
    console.log(`  全程時間: ${resolver.formatDuration(transfer.totalDuration)}\n`);
  }

  // Show summary table
  const table = new Table({
    head: ['選項', '轉運站', '第一列車', '第二列車', '轉運時間', '全程時間'],
    style: { head: [], border: ['cyan'] },
  });

  for (let i = 0; i < topTransfers.length; i++) {
    const t = topTransfers[i];
    table.push([
      String(i + 1),
      t.connectingStation,
      t.departTrain,
      t.connectTrain,
      resolver.formatDuration(t.transferWaitTime),
      resolver.formatDuration(t.totalDuration),
    ]);
  }

  console.log(table.toString());
  console.log();
}

// Create subcommand for best transfer
//
// `--date` lives only on the parent transfersCommand. Subcommands read it via
// optsWithGlobals() so the value isn't shadowed by a same-named local option
// (commander v12 lets the parent consume the flag before subcommand routing,
// leaving a duplicate subcommand option permanently on its default).
const bestCommand = new Command()
  .name('best')
  .description('最佳轉運選項')
  .argument('<from>', '出發站')
  .argument('<to>', '目的地站')
  .option('--prefer-short-wait', '優先選擇短轉運時間', false)
  .action(handleBestTransferCommand);

async function handleBestTransferCommand(
  from: string,
  to: string,
  options: {
    'prefer-short-wait'?: boolean;
  },
  command: Command,
) {
  const resolver = new TransfersResolver(await loadSchedules(), await loadStations());
  const date = command.optsWithGlobals().date as string;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.log('\n❌ 日期格式錯誤，請使用 YYYY-MM-DD 格式\n');
    return;
  }

  const bestTransfer = resolver.findBestTransfer(from, to, date, options['prefer-short-wait']);

  if (!bestTransfer) {
    console.log(`\n❌ 找不到從 \"${from}\" 到 \"${to}\" 的轉運選項\n`);
    return;
  }

  console.log('\n🏆 最佳轉運選項');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`路線: ${bestTransfer.fromStation} → ${bestTransfer.toStation}`);
  console.log(`轉運站: ${bestTransfer.connectingStation}`);
  console.log(`日期: ${date}\n`);

  console.log('第一段列車:');
  console.log(`  列車號: ${bestTransfer.departTrain}`);
  console.log(`  出發: ${bestTransfer.departTime}`);
  console.log(`  抵達轉運站: ${bestTransfer.connectTime}\n`);

  console.log('第二段列車:');
  console.log(`  列車號: ${bestTransfer.connectTrain}`);
  console.log(`  出發: ${bestTransfer.connectTime}\n`);

  console.log('轉運資訊:');
  console.log(`  轉運等待時間: ${resolver.formatDuration(bestTransfer.transferWaitTime)}`);
  console.log(`  全程耗時: ${resolver.formatDuration(bestTransfer.totalDuration)}\n`);
}

// Create subcommand for comparing transfers — see `bestCommand` for why
// `--date` is parent-only.
const compareCommand = new Command()
  .name('compare')
  .description('比較轉運選項')
  .argument('<from>', '出發站')
  .argument('<to>', '目的地站')
  .option('--limit <count>', '顯示轉運選項數量', '10')
  .action(handleCompareTransfersCommand);

async function handleCompareTransfersCommand(
  from: string,
  to: string,
  options: {
    limit?: string;
  },
  command: Command,
) {
  const resolver = new TransfersResolver(await loadSchedules(), await loadStations());
  const date = command.optsWithGlobals().date as string;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.log('\n❌ 日期格式錯誤，請使用 YYYY-MM-DD 格式\n');
    return;
  }

  const limit = parseInt(options.limit || '10', 10);
  const transfers = resolver.findTransfers(from, to, date);

  if (!transfers || transfers.length === 0) {
    console.log(`\n❌ 找不到從 \"${from}\" 到 \"${to}\" 的轉運選項\n`);
    return;
  }

  console.log('\n📊 轉運選項比較');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`路線: ${transfers[0].fromStation} → ${transfers[0].toStation}`);
  console.log(`日期: ${date}`);
  console.log(`共找到 ${transfers.length} 個選項 (顯示前 ${Math.min(limit, transfers.length)} 個)\n`);

  const table = new Table({
    head: ['序號', '轉運站', '第一列車', '第二列車', '轉運時間', '全程時間'],
    style: { head: [], border: ['cyan'] },
  });

  const displayTransfers = transfers.slice(0, limit);
  for (let i = 0; i < displayTransfers.length; i++) {
    const t = displayTransfers[i];
    table.push([
      String(i + 1),
      t.connectingStation,
      t.departTrain,
      t.connectTrain,
      resolver.formatDuration(t.transferWaitTime),
      resolver.formatDuration(t.totalDuration),
    ]);
  }

  console.log(table.toString());
  console.log();
}

// Add subcommands
transfersCommand.addCommand(bestCommand);
transfersCommand.addCommand(compareCommand);
