/**
 * News Command
 * Latest THSRC announcements from TDX /News.
 */

import { Command } from 'commander';
import { loadNews } from '../services/data-source.js';

export const newsCommand = new Command()
  .name('news')
  .description('查詢高鐵最新消息')
  .option('--top <number>', '顯示最多 N 則', '5')
  .option('--full', '顯示完整內容（含 HTML 描述）')
  .action(async (options: { top?: string; full?: boolean }) => {
    const top = options.top ? parseInt(options.top, 10) : 5;
    const items = await loadNews(top);

    if (items.length === 0) {
      console.log('\n📭 目前沒有可顯示的高鐵消息（或 TDX 連線失敗）\n');
      return;
    }

    console.log(`\n📰 高鐵最新消息 (${items.length} 則)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const item of items) {
      console.log(`【${item.NewsCategory}】 ${item.Title}`);
      const ts = item.PublishTime || item.StartTime || item.UpdateTime;
      if (ts) console.log(`   發布時間: ${ts}`);
      if (item.NewsUrl) console.log(`   連結: ${item.NewsUrl}`);
      if (options.full && item.Description) {
        // Strip HTML tags for terminal-friendly display.
        const plain = item.Description
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&[a-z]+;/gi, '')
          .trim();
        if (plain) {
          const indented = plain
            .split('\n')
            .map((line) => `   ${line}`)
            .join('\n');
          console.log(indented);
        }
      }
      console.log();
    }
  });
