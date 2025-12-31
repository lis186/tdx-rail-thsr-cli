# 🚄 THSR CLI - TDD 开发指南 (PROMPT.md)

**最后更新:** 2025-12-31
**开发方法论:** Test-Driven Development (TDD)
**参考文档:** @.sourceatlas/patterns/, @PRD.md

---

## 📋 开发流程概览

### TDD 三步循环
```
1️⃣  红 (RED)       → 编写失败的测试
2️⃣  绿 (GREEN)     → 编写最小实现使测试通过
3️⃣  重构 (REFACTOR) → 优化代码，保持测试通过
```

### 项目完成条件
- ✅ 编写完整的单元测试
- ✅ 测试覆盖率 ≥ 95%
- ✅ 实现通过所有测试
- ✅ 在 @PRD.md 中勾选完成
- ✅ 所有 linter 和 typecheck 通过

---

## 🔍 未完成项目清单

### 第一层：核心票務資訊（基礎服務）

#### ✅ [已完成] 1. 车站资讯
- [x] `stations` - 列出所有车站
- [x] `stations search <query>` - 搜寻车站（模糊匹配）
- [x] `stations info <station>` - 显示车站详细资讯

#### ⏳ [待完成] 2. 车站高级查询
- [ ] `stations --filter "City=台北市"` - OData $filter 过滤
- [ ] `stations --select "StationCode,Name"` - OData $select 字段选择
- [ ] `stations --orderby "Name"` - OData $orderby 排序
- [ ] `stations --limit 10 --skip 5` - OData 分页查询
- [ ] `stations --nearby "25.0477,121.5170" --radius 1000` - 空间查询

#### ✅ [已完成] 3. 票价资讯
- [x] `fare <from> <to>` - 查询两站票价
- [x] `fare list` - 列出所有票价路线
- [x] `fare routes <station>` - 显示指定车站的路线

#### ⏳ [待完成] 4. 票价高级查询
- [ ] `fare --filter "DiscountType=1"` - OData $filter 过滤
- [ ] `fare --select "OriginStationCode,DestinationStationCode,Price"` - OData $select
- [ ] `fare --orderby "Price"` - OData $orderby 排序
- [ ] `fare list --limit 20 --skip 10` - OData 分页查询
- [ ] `fare --date "2025-12-31"` - 特定日期票价查询

#### ⏳ [待完成] 5. 营运业者资讯
- [ ] `operator list` - 列出所有轨道营运业者
- [ ] `operator info <operator-id>` - 显示特定营运业者资讯
- [ ] `operator --filter "OperatorCode=THSR"` - 过滤营运业者

---

### 第二层：进阶查询功能（OData 标准功能）

#### ⏳ [待完成] OData 查询参数实现
- [ ] $select - 字段选择（支援所有端点）
- [ ] $filter - 进阶过滤（支援所有端点）
- [ ] $orderby - 结果排序（支援所有端点）
- [ ] $top / $skip - 分页查询（支援所有端点）
- [ ] $format - 响应格式控制（JSON/XML）
- [ ] 空间查询 nearby() - 1000m 范围内搜寻

---

### 第三层：实时动态功能（TDX 平台实时 API）

#### ⏳ [待确认] 列车时刻表
- [ ] `schedule <station>` - 查询指定站点的列车时刻
- [ ] `schedule <from> <to>` - 查询路线时刻表
- [ ] `schedule --date "2025-12-31"` - 特定日期时刻表
- [ ] `schedule --filter "TrainNo=601"` - 特定列车号搜寻

#### ⏳ [待确认] 实时列车状态
- [ ] `train-status <train-number>` - 查询列车实时状态
- [ ] `train-status <station>` - 查询经过该站的列车状态
- [ ] `train-status --filter "Status=Delayed"` - 筛选延误列车

#### ⏳ [待确认] 座位可用性
- [ ] `seat-availability <train-number>` - 查询列车座位可用性
- [ ] `seat-availability <from> <to>` - 查询路线座位供应
- [ ] `seat-availability --seat-type "Standard"` - 筛选特定舱等

#### ⏳ [待确认] 列车延误资讯
- [ ] `train-delay <station>` - 查询该站列车延误情况
- [ ] `train-delay --filter "Delay>5"` - 筛选超过 5 分钟延误
- [ ] `train-delay-alert <station>` - 订阅延误警报

#### ⏳ [待确认] 列车运营状态
- [ ] `service-status` - 查询整体服务状态
- [ ] `service-status --station <station>` - 查询特定站点状态
- [ ] `service-status --alert-only` - 仅显示异常状态

---

### 第四层：增值服务功能（外部集成）

