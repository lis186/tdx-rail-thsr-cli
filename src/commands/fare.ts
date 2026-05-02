/**
 * Fare Command
 * Query THSR fares between stations
 * Supports OData query parameters: $select, $filter, $orderby, $top, $skip
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import { FareResolver } from '../lib/fare-resolver.js';
import type { ODataOptions } from '../lib/odata-utils.js';
import { loadFares, loadStations } from '../services/data-source.js';

export const fareCommand = new Command()
  .name('fare')
  .description('查詢高鐵票價')
  .argument('<from>', '出發站')
  .argument('<to>', '目的地站')
  .option('--date <date>', '查詢特定日期的票價 (格式: YYYY-MM-DD)')
  .action(handleFareCommand);

async function handleFareCommand(
  from: string,
  to: string,
  options: { date?: string }
) {
  const resolver = new FareResolver(await loadFares());
  let fare;

  if (options.date) {
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
      console.log(`\n❌ 日期格式錯誤，請使用 YYYY-MM-DD 格式\n`);
      return;
    }
    fare = resolver.getFareByNameAndDate(from, to, options.date);
  } else {
    fare = resolver.getFareByName(from, to);
  }

  if (!fare) {
    const dateStr = options.date ? ` (${options.date})` : '';
    console.log(`\n❌ 找不到從 "${from}" 到 "${to}" 的票價資訊${dateStr}\n`);
    return;
  }

  console.log(`\n🎫 票價查詢`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`路線: ${fare.from} → ${fare.to}`);
  if (options.date) {
    console.log(`日期: ${options.date}`);
  }
  console.log(`標準票價: NT$ ${fare.standardFare}`);
  console.log();

  if (fare.fareBreakdown && fare.fareBreakdown.length > 0) {
    const table = new Table({
      head: ['車廂類型', '票種', '票價'],
      style: { head: [], border: ['cyan'] },
    });

    for (const breakdown of fare.fareBreakdown) {
      table.push([
        breakdown.description || `車廂 ${breakdown.cabinClass}`,
        `FareClass ${breakdown.fareClass}`,
        `NT$ ${breakdown.price}`,
      ]);
    }

    console.log(table.toString());
  }

  console.log();
}

// Create list subcommand
const listCommand = new Command()
  .name('list')
  .description('列出所有票價')
  .option('--select <fields>', 'OData $select - 選擇特定字段 (逗號分隔)')
  .option('--filter <expression>', 'OData $filter - 過濾條件')
  .option('--orderby <field>', 'OData $orderby - 排序字段')
  .option('--top <number>', 'OData $top - 返回最多 N 筆記錄')
  .option('--skip <number>', 'OData $skip - 跳過前 N 筆記錄')
  .action(handleListCommand);

async function handleListCommand(
  options: {
    select?: string;
    filter?: string;
    orderby?: string;
    top?: string;
    skip?: string;
  }
) {
  const resolver = new FareResolver(await loadFares());

  // Build OData options
  const odataOptions: ODataOptions = {
    select: options.select,
    filter: options.filter,
    orderby: options.orderby,
    top: options.top ? parseInt(options.top, 10) : undefined,
    skip: options.skip ? parseInt(options.skip, 10) : undefined,
  };

  // Get fares with OData options applied
  const fares = resolver.getAllFaresWithOData(odataOptions);

  if (fares.length === 0) {
    console.log('\n❌ 沒有可用的票價資訊\n');
    return;
  }

  // Determine columns based on select option
  const columns = options.select
    ? options.select.split(',').map((f) => f.trim())
    : ['OriginStationCode', 'DestinationStationCode', 'Price'];

  const table = new Table({
    head: columns,
    style: { head: [], border: ['cyan'] },
  });

  for (const fare of fares) {
    const row: string[] = [];
    for (const col of columns) {
      let value: unknown = (fare as Record<string, unknown>)[col];

      // Handle default mapping
      if (col === 'Price' && !value) {
        const fares_array = (fare as Record<string, unknown>)['Fares'];
        if (Array.isArray(fares_array) && fares_array.length > 0) {
          const firstFare = fares_array[0] as Record<string, unknown>;
          value = firstFare['Price'];
        }
      }

      row.push(String(value ?? '-'));
    }
    table.push(row);
  }

  console.log(`\n高鐵票價列表:\n`);
  console.log(table.toString());
  console.log(`\n共 ${fares.length} 條路線\n`);
}

// Create routes subcommand
const routesCommand = new Command()
  .name('routes')
  .description('顯示指定車站的所有路線')
  .argument('<station>', '車站名稱')
  .option('-f, --from', '顯示出發路線')
  .option('-t, --to', '顯示到達路線')
  .action(handleRoutesCommand);

async function handleRoutesCommand(
  station: string,
  options: { from?: boolean; to?: boolean }
) {
  const resolver = new FareResolver(await loadFares());
  const { StationResolver } = await import('../lib/station-resolver.js');
  const stationResolver = new StationResolver(await loadStations());

  const stationData = stationResolver.resolveStation(station);
  if (!stationData) {
    console.log(`\n❌ 找不到車站: "${station}"\n`);
    return;
  }

  const stationInfo = stationResolver.getStationInfo(station);
  if (!stationInfo) {
    console.log(`\n❌ 找不到車站: "${station}"\n`);
    return;
  }

  const stationId = stationInfo.id;
  const showFrom = options.from !== false; // Default to true if not specified
  const showTo = options.to !== false;

  if (showFrom) {
    const routesFrom = resolver.getRoutesFrom(stationId);
    if (routesFrom.length > 0) {
      console.log(`\n🚄 從 ${stationInfo.name} 出發的路線:`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      const table = new Table({
        head: ['目的地'],
        style: { head: [], border: ['cyan'] },
      });

      for (const route of routesFrom) {
        table.push([route.to]);
      }

      console.log(table.toString());
    }
  }

  if (showTo) {
    const routesTo = resolver.getRoutesTo(stationId);
    if (routesTo.length > 0) {
      console.log(`\n🚄 往 ${stationInfo.name} 的路線:`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      const table = new Table({
        head: ['出發地'],
        style: { head: [], border: ['cyan'] },
      });

      for (const route of routesTo) {
        table.push([route.from]);
      }

      console.log(table.toString());
    }
  }

  console.log();
}

// Add subcommands
fareCommand.addCommand(listCommand);
fareCommand.addCommand(routesCommand);
