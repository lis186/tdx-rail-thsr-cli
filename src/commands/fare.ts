/**
 * Fare Command
 * Query THSR fares between stations
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import { FareResolver } from '../lib/fare-resolver.js';
import thsrFares from '../data/fares.js';

export const fareCommand = new Command()
  .name('fare')
  .description('查詢高鐵票價')
  .argument('<from>', '出發站')
  .argument('<to>', '目的地站')
  .action(handleFareCommand);

async function handleFareCommand(from: string, to: string) {
  const resolver = new FareResolver(thsrFares);
  const fare = resolver.getFareByName(from, to);

  if (!fare) {
    console.log(`\n❌ 找不到從 "${from}" 到 "${to}" 的票價資訊\n`);
    return;
  }

  console.log(`\n🎫 票價查詢`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`路線: ${fare.from} → ${fare.to}`);
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
  .action(handleListCommand);

async function handleListCommand() {
  const resolver = new FareResolver(thsrFares);
  const routes = resolver.listRoutes();

  if (routes.length === 0) {
    console.log('\n❌ 沒有可用的票價資訊\n');
    return;
  }

  const table = new Table({
    head: ['出發地', '目的地', '票價資訊'],
    style: { head: [], border: ['cyan'] },
  });

  for (const route of routes.slice(0, 20)) {
    // Limit to first 20 for readability
    const fare = resolver.getFare(route.fromId, route.toId);
    const priceStr = fare ? `NT$ ${fare.standardFare}` : 'N/A';

    table.push([route.from, route.to, priceStr]);
  }

  console.log(`\n高鐵票價列表 (顯示前 20 條):\n`);
  console.log(table.toString());
  console.log(`\n共 ${routes.length} 條路線\n`);
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
  const resolver = new FareResolver(thsrFares);
  const { StationResolver } = await import('../lib/station-resolver.js');
  const stationsData = (await import('../data/stations.js')).default;
  const stationResolver = new StationResolver(stationsData);

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