#### ⏳ [待实现] 行程规划
- [ ] `journey-plan <from> <to>` - 最優行程規劃
- [ ] `journey-plan --departure-time "14:00"` - 指定出發時間
- [ ] `journey-plan --arrival-time "18:00"` - 指定到達時間
- [ ] `journey-plan --transfers-allowed true` - 允許轉運

#### ⏳ [待实现] 转运建议
- [ ] `transfers <from> <to>` - 转运选项建议
- [ ] `transfers --prefer-time 30` - 转运时间偏好（分钟）
- [ ] `transfers --other-transport` - 包含其他交通工具建议

#### ⏳ [待实现] 线上预订
- [ ] `booking create <from> <to> <date>` - 建立預訂
- [ ] `booking list` - 顯示我的預訂
- [ ] `booking cancel <booking-id>` - 取消預訂
- [ ] `booking modify <booking-id>` - 修改預訂
- [ ] `booking pay <booking-id>` - 支付預訂

#### ⏳ [待实现] 会员系统
- [ ] `member login` - 會員登入
- [ ] `member logout` - 會員登出
- [ ] `member profile` - 顯示會員資料
- [ ] `member points` - 查詢累積哩程
- [ ] `member redeem <points>` - 兌換優惠

---

## 🧪 TDD 开发流程详解

### 步骤 1: 编写测试（RED）

```typescript
// tests/feature-resolver.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { FeatureResolver } from '../src/lib/feature-resolver';
import { mockApiClient } from './mocks/api-client';

describe('FeatureResolver', () => {
  let resolver: FeatureResolver;

  beforeEach(() => {
    resolver = new FeatureResolver(mockApiClient);
  });

  it('should fetch data with filter parameter', async () => {
    const result = await resolver.fetchWithFilter('City=台北市');
    expect(result).toHaveLength(2); // 台北市有2個車站
    expect(result[0]).toHaveProperty('city', '台北市');
  });

  it('should handle empty results', async () => {
    const result = await resolver.fetchWithFilter('City=NonExistent');
    expect(result).toHaveLength(0);
  });

  it('should throw error on invalid filter', async () => {
    await expect(
      resolver.fetchWithFilter('Invalid=Filter')
    ).rejects.toThrow('Invalid filter parameter');
  });
});
```

### 步骤 2: 实现功能（GREEN）

```typescript
// src/lib/feature-resolver.ts

export class FeatureResolver {
  constructor(private apiClient: TDXApiClient) {}

  async fetchWithFilter(filter: string): Promise<any[]> {
    // 1️⃣ 验证参数
    if (!this.isValidFilter(filter)) {
      throw new Error('Invalid filter parameter');
    }

    // 2️⃣ 调用 API
    const response = await this.apiClient.getStations();

    // 3️⃣ 应用过滤
    return this.applyFilter(response, filter);
  }

  private isValidFilter(filter: string): boolean {
    // 基本验证
    return filter.includes('=') && filter.split('=').length === 2;
  }

  private applyFilter(data: any[], filter: string): any[] {
    const [key, value] = filter.split('=');
    return data.filter(item => item[key] === value);
  }
}
```

### 步骤 3: 重构代码（REFACTOR）

```typescript
// 优化后的实现
export class FeatureResolver {
  private filterValidator = new FilterValidator();

  async fetchWithFilter(filter: string): Promise<any[]> {
    this.filterValidator.validate(filter);
    const data = await this.apiClient.getStations();
    return this.applyFilter(data, filter);
  }

  private applyFilter(data: any[], filter: string): any[] {
    const { key, value } = this.parseFilter(filter);
    return data.filter(item => item[key] === value);
  }

  private parseFilter(filter: string) {
    const [key, value] = filter.split('=');
    return { key, value };
  }
}
```

---

## 🎯 Mock API 策略

### 使用真实 API 响应

```typescript
// tests/fixtures/thsr-stations-with-city.json
[
  {
    "StationCode": "0990",
    "StationName": "台北",
    "City": "台北市",
    "Location": "台北市中正區"
  },
  {
    "StationCode": "1000",
    "StationName": "板橋",
    "City": "台北市",
    "Location": "新北市板橋區"
  }
]
```

### Mock API 客户端

```typescript
// tests/mocks/api-client.ts

export const mockApiClient = {
  getStations: vi.fn(async () => {
    // 返回真实 TDX API 响应结构
    const stations = await import('../fixtures/thsr-stations-with-city.json');
    return stations;
  }),

  getFares: vi.fn(async () => {
    const fares = await import('../fixtures/thsr-fares.json');
    return fares;
  }),

  // ... 其他端点
};
```

### MSW (Mock Service Worker) 配置

