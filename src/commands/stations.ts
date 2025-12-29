/**
 * Stations Command
 * Query and display THSR station information
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import { StationResolver } from '../lib/station-resolver.js';
import thsrStations from '../data/stations.js';

export const stationsCommand = new Command()
  .name('stations')
  .description('查詢高鐵車站資訊')
  .action(handleStationsCommand);

async function handleStationsCommand() {
  const resolver = new StationResolver(thsrStations);
  const stations = resolver.getAllStations();

  const table = new Table({
    head: ['車站代碼', '車站名稱', '城市', '地址'],
    style: { head: [], border: ['cyan'] },
  });

  for (const station of stations) {
    table.push([
      station.StationCode,
      station.StationName.Zh_tw,
      station.LocationCity,
      station.StationAddress.substring(0, 30) + '...',
    ]);
  }

  console.log('\n高鐵車站列表：\n');
  console.log(table.toString());
}

// Create search subcommand
const searchCommand = new Command()
  .name('search')
  .description('搜尋車站')
  .argument('<query>', '搜尋關鍵字')
  .action(handleSearchCommand);

async function handleSearchCommand(query: string) {
  const resolver = new StationResolver(thsrStations);
  const results = resolver.searchStations(query);

  if (results.length === 0) {
    console.log(`\n❌ 找不到符合 "${query}" 的車站\n`);
    return;
  }

  const table = new Table({
    head: ['代碼', '車站', '城市', '坐標'],
    style: { head: [], border: ['cyan'] },
  });

  for (const station of results) {
    table.push([
      station.StationCode,
      station.StationName.Zh_tw,
      station.LocationCity,
      `${station.StationPosition.PositionLat.toFixed(4)}, ${station.StationPosition.PositionLon.toFixed(4)}`,
    ]);
  }

  console.log(`\n搜尋結果 (${results.length} 個):\n`);
  console.log(table.toString());
}

// Create info subcommand
const infoCommand = new Command()
  .name('info')
  .description('顯示車站詳細資訊')
  .argument('<station>', '車站名稱或代碼')
  .action(handleInfoCommand);

async function handleInfoCommand(stationQuery: string) {
  const resolver = new StationResolver(thsrStations);
  const station = resolver.resolveStation(stationQuery);

  if (!station) {
    console.log(`\n❌ 找不到車站: "${stationQuery}"\n`);
    return;
  }

  console.log(`\n🚄 ${station.StationName.Zh_tw} (${station.StationName.En})`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`代碼:      ${station.StationCode}`);
  console.log(`站ID:     ${station.StationID}`);
  console.log(`城市:      ${station.LocationCity}`);
  console.log(`地址:      ${station.StationAddress}`);
  console.log(`座標:      ${station.StationPosition.PositionLat}, ${station.StationPosition.PositionLon}`);
  console.log(`更新時間:   ${station.UpdateTime}\n`);
}

// Add subcommands
stationsCommand.addCommand(searchCommand);
stationsCommand.addCommand(infoCommand);
