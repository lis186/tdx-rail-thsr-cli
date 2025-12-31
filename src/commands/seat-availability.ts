/**
 * Seat Availability Command
 * Query available seats on trains
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import { AvailabilityResolver } from '../lib/availability-resolver.js';
import availabilityData from '../data/availability.js';

export const seatAvailabilityCommand = new Command()
  .name('seat-availability')
  .description('查詢高鐵座位可用性')
  .action(handleSeatAvailabilityCommand);

async function handleSeatAvailabilityCommand() {
  const resolver = new AvailabilityResolver(availabilityData);
  const dates = resolver.listDates();

  if (dates.length === 0) {
    console.log('\n❌ 沒有座位可用性資訊\n');
    return;
  }

  const avails = resolver.getAvailabilitiesByDate(dates[0]);

  if (avails.length === 0) {
    console.log('\n❌ 沒有座位可用性資訊\n');
    return;
  }

  console.log(`\n🎫 座位可用性 (${dates[0]})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();

  const table = new Table({
    head: ['列車', '路線', '標準艙', '商務艙'],
    style: { head: [], border: ['cyan'] },
  });

  for (const avail of avails) {
    const stdSeats = `${avail.standard.available}/${avail.standard.total}`;
    const busSeats = `${avail.business.available}/${avail.business.total}`;
    table.push([avail.trainNumber, `${avail.from}→${avail.to}`, stdSeats, busSeats]);
  }

  console.log(table.toString());
  console.log();
}

// Create train subcommand
const trainCommand = new Command()
  .name('train')
  .description('查詢列車座位可用性')
  .argument('<train-number>', '列車號碼')
  .option('--date <date>', '查詢日期 (格式: YYYY-MM-DD)')
  .action(handleTrainCommand);

async function handleTrainCommand(
  trainNumber: string,
  options: { date?: string }
) {
  const resolver = new AvailabilityResolver(availabilityData);
  const dates = resolver.listDates();
  const queryDate = options.date || dates[0];

  if (!queryDate) {
    console.log('\n❌ 沒有座位可用性資訊\n');
    return;
  }

  const avail = resolver.getAvailability(trainNumber, queryDate);

  if (!avail) {
    console.log(`\n❌ 找不到列車 ${trainNumber} 的座位資訊\n`);
    return;
  }

  console.log(`\n🎫 列車 ${trainNumber} 座位可用性`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`路線: ${avail.from} → ${avail.to}`);
  console.log(`日期: ${avail.date}\n`);

  // Standard seats
  console.log('標準艙');
  const stdPercent = Math.round(
    ((avail.standard.total - avail.standard.available) / avail.standard.total) * 100
  );
  console.log(
    `  可用座位: ${avail.standard.available}/${avail.standard.total} [${stdPercent}%已訂]`
  );

  // Business seats
  console.log('\n商務艙');
  const busPercent = Math.round(
    ((avail.business.total - avail.business.available) / avail.business.total) * 100
  );
  console.log(
    `  可用座位: ${avail.business.available}/${avail.business.total} [${busPercent}%已訂]`
  );
  console.log();
}

// Add subcommand
seatAvailabilityCommand.addCommand(trainCommand);