```typescript
// tests/setup.ts

import { setupServer } from 'msw/node';
import { rest } from 'msw';

export const server = setupServer(
  rest.get('https://tdx.transportdata.tw/api/basic/v2/Rail/THSR/Station', (req, res, ctx) => {
    const filter = req.url.searchParams.get('$filter');

    if (filter?.includes('City=台北市')) {
      return res(ctx.json([
        { StationCode: '0990', StationName: '台北', City: '台北市' },
        { StationCode: '1000', StationName: '板橋', City: '台北市' }
      ]));
    }

    // 返回所有车站
    return res(ctx.json(allStations));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## 📊 开发优先级顺序

### Phase 2: 进阶查询（当前阶段）✅

#### 优先级 1: 车站 OData 参数
1. **$select** - 字段选择（简单）
   - 测试: 验证只返回指定字段
   - 实现: Array map 操作
   - 预期测试数: 3 个

2. **$filter** - 基础过滤（简单）
   - 测试: 验证过滤条件应用
   - 实现: Array filter 操作
   - 预期测试数: 5 个

3. **$orderby** - 排序（简单）
   - 测试: 验证排序顺序
   - 实现: Array sort 操作
   - 预期测试数: 4 个

4. **$top/$skip** - 分页（简单）
   - 测试: 验证分页边界
   - 实现: Array slice 操作
   - 预期测试数: 5 个

#### 优先级 2: 票价 OData 参数
- 遵循车站相同的模式
- 复用 OData 工具函数

#### 优先级 3: 空间查询
- 需要计算距离（Haversine 公式）
- 预期复杂度: 中等

---

## 🛠️ 开发工具和命令

### 运行开发流程

```bash
# 1. 编写/更新测试
npm run test:watch

# 2. 查看覆盖率
npm run test:coverage

# 3. 类型检查
npm run typecheck

# 4. Lint 检查
npm run lint

# 5. 构建项目
npm run build

# 6. 全量测试（完成后运行）
npm run test
```

### 开发循环示例

```bash
# 终端 1: 监视测试
npm run test:watch

# 终端 2: 编写代码
# 修改 src/lib/feature-resolver.ts

# 终端 3: 检查类型和 lint
npm run typecheck && npm run lint
```

---

## ✅ 完成条件检查表

### 每个项目完成时的验证清单

- [ ] 单元测试编写完整（所有逻辑路径）
- [ ] 集成测试覆盖 CLI 命令
- [ ] 测试覆盖率 ≥ 95%
- [ ] 所有测试通过 ✅
- [ ] TypeScript 无错误 ✅
- [ ] Lint 检查通过 ✅
- [ ] 构建成功 ✅
- [ ] 性能测试（如需） ✅
- [ ] 文档更新（README/代码注释）
- [ ] 在 @PRD.md 中勾选完成

### 完成后的操作

```bash
# 1. 运行完整测试
npm run test

# 2. 检查覆盖率
npm run test:coverage

# 3. 构建验证
npm run build

# 4. 勾选 @PRD.md
# 在相应的 [ ] 改为 [x]

# 5. 提交代码
git add -A
git commit -m "feat: Implement feature-name (TDD)"

# 6. 继续下一个项目
# 回到本列表，处理下一个未完成项目
```

---

## 📚 参考资源

### 设计模式参考
- 🗺️ `.sourceatlas/patterns/cli-command.md` - CLI 命令实现模式
- 🗺️ `.sourceatlas/patterns/api-endpoint.md` - API 端点实现模式
- 📋 `@PRD.md` - 产品路线图和完成清单

### API 文档
- [TDX 官方平台](https://tdx.transportdata.tw/)
- [OData 标准](https://www.odata.org/)
- [Commander.js 文档](https://github.com/tj/commander.js)

### 测试工具
- [Vitest 文档](https://vitest.dev/)
- [MSW 文档](https://mswjs.io/)
- [Vitest 覆盖率](https://vitest.dev/guide/coverage.html)

---

## 🎯 下一步行动

### 立即开始

**第一个任务: 实现 $select 参数支持**

```bash
# 1. 创建测试文件
touch tests/odata-select.test.ts

# 2. 编写失败测试（RED）
# - 测试 stations --select "StationCode,Name"
# - 验证只返回指定字段

# 3. 实现功能（GREEN）
# - 修改 src/lib/station-resolver.ts
# - 添加 select() 方法

# 4. 重构优化（REFACTOR）
# - 提取 OData 工具函数

# 5. 运行测试验证
npm run test

# 6. 勾选 @PRD.md 完成
```

---

**版本:** v0.2.0 (Phase 2 - 进阶查询)
**开始日期:** 2025-12-31
**目标覆盖率:** 35%
**预期发布:** v0.2.0

