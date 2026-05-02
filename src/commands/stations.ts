/**
 * Stations Command
 * Query and display THSR station information
 * Supports OData query parameters: $select, $filter, $orderby, $top, $skip
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import { StationResolver } from '../lib/station-resolver.js';
import type { ODataOptions } from '../lib/odata-utils.js';
import { loadStations } from '../services/data-source.js';

export const stationsCommand = new Command()
  .name('stations')
  .description('查詢高鐵車站資訊')
  .option('--select <fields>', 'OData $select - 選擇特定字段 (逗號分隔)')
  .option('--filter <expression>', 'OData $filter - 過濾條件')
  .option('--orderby <field>', 'OData $orderby - 排序字段')
  .option('--top <number>', 'OData $top - 返回最多 N 筆記錄')
  .option('--skip <number>', 'OData $skip - 跳過前 N 筆記錄')
  .option('--nearby <coordinates>', '空間查詢 - 查詢指定座標附近的車站 (格式: lat,lon)')
  .option('--radius <meters>', '空間查詢半徑 (公尺，預設 1000m)')
  .action(handleStationsCommand);

async function handleStationsCommand(
  options: {
    select?: string;
    filter?: string;
    orderby?: string;
    top?: string;
    skip?: string;
    nearby?: string;
    radius?: string;
  }
) {
  const resolver = new StationResolver(await loadStations());

  let stations: (import('../types/api.js').THSRStation | Record<string, unknown>)[];

  // Handle nearby spatial query
  if (options.nearby) {
    const [latStr, lonStr] = options.nearby.split(',');
    const lat = parseFloat(latStr?.trim() ?? '');
    const lon = parseFloat(lonStr?.trim() ?? '');

    if (isNaN(lat) || isNaN(lon)) {
      console.log('\n❌ 座標格式錯誤，請使用 "lat,lon" 格式 (例: 25.0477,121.517)\n');
      return;
    }

    const radiusMeters = options.radius ? parseInt(options.radius, 10) : 1000;
    if (isNaN(radiusMeters) || radiusMeters < 0) {
      console.log('\n❌ 半徑必須是正數\n');
      return;
    }

    // Get nearby stations
    stations = resolver.getNearbyStations({ lat, lon }, radiusMeters);
    console.log(`\n查詢座標附近的車站 (${radiusMeters}m 半徑)\n`);
  } else {
    // Build OData options
    const odataOptions: ODataOptions = {
      select: options.select,
      filter: options.filter,
      orderby: options.orderby,
      top: options.top ? parseInt(options.top, 10) : undefined,
      skip: options.skip ? parseInt(options.skip, 10) : undefined,
    };

    // Get stations with OData options applied
    stations = resolver.getAllStationsWithOData(odataOptions);
  }

  // Determine columns based on select option
  const columns = options.select
    ? options.select.split(',').map((f) => f.trim())
    : ['StationCode', 'StationName', 'City', 'Address'];

  const table = new Table({
    head: columns,
    style: { head: [], border: ['cyan'] },
  });

  for (const station of stations) {
    const row: string[] = [];
    for (const col of columns) {
      let value: unknown = (station as Record<string, unknown>)[col];

      // Handle nested properties
      if (col === 'StationName' && typeof value === 'object' && value !== null) {
        value = (value as Record<string, unknown>)['Zh_tw'];
      }
      if (col === 'City') {
        value = (station as Record<string, unknown>)['LocationCity'];
      }
      if (col === 'Address') {
        const addr = (station as Record<string, unknown>)['StationAddress'];
        value = typeof addr === 'string' ? addr.substring(0, 30) + '...' : addr;
      }

      row.push(String(value ?? '-'));
    }
    table.push(row);
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
  const resolver = new StationResolver(await loadStations());
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
  const resolver = new StationResolver(await loadStations());
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
