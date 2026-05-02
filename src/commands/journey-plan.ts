/**
 * Journey Plan Command
 * Plan optimal journeys between stations with time and transfer preferences
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import { JourneyPlanResolver } from '../lib/journey-planner.js';
import { loadSchedules, loadStations } from '../services/data-source.js';

export const journeyPlanCommand = new Command()
  .name('journey-plan')
  .description('規劃最優行程')
  .argument('<from>', '出發站')
  .argument('<to>', '目的地站')
  .option('--date <date>', '旅程日期 (格式: YYYY-MM-DD)', new Date().toISOString().split('T')[0])
  .option('--departure-time <time>', '出發時間 (格式: HH:MM)')
  .option('--arrival-time <time>', '到達時間 (格式: HH:MM)')
  .option('--allow-transfers', '允許轉運', false)
  .option('--max-transfer-time <minutes>', '最大轉運等待時間 (分鐘)', '30')
  .action(handleJourneyPlanCommand);

async function handleJourneyPlanCommand(
  from: string,
  to: string,
  options: {
    date: string;
    'departure-time'?: string;
    'arrival-time'?: string;
    'allow-transfers'?: boolean;
    'max-transfer-time'?: string;
  }
) {
  const resolver = new JourneyPlanResolver(await loadSchedules(), await loadStations());

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    console.log('\n❌ 日期格式錯誤，請使用 YYYY-MM-DD 格式\n');
    return;
  }

  const journey = resolver.planJourney(from, to, {
    date: options.date,
    departureTime: options['departure-time'],
    arrivalTime: options['arrival-time'],
    allowTransfers: options['allow-transfers'],
    maxTransferTime: parseInt(options['max-transfer-time'] || '30', 10),
  });

  if (!journey) {
    console.log(
      `\n❌ 找不到從 "${from}" 到 "${to}" 的行程\n`
    );
    return;
  }

  console.log('\n✈️  最優行程規劃');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`路線: ${journey.fromStation} → ${journey.toStation}`);
  console.log(`日期: ${options.date}`);
  console.log(`出發: ${journey.departureTime}`);
  console.log(`到達: ${journey.arrivalTime}`);
  console.log(`全程時間: ${journey.totalDuration}`);
  console.log(`轉運次數: ${journey.totalLegs - 1}\n`);

  if (journey.legs && journey.legs.length > 0) {
    const table = new Table({
      head: ['序號', '列車', '出發站', '到達站', '出發', '到達', '時間'],
      style: { head: [], border: ['cyan'] },
    });

    for (const leg of journey.legs) {
      table.push([
        String(leg.legNumber),
        leg.trainNumber,
        leg.fromStation,
        leg.toStation,
        leg.departureTime,
        leg.arrivalTime,
        leg.duration,
      ]);
    }

    console.log(table.toString());
  }

  console.log();
}

// Create subcommand for earliest departure
const earliestCommand = new Command()
  .name('earliest')
  .description('最早出發選項')
  .argument('<from>', '出發站')
  .argument('<to>', '目的地站')
  .option('--date <date>', '旅程日期 (格式: YYYY-MM-DD)', new Date().toISOString().split('T')[0])
  .action(handleEarliestCommand);

async function handleEarliestCommand(
  from: string,
  to: string,
  options: { date: string }
) {
  const resolver = new JourneyPlanResolver(await loadSchedules(), await loadStations());
  const journey = resolver.findEarliestDeparture(from, to, options.date);

  if (!journey) {
    console.log(`\n❌ 找不到行程\n`);
    return;
  }

  console.log(`\n✈️  最早出發 ${from} → ${to}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`出發時間: ${journey.departureTime}`);
  console.log(`到達時間: ${journey.arrivalTime}`);
  console.log(`全程時間: ${journey.totalDuration}\n`);
}

// Create subcommand for latest arrival
const latestCommand = new Command()
  .name('latest')
  .description('最晚到達選項')
  .argument('<from>', '出發站')
  .argument('<to>', '目的地站')
  .option('--date <date>', '旅程日期 (格式: YYYY-MM-DD)', new Date().toISOString().split('T')[0])
  .action(handleLatestCommand);

async function handleLatestCommand(
  from: string,
  to: string,
  options: { date: string }
) {
  const resolver = new JourneyPlanResolver(await loadSchedules(), await loadStations());
  const journey = resolver.findLatestArrival(from, to, options.date);

  if (!journey) {
    console.log(`\n❌ 找不到行程\n`);
    return;
  }

  console.log(`\n✈️  最晚到達 ${from} → ${to}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`出發時間: ${journey.departureTime}`);
  console.log(`到達時間: ${journey.arrivalTime}`);
  console.log(`全程時間: ${journey.totalDuration}\n`);
}

// Add subcommands
journeyPlanCommand.addCommand(earliestCommand);
journeyPlanCommand.addCommand(latestCommand);
