/**
 * Occupancy Command
 * Real-time train occupancy analysis and recommendations
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import { OccupancyAnalyzer } from '../lib/occupancy-analyzer.js';

export const occupancyCommand = new Command()
  .name('occupancy')
  .description('列車載客率分析')
  .argument('[train-number]', '列車號碼 (可選)')
  .option('--date <date>', '查詢日期 (格式: YYYY-MM-DD)', new Date().toISOString().split('T')[0])
  .option('--route <route>', '路線 (格式: from-to，如: Taipei-Taichung)')
  .option('--busy', '僅顯示擁擠列車 (>70%)')
  .option('--available', '僅顯示有位列車 (<30%)')
  .action(handleOccupancyCommand);

async function handleOccupancyCommand(
  trainNumber: string | undefined,
  options: {
    date: string;
    route?: string;
    busy?: boolean;
    available?: boolean;
  }
) {
  const analyzer = new OccupancyAnalyzer();

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    console.log('\n❌ 日期格式錯誤，請使用 YYYY-MM-DD 格式\n');
    return;
  }

  if (trainNumber) {
    // Show occupancy for specific train
    const occupancy = analyzer.getTrainOccupancy(trainNumber, options.date);

    if (!occupancy) {
      console.log(`\n❌ 找不到列車 ${trainNumber} 的載客率資訊\n`);
      return;
    }

    console.log('\n📊 列車載客率');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`列車號: ${occupancy.trainNumber}`);
    console.log(`路線: ${occupancy.fromStation} → ${occupancy.toStation}`);
    console.log(`日期: ${options.date}`);
    console.log(`狀態: ${occupancy.occupancyStatus} (${occupancy.crowdLevel})\n`);

    console.log('整體載客率:');
    console.log(
      `  ${analyzer.getOccupancyBar(occupancy.overallOccupancyRate)} ${analyzer.formatOccupancy(
        occupancy.overallOccupancyRate
      )}`
    );
    console.log(`  已預訂: ${occupancy.reservedSeats} / ${occupancy.totalSeats} 座\n`);

    console.log('座位類型:');
    console.log(`  標準車廂: ${analyzer.formatOccupancy(occupancy.standardOccupancyRate)}`);
    console.log(`  商務車廂: ${analyzer.formatOccupancy(occupancy.businessOccupancyRate)}\n`);

    console.log('可用座位:');
    console.log(`  標準座位: ${occupancy.availableSeats} 座可用\n`);
  } else if (options.route) {
    // Show occupancy by route
    const [from, to] = options.route.split('-');
    const occupancies = analyzer.getOccupancyByRoute(from, to, options.date);

    if (!occupancies || occupancies.length === 0) {
      console.log(`\n❌ 找不到路線 ${from} → ${to} 的列車\n`);
      return;
    }

    console.log('\n🛤️  路線載客率');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`路線: ${from} → ${to}`);
    console.log(`日期: ${options.date}`);
    console.log(`共 ${occupancies.length} 班列車\n`);

    const table = new Table({
      head: ['列車', '整體率', '標準', '商務', '可用座位', '狀態'],
      style: { head: [], border: ['cyan'] },
    });

    for (const occ of occupancies) {
      table.push([
        occ.trainNumber,
        `${occ.overallOccupancyRate}%`,
        `${occ.standardOccupancyRate}%`,
        `${occ.businessOccupancyRate}%`,
        String(occ.availableSeats),
        occ.occupancyStatus,
      ]);
    }

    console.log(table.toString());
    console.log();
  } else {
    // Show all trains for the date
    let occupancies = analyzer.getOccupancyByDate(options.date);

    if (options.busy) {
      occupancies = analyzer.getBusyTrains(options.date, 70);
      console.log('\n🔥 擁擠列車 (載客率 > 70%)');
    } else if (options.available) {
      occupancies = analyzer.getAvailableTrains(options.date, 30);
      console.log('\n✅ 有位列車 (載客率 < 30%)');
    } else {
      console.log('\n📊 全天載客率');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`日期: ${options.date}`);
    console.log(`共 ${occupancies.length} 班列車\n`);

    if (occupancies.length === 0) {
      console.log('沒有符合條件的列車\n');
      return;
    }

    const table = new Table({
      head: ['序號', '列車', '路線', '載客率', '可用座位', '擁擠程度'],
      style: { head: [], border: ['cyan'] },
    });

    for (let i = 0; i < Math.min(occupancies.length, 10); i++) {
      const occ = occupancies[i];
      table.push([
        String(i + 1),
        occ.trainNumber,
        `${occ.fromStation}→${occ.toStation}`,
        `${occ.overallOccupancyRate}%`,
        String(occ.availableSeats),
        occ.crowdLevel,
      ]);
    }

    console.log(table.toString());
    console.log();
  }
}

// Create subcommand for recommendations
const recommendCommand = new Command()
  .name('recommend')
  .description('推薦有位列車')
  .argument('<from>', '出發站')
  .argument('<to>', '目的地站')
  .option('--date <date>', '查詢日期 (格式: YYYY-MM-DD)', new Date().toISOString().split('T')[0])
  .action(handleRecommendCommand);

async function handleRecommendCommand(
  from: string,
  to: string,
  options: {
    date: string;
  }
) {
  const analyzer = new OccupancyAnalyzer();

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    console.log('\n❌ 日期格式錯誤，請使用 YYYY-MM-DD 格式\n');
    return;
  }

  const recommended = analyzer.getRecommendedTrains(from, to, options.date);

  if (!recommended || recommended.length === 0) {
    console.log(
      `\n❌ 沒有找到 ${from} → ${to} 有充足座位的推薦列車\n`
    );
    return;
  }

  console.log('\n✨ 推薦列車');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`路線: ${from} → ${to}`);
  console.log(`日期: ${options.date}`);
  console.log(`共 ${recommended.length} 班推薦列車\n`);

  const table = new Table({
    head: ['序號', '列車', '載客率', '可用座位', '狀態'],
    style: { head: [], border: ['cyan'] },
  });

  for (let i = 0; i < recommended.length; i++) {
    const occ = recommended[i];
    table.push([
      String(i + 1),
      occ.trainNumber,
      `${occ.overallOccupancyRate}%`,
      String(occ.availableSeats),
      occ.occupancyStatus,
    ]);
  }

  console.log(table.toString());
  console.log();
}

// Add subcommands
occupancyCommand.addCommand(recommendCommand);
