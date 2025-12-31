/**
 * Schedule Command
 * Query THSR train schedules
 * Supports date and train number filtering
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import { ScheduleResolver } from '../lib/schedule-resolver.js';
import thsrSchedules from '../data/schedules.js';

export const scheduleCommand = new Command()
  .name('schedule')
  .description('查詢高鐵列車時刻表')
  .action(handleScheduleCommand);

async function handleScheduleCommand() {
  // Default action: show available dates and trains
  const resolver = new ScheduleResolver(thsrSchedules);
  const dates = resolver.listDates();
  const trainNumbers = resolver.listTrainNumbers();

  console.log('\n🚄 高鐵時刻表查詢');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (dates.length > 0) {
    console.log('\n📅 可查詢日期:');
    dates.forEach((date) => {
      console.log(`  • ${date}`);
    });
  }

  if (trainNumbers.length > 0) {
    console.log('\n🚆 可查詢列車:');
    const chunkedTrains = [];
    for (let i = 0; i < trainNumbers.length; i += 8) {
      chunkedTrains.push(trainNumbers.slice(i, i + 8).join(', '));
    }
    chunkedTrains.forEach((chunk) => {
      console.log(`  ${chunk}`);
    });
  }

  console.log(
    '\n使用方式: schedule <train|station> [--date "YYYY-MM-DD"] [options]\n'
  );
}

// Create train subcommand
const trainCommand = new Command()
  .name('train')
  .description('查詢特定列車時刻表')
  .argument('<train-number>', '列車號碼 (例: 601)')
  .option('--date <date>', '查詢日期 (格式: YYYY-MM-DD)')
  .action(handleTrainCommand);

async function handleTrainCommand(
  trainNumber: string,
  options: { date?: string }
) {
  const resolver = new ScheduleResolver(thsrSchedules);
  const availableDates = resolver.listDates();
  const queryDate = options.date || availableDates[0];

  if (!queryDate) {
    console.log('\n❌ 沒有可用的時刻表資訊\n');
    return;
  }

  // Validate date format if provided
  if (options.date && !/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    console.log('\n❌ 日期格式錯誤，請使用 YYYY-MM-DD 格式\n');
    return;
  }

  const schedule = resolver.getSchedule(trainNumber, queryDate);

  if (!schedule) {
    console.log(
      `\n❌ 找不到列車 ${trainNumber} 在 ${queryDate} 的時刻表\n`
    );
    return;
  }

  console.log('\n🚆 列車時刻表');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`列車號: ${schedule.trainNumber}`);
  console.log(`路線: ${schedule.startStation} → ${schedule.endStation}`);
  console.log(`日期: ${schedule.date}`);
  if (schedule.duration) {
    console.log(`全程時間: ${schedule.duration}`);
  }
  console.log();

  if (schedule.stops && schedule.stops.length > 0) {
    const table = new Table({
      head: ['序號', '車站', '到達', '出發'],
      style: { head: [], border: ['cyan'] },
      colWidths: [6, 12, 10, 10],
    });

    for (const stop of schedule.stops) {
      table.push([
        String(stop.stopSequence),
        stop.stationName,
        stop.arrivalTime || '-',
        stop.departureTime || '-',
      ]);
    }

    console.log(table.toString());
  }

  console.log();
}

// Create station subcommand
const stationCommand = new Command()
  .name('station')
  .description('查詢經過指定車站的列車')
  .argument('<station>', '車站名稱')
  .option('--date <date>', '查詢日期 (格式: YYYY-MM-DD)')
  .action(handleStationCommand);

async function handleStationCommand(
  station: string,
  options: { date?: string }
) {
  const resolver = new ScheduleResolver(thsrSchedules);
  const availableDates = resolver.listDates();
  const queryDate = options.date || availableDates[0];

  if (!queryDate) {
    console.log('\n❌ 沒有可用的時刻表資訊\n');
    return;
  }

  // Validate date format if provided
  if (options.date && !/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    console.log('\n❌ 日期格式錯誤，請使用 YYYY-MM-DD 格式\n');
    return;
  }

  const schedules = resolver.getSchedulesByStation(station, queryDate);

  if (schedules.length === 0) {
    console.log(
      `\n❌ 找不到經過 "${station}" 在 ${queryDate} 的列車\n`
    );
    return;
  }

  console.log(`\n🚄 經過 ${station} 的列車 (${queryDate})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();

  const table = new Table({
    head: ['列車', '出發地', '目的地', '停靠時間', '全程時間'],
    style: { head: [], border: ['cyan'] },
  });

  for (const schedule of schedules) {
    // Find arrival/departure times at the station
    const stationStop = schedule.stops.find((stop) => stop.stationName === station);
    const stopTime = stationStop
      ? `${stationStop.arrivalTime || '-'} / ${stationStop.departureTime || '-'}`
      : '-';

    table.push([
      schedule.trainNumber,
      schedule.startStation,
      schedule.endStation,
      stopTime,
      schedule.duration || '-',
    ]);
  }

  console.log(table.toString());
  console.log(`\n共 ${schedules.length} 班列車\n`);
}

// Create route subcommand
const routeCommand = new Command()
  .name('route')
  .description('查詢路線時刻表')
  .argument('<from>', '出發站')
  .argument('<to>', '目的地站')
  .option('--date <date>', '查詢日期 (格式: YYYY-MM-DD)')
  .action(handleRouteCommand);

async function handleRouteCommand(
  from: string,
  to: string,
  options: { date?: string }
) {
  const resolver = new ScheduleResolver(thsrSchedules);
  const availableDates = resolver.listDates();
  const queryDate = options.date || availableDates[0];

  if (!queryDate) {
    console.log('\n❌ 沒有可用的時刻表資訊\n');
    return;
  }

  // Validate date format if provided
  if (options.date && !/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    console.log('\n❌ 日期格式錯誤，請使用 YYYY-MM-DD 格式\n');
    return;
  }

  const schedules = resolver.getSchedulesByRoute(from, to, queryDate);

  if (schedules.length === 0) {
    console.log(
      `\n❌ 找不到從 "${from}" 到 "${to}" 在 ${queryDate} 的列車\n`
    );
    return;
  }

  console.log(`\n🚄 ${from} → ${to} 時刻表 (${queryDate})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();

  const table = new Table({
    head: ['列車', '出發', '到達', '全程時間', '停靠站數'],
    style: { head: [], border: ['cyan'] },
  });

  for (const schedule of schedules) {
    // Find times at from and to stations
    const fromStop = schedule.stops.find((stop) => stop.stationName === from);
    const toStop = schedule.stops.find((stop) => stop.stationName === to);
    const departTime = fromStop?.departureTime || '-';
    const arrivalTime = toStop?.arrivalTime || '-';

    table.push([
      schedule.trainNumber,
      departTime,
      arrivalTime,
      schedule.duration || '-',
      String(schedule.stops.length),
    ]);
  }

  console.log(table.toString());
  console.log(`\n共 ${schedules.length} 班列車\n`);
}

// Add subcommands
scheduleCommand.addCommand(trainCommand);
scheduleCommand.addCommand(stationCommand);
scheduleCommand.addCommand(routeCommand);
