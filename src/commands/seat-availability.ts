/**
 * Seat Availability Command
 * Wraps TDX /AvailableSeatStatusList/Today. THSR publishes this intermittently
 * and the response is often empty; the command surfaces the raw records when
 * present and explains the limitation when not.
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import { loadAvailableSeats } from '../services/data-source.js';

const NO_DATA = '\n📭 目前 TDX 無高鐵座位狀態公告（高鐵僅在特定情況下發布此資料）\n';

export const seatAvailabilityCommand = new Command()
  .name('seat-availability')
  .description('查詢高鐵當日座位狀態（依 TDX 公告）')
  .action(async () => {
    const envelope = await loadAvailableSeats();
    const records = envelope.AvailableSeats ?? [];
    if (records.length === 0) {
      console.log(NO_DATA);
      if (envelope.UpdateTime) console.log(`   TDX 更新時間: ${envelope.UpdateTime}\n`);
      return;
    }

    console.log('\n🎫 高鐵座位狀態');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (envelope.UpdateTime) console.log(`更新時間: ${envelope.UpdateTime}`);
    console.log(`共 ${records.length} 筆\n`);

    // Render whatever fields TDX hands us — the per-row schema isn't fixed.
    const sample = records[0];
    const columns = Object.keys(sample);
    const table = new Table({
      head: columns,
      style: { head: [], border: ['cyan'] },
    });
    for (const r of records) {
      table.push(columns.map((c) => String((r as Record<string, unknown>)[c] ?? '-')));
    }
    console.log(table.toString());
    console.log();
  });

const trainCommand = new Command()
  .name('train')
  .description('查詢特定列車座位狀態')
  .argument('<train-number>', '列車號碼 (例: 0601)')
  .action(async (trainNumber: string) => {
    const envelope = await loadAvailableSeats();
    const records = envelope.AvailableSeats ?? [];
    if (records.length === 0) {
      console.log(NO_DATA);
      return;
    }
    const matches = records.filter(
      (r) => 'TrainNo' in r && (r.TrainNo === trainNumber || r.TrainNo === trainNumber.padStart(4, '0')),
    );
    if (matches.length === 0) {
      console.log(`\n❌ TDX 公告中找不到列車 ${trainNumber} 的座位狀態\n`);
      return;
    }

    console.log(`\n🎫 列車 ${trainNumber} 座位狀態`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    for (const r of matches) {
      for (const [k, v] of Object.entries(r)) {
        console.log(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
      }
      console.log();
    }
  });

seatAvailabilityCommand.addCommand(trainCommand);
