/**
 * Operator Command
 * Query and display Taiwan rail operator information
 * Supports OData query parameters: $select, $filter, $orderby, $top, $skip
 */

import { Command } from 'commander';
import Table from 'cli-table3';
import { OperatorResolver } from '../lib/operator-resolver.js';
import type { ODataOptions } from '../lib/odata-utils.js';
import operators from '../data/operators.js';

export const operatorCommand = new Command()
  .name('operator')
  .description('查詢軌道營運業者資訊')
  .action(handleOperatorCommand);

// Create list subcommand
const listCommand = new Command()
  .name('list')
  .description('列出所有軌道營運業者')
  .option('--select <fields>', 'OData $select - 選擇特定字段 (逗號分隔)')
  .option('--filter <expression>', 'OData $filter - 過濾條件')
  .option('--orderby <field>', 'OData $orderby - 排序字段')
  .option('--top <number>', 'OData $top - 返回最多 N 筆記錄')
  .option('--skip <number>', 'OData $skip - 跳過前 N 筆記錄')
  .action(handleListCommand);

async function handleOperatorCommand() {
  // Show list by default if no argument
  const resolver = new OperatorResolver(operators);
  const operatorList = resolver.getAllOperators();

  if (operatorList.length === 0) {
    console.log('\n❌ 沒有可用的營運業者資訊\n');
    return;
  }

  const table = new Table({
    head: ['編號', '代碼', '名稱', '電話'],
    style: { head: [], border: ['cyan'] },
  });

  for (const op of operatorList) {
    table.push([op.OperatorID, op.OperatorCode, op.OperatorName.Zh_tw, op.OperatorPhone || '-']);
  }

  console.log('\n🚄 軌道營運業者列表:\n');
  console.log(table.toString());
  console.log(`\n共 ${operatorList.length} 個營運業者\n`);
}

async function handleListCommand(
  options: {
    select?: string;
    filter?: string;
    orderby?: string;
    top?: string;
    skip?: string;
  }
) {
  const resolver = new OperatorResolver(operators);

  // Build OData options
  const odataOptions: ODataOptions = {
    select: options.select,
    filter: options.filter,
    orderby: options.orderby,
    top: options.top ? parseInt(options.top, 10) : undefined,
    skip: options.skip ? parseInt(options.skip, 10) : undefined,
  };

  // Get operators with OData options applied
  const operatorList = resolver.getAllOperatorsWithOData(odataOptions);

  if (operatorList.length === 0) {
    console.log('\n❌ 沒有符合條件的營運業者\n');
    return;
  }

  // Determine columns based on select option
  const columns = options.select
    ? options.select.split(',').map((f) => f.trim())
    : ['OperatorID', 'OperatorCode', 'OperatorName', 'OperatorPhone'];

  const table = new Table({
    head: columns,
    style: { head: [], border: ['cyan'] },
  });

  for (const op of operatorList) {
    const row: string[] = [];
    for (const col of columns) {
      let value: unknown = (op as Record<string, unknown>)[col];

      // Handle nested properties
      if (col === 'OperatorName' && typeof value === 'object' && value !== null) {
        value = (value as Record<string, unknown>)['Zh_tw'];
      }

      row.push(String(value ?? '-'));
    }
    table.push(row);
  }

  console.log('\n🚄 軌道營運業者列表:\n');
  console.log(table.toString());
  console.log(`\n共 ${operatorList.length} 個營運業者\n`);
}

// Create info subcommand
const infoCommand = new Command()
  .name('info')
  .description('顯示特定營運業者詳細資訊')
  .argument('<operator>', '營運業者代碼或 ID')
  .action(handleInfoCommand);

async function handleInfoCommand(operatorQuery: string) {
  const resolver = new OperatorResolver(operators);

  // Try to find by code first, then by ID
  let operator = resolver.getOperatorByCode(operatorQuery);
  if (!operator) {
    operator = resolver.getOperatorById(operatorQuery);
  }

  if (!operator) {
    console.log(`\n❌ 找不到營運業者: "${operatorQuery}"\n`);
    return;
  }

  console.log(`\n🚄 ${operator.OperatorName.Zh_tw} (${operator.OperatorName.En})`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`編號:      ${operator.OperatorID}`);
  console.log(`代碼:      ${operator.OperatorCode}`);
  console.log(`電話:      ${operator.OperatorPhone || '未提供'}`);
  console.log(`網站:      ${operator.OperatorWebsiteUrl || '未提供'}`);
  console.log(`更新時間:   ${operator.UpdateTime}\n`);
}

// Add subcommands
operatorCommand.addCommand(listCommand);
operatorCommand.addCommand(infoCommand);
