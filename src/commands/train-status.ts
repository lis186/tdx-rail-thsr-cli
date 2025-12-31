/**
 * Train Status Command
 * Query real-time train status information
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import { TrainStatusResolver } from '../lib/train-status-resolver.js';
import trainStatusData from '../data/train-status.js';

export const trainStatusCommand = new Command()
  .name('train-status')
  .description('查詢高鐵列車實時狀態')
  .action(handleTrainStatusCommand);

async function handleTrainStatusCommand() {
  const resolver = new TrainStatusResolver(trainStatusData);
  const allStatuses = resolver.getAllTrainStatuses();

  console.log('\n🚄 高鐵列車實時狀態');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (allStatuses.length === 0) {
    console.log('❌ 沒有列車狀態資訊\n');
    return;
  }

  const table = new Table({
    head: ['列車', '狀態', '目前車站', '下一車站', '延遲', '更新時間'],
    style: { head: [], border: ['cyan'] },
  });

  for (const status of allStatuses) {
    const statusDisplay =
      status.status === 'OnTime'
        ? '✅ 準時'
        : status.status === 'Delayed'
          ? '⚠️  延誤'
          : '❌ 取消';

    const delayDisplay =
      status.delayMinutes && status.delayMinutes > 0
        ? `${status.delayMinutes}分鐘`
        : '-';

    table.push([
      status.trainNumber,
      statusDisplay,
      status.currentStation,
      status.nextStation || '-',
      delayDisplay,
      status.updateTime.split('T')[1]?.substring(0, 5) || '-',
    ]);
  }

  console.log(table.toString());
  console.log(`\n共 ${allStatuses.length} 班列車\n`);
}

// Create train subcommand
const trainCommand = new Command()
  .name('train')
  .description('查詢特定列車實時狀態')
  .argument('<train-number>', '列車號碼')
  .action(handleTrainCommand);

async function handleTrainCommand(trainNumber: string) {
  const resolver = new TrainStatusResolver(trainStatusData);
  const status = resolver.getTrainStatus(trainNumber);

  if (!status) {
    console.log(`\n❌ 找不到列車 ${trainNumber} 的狀態資訊\n`);
    return;
  }

  console.log('\n🚆 列車實時狀態');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`列車號: ${status.trainNumber}`);

  const statusDisplay =
    status.status === 'OnTime'
      ? '✅ 準時運行'
      : status.status === 'Delayed'
        ? '⚠️  延誤'
        : status.status === 'Cancelled'
          ? '❌ 已取消'
          : '⏳ 未發車';

  console.log(`狀態: ${statusDisplay}`);
  console.log(`目前位置: ${status.currentStation}`);

  if (status.nextStation) {
    console.log(`下一站: ${status.nextStation}`);
  }

  if (status.delayMinutes && status.delayMinutes > 0) {
    console.log(`延遲時間: ${status.delayMinutes} 分鐘`);
  }

  if (status.scheduledDepartureTime) {
    console.log(`預定出發: ${status.scheduledDepartureTime}`);
  }

  if (status.actualDepartureTime) {
    console.log(`實際出發: ${status.actualDepartureTime}`);
  }

  console.log(`更新時間: ${status.updateTime}`);
  console.log();
}

// Create station subcommand
const stationCommand = new Command()
  .name('station')
  .description('查詢經過指定車站的列車狀態')
  .argument('<station>', '車站名稱')
  .action(handleStationCommand);

async function handleStationCommand(station: string) {
  const resolver = new TrainStatusResolver(trainStatusData);
  const statuses = resolver.getStatusesByStation(station);

  if (statuses.length === 0) {
    console.log(`\n❌ 找不到經過 "${station}" 的列車狀態\n`);
    return;
  }

  console.log(`\n🚄 經過 ${station} 的列車狀態`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();

  const table = new Table({
    head: ['列車', '狀態', '下一車站', '延遲', '預定出發'],
    style: { head: [], border: ['cyan'] },
  });

  for (const status of statuses) {
    const statusDisplay =
      status.status === 'OnTime'
        ? '✅ 準時'
        : status.status === 'Delayed'
          ? '⚠️  延誤'
          : '❌ 取消';

    const delayDisplay =
      status.delayMinutes && status.delayMinutes > 0
        ? `${status.delayMinutes}分`
        : '-';

    table.push([
      status.trainNumber,
      statusDisplay,
      status.nextStation || '-',
      delayDisplay,
      status.scheduledDepartureTime || '-',
    ]);
  }

  console.log(table.toString());
  console.log(`\n共 ${statuses.length} 班列車\n`);
}

// Create filter subcommand
const filterCommand = new Command()
  .name('filter')
  .description('篩選列車狀態')
  .option(
    '--status <status>',
    '狀態篩選 (OnTime|Delayed|Cancelled)',
    'Delayed'
  )
  .option('--delay-greater-than <minutes>', '延誤時間篩選 (分鐘)', '0')
  .action(handleFilterCommand);

async function handleFilterCommand(options: {
  status?: string;
  'delay-greater-than'?: string;
}) {
  const resolver = new TrainStatusResolver(trainStatusData);
  let statuses;

  if (
    options['delay-greater-than'] &&
    parseInt(options['delay-greater-than'], 10) > 0
  ) {
    statuses = resolver.getTrainsWithDelayGreaterThan(
      parseInt(options['delay-greater-than'], 10)
    );
  } else if (options.status === 'Delayed') {
    statuses = resolver.getDelayedTrains();
  } else if (options.status === 'Cancelled') {
    statuses = resolver.getCancelledTrains();
  } else {
    statuses = resolver.getAllTrainStatuses();
  }

  if (statuses.length === 0) {
    console.log('\n❌ 沒有符合篩選條件的列車\n');
    return;
  }

  console.log(`\n🚄 列車狀態篩選結果`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();

  const table = new Table({
    head: ['列車', '狀態', '目前車站', '延遲', '下一站'],
    style: { head: [], border: ['cyan'] },
  });

  for (const status of statuses) {
    const statusDisplay =
      status.status === 'OnTime'
        ? '✅ 準時'
        : status.status === 'Delayed'
          ? '⚠️  延誤'
          : '❌ 取消';

    const delayDisplay =
      status.delayMinutes && status.delayMinutes > 0
        ? `${status.delayMinutes}分`
        : '-';

    table.push([
      status.trainNumber,
      statusDisplay,
      status.currentStation,
      delayDisplay,
      status.nextStation || '-',
    ]);
  }

  console.log(table.toString());
  console.log(`\n共 ${statuses.length} 班列車\n`);
}

// Add subcommands
trainStatusCommand.addCommand(trainCommand);
trainStatusCommand.addCommand(stationCommand);
trainStatusCommand.addCommand(filterCommand);
