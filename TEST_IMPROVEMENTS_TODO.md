# 測試改進 TODO

對應「TDX live API 接通後一輪審視測試發現的盲點」。每項都對應一類 848 個現有測試抓不到的 bug。

## 背景：本 session 真踩到的 bug

- [x] **dist 產物炸掉** — `a767c0c` 修。4 個 src 檔（`src/lib/operator-resolver.ts`、`src/lib/station-resolver.ts`、`src/data/operators.ts`、`src/data/stations.ts`）的相對 import 漏 `.js`。`tsx` 容忍、Node ESM 不接，`node dist/index.js` 第一個 import 就 crash。893 個測試全綠（都跑 source via tsx）。
- [x] **commander v12 parent/sub 同名 `--date` shadowing** — `548f577` 修。parent 先吃掉 `--date`，subcommand 永遠拿到自己的預設。子指令 date validation 在 CLI 中完全不可達。修法：subcommand 移除自己的 `--date`，改用 `command.optsWithGlobals().date`。
- [x] **commander v12 kebab→camel 鍵名讀錯** — `1d21ad7` 修。`journey-plan` / `transfers` 6 個 flag 全 silent no-op。原因：commander 自動 camelCase 但 handler 用 `options['departure-time']` 取，永遠 `undefined`。為什麼 848 tests 沒抓到：原 fixture 只有 3 班車，filter 設什麼都拿到同一筆。
- [x] **Fixture vs live schema 漂移** — `dfbf0f4` pin。ODFare 多假欄位、AvailableSeatStatusList 有 envelope、GeneralTimetable endpoint 名錯。contract test 釘住但只比 top-level keys。

---

## P0-1：Differential 測試（filter 行為比對）

抓 bug：filter 變 no-op、commander 鍵名讀錯整類。
新建 `tests/cli-differential.test.ts`。

- [ ] 設計：每個 filter flag 都有「無 flag」vs「有 flag」一對測試，斷言**結果不同且符合屬性**
- [ ] 依賴 P0-8 的 `--json` mode（用 JSON parse、不用字串配對）
- [ ] `journey-plan A→B --departure-time T` → result.departureTime ≥ T
- [ ] `journey-plan A→B --arrival-time T` → result.arrivalTime ≤ T
- [ ] `journey-plan A→B --allow-transfers` → 跟無 flag 結果可能不同
- [ ] `transfers A→B --max-wait N` → 每選項 transferWaitTime ≤ N
- [ ] `transfers A→B --prefer-short-wait` → 結果排序 wait time 非遞減
- [ ] `transfers A→B --hub <station>` → 所有 connectingStation === hub
- [ ] `schedule station X` → 每筆 stops 含 X
- [ ] `schedule route A→B` → 每筆 from index < to index
- [ ] `stations --top N` → 結果 ≤ N 筆
- [ ] `stations --filter <expr>` → 每筆符合 expr
- [ ] `alerts --status Normal` → 每筆 Status === 'Normal'
- [ ] **驗收**：把 `options.maxWait` 改回 `options['max-wait']`，跑測試看到失敗 → 改回
- [ ] 累計新增 ≥ 30 個 differential test
- 估時：2-3h（含 9 個 command 全 `--json` 化）

---

## P0-2：Lint 擋 kebab-case option 取值

抓 bug：commander 鍵名讀錯（從原因處堵）。

- [ ] 編輯 `.github/workflows/test.yml`，加入 step：
  ```yaml
  - name: Forbid kebab-string option access
    run: |
      if grep -rnE "options\[['\"][a-z]+-[a-z]+" src/commands/; then
        echo "::error::Use camelCase: options.fooBar (commander v12 auto-camelizes --foo-bar)"
        exit 1
      fi
  ```
- [ ] 同步加進 `package.json` 的 `"lint"` script，本機可跑
- [ ] **驗收**：故意在 src/commands 寫一行 `options['departure-time']`，CI 紅 → 移除恢復
- 估時：15 分鐘

---

## P0-3：把 fixture 換厚（live snapshot）

抓 bug：稀疏 fixture 隱藏 filter bug。為 P0-1 / P0-4 鋪基礎。

- [ ] 新建 `scripts/refresh-fixtures.ts`
  - [ ] 讀 `process.env.TDX_CLIENT_ID` / `TDX_CLIENT_SECRET`，沒有就讀 sibling `.env`（同 `tests/contract-tdx.test.ts`）
  - [ ] 抓 `/v2/Rail/THSR/Station` → `tests/fixtures/thsr-stations.json`
  - [ ] 抓 `/v2/Rail/THSR/ODFare` → `tests/fixtures/thsr-fares.json`
  - [ ] 抓 `/v2/Rail/THSR/DailyTimetable/Today` 並透過 `dailyToSchedule()`（src/services/data-source.ts）轉成 `THSRSchedule[]` → `tests/fixtures/thsr-schedules.json`
  - [ ] 抓 `/v2/Rail/THSR/AlertInfo` → `tests/fixtures/thsr-alerts.json`（新增）
- [ ] `package.json` 加 `"refresh-fixtures": "tsx scripts/refresh-fixtures.ts"`
- [ ] 跑一次、commit 新 fixture（會從 ~10KB 跳到 ~500KB-1MB，正常）
- [ ] 跑 `npm test`，把硬編碼期望（`expect(out).toContain('601')` 等）對齊新資料
- [ ] CI 加 weekly cron job 自動跑 + 開 PR（可放 P1-6 一起做）
- [ ] **驗收**：fixture 含 ≥ 100 班車、12 站、上百筆票價；`npm test` 全綠
- 估時：1h

---

## P0-4：Property-based 斷言

抓 bug：邏輯不變式破壞（filter no-op、排序錯、邊界 off-by-one）。
靠 P0-3 的厚 fixture + P0-8 的 JSON mode。

- [ ] `schedule train X` 第一站 = train 的 StartingStation
- [ ] `schedule train X` 最後站 = EndingStation
- [ ] `schedule train X` StopSequence 連續遞增
- [ ] `journey-plan earliest A→B` ≤ 任何其他 valid journey 的 departureTime
- [ ] `journey-plan latest A→B` ≥ 任何其他 valid journey 的 arrivalTime
- [ ] `fare A→B` 結果 from === A、to === B
- [ ] `fare A→A` 必無結果（同站）
- [ ] `transfers A→B` 每選項：connectTime > departTime
- [ ] `transfers A→B` 每選項：firstTrain ≠ secondTrain
- [ ] `stations search X` 每筆結果含 X（StationName.Zh_tw 或 StationCode）
- [ ] `stations --nearby lat,lon --radius R` 每筆結果與 lat,lon 距離 ≤ R
- [ ] **驗收**：把 `src/lib/journey-planner.ts:64` 的 `if (dept < options.departureTime)` 反向成 `>`，property test 紅 → 改回
- [ ] 9 個保留命令每個 ≥ 3 個屬性斷言
- 估時：2h

---

## P1-5：Contract test 加深一層

抓 bug：TDX 內層 schema 漂移。
編輯 `tests/contract-tdx.test.ts`。

- [ ] `/Station`：加比 `StationName` keys（`Zh_tw, En`）和 `StationPosition` keys（`PositionLon, PositionLat, GeoHash`）
- [ ] `/ODFare`：加比 `Fares[0]` keys（`TicketType, FareClass, CabinClass, Price`）
- [ ] `/DailyTimetable/Today`：加比 `DailyTrainInfo` keys、`StopTimes[0]` keys
- [ ] `/AlertInfo`：保留現有比，補齊 optional 欄位文檔
- [ ] `/News`：加比 `AttachmentUrlList[0]`（如非空）
- [ ] **驗收**：把 `src/types/api.ts` 的 `DailyStopTime.StopSequence` 暫時改名，contract 紅 → 改回
- 估時：30 分鐘

---

## P1-6：CI live smoke job（gated）

抓 bug：TDX 政策變、token 失效、429 限流、新 endpoint 行為改。

- [ ] GitHub repo Settings → Secrets 新增 `TDX_CLIENT_ID` / `TDX_CLIENT_SECRET`
- [ ] 改 `tests/contract-tdx.test.ts`：先檢查 `process.env.TDX_CLIENT_ID`，有就跳過 sibling `.env` 讀檔（CI 沒有那個路徑）
- [ ] 新建 `tests/live-smoke.test.ts`：
  - [ ] auto-skip 條件：`!process.env.TDX_CLIENT_ID`
  - [ ] 9 個保留命令每個打一次 live、檢查 exitCode 0、輸出含關鍵字
  - [ ] 不過度斷言內容值（live 會變動）
- [ ] 編輯 `.github/workflows/test.yml` 加 job：
  ```yaml
  live-smoke:
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    env:
      TDX_CLIENT_ID: ${{ secrets.TDX_CLIENT_ID }}
      TDX_CLIENT_SECRET: ${{ secrets.TDX_CLIENT_SECRET }}
    steps: [checkout, setup-node, npm ci, run contract + live-smoke tests]
  ```
- [ ] workflow 加 `schedule:` 區塊（每週一 UTC 02:00）+ `workflow_dispatch:` 手動觸發
- [ ] **驗收**：手動觸發 live-smoke 過綠；故意把 client_id 改錯、job 紅
- 估時：1h

---

## P2-7：Snapshot tests for 命令輸出

抓 bug：表格 column / 訊息文字 / 欄位順序的 silent regression。

- [ ] 新建 `tests/__snapshots__/`（vitest 自動建）
- [ ] 安裝 `strip-ansi`（`npm i -D strip-ansi`），測試裡剝顏色避免誤判
- [ ] 對 9 個命令的 default action 加 snapshot
- [ ] 各自最多 2 個關鍵 subcommand 加 snapshot（共 ~15-20 snapshot）
- [ ] 文檔：在 `CONTRIBUTING.md` 或本 TODO 補一段「regenerate snapshot 流程」（review 變動，不要一鍵 `--update`）
- [ ] **驗收**：把 `src/commands/stations.ts` 的 `'\n高鐵車站列表：\n'` 改成 `'\n車站清單：\n'`，相關 snapshot 紅 → 改回
- 估時：30-45 分鐘

---

## P2-8：CLI `--json` 輸出 mode

P0-1 / P0-4 的基礎建設。
注意：`src/cli.ts` 已有 global `-f, --format <format>` 但目前所有 handler 都不看 — **本身就是 silent bug，這項順便修**。

- [ ] 採用方案 B：先給 3 個常被自動化的命令加 `--json`：`journey-plan`、`transfers`、`schedule`
- [ ] `journey-plan` 三個 handler 重構：抽出純資料 `JourneyPlan` 物件，handler 視 `--json` 印 JSON 或表格
- [ ] `transfers` 三個 handler 同樣
- [ ] `schedule` 三個 handler 同樣
- [ ] 每個 command 加 1 個測試：`--json` 輸出能 `JSON.parse` 且含預期 key
- [ ] **驗收**：`thsr journey-plan 南港 左營 --json` 印 valid JSON；無 flag 保持原表格
- [ ] 後續逐步擴張到其餘 command（不在這個項目範圍）
- 估時：1.5h

---

## P3-9：Mutation testing（Stryker）

量化「測試到底擋了什麼」。最後做。

- [ ] `npm i -D @stryker-mutator/core @stryker-mutator/vitest-runner`
- [ ] `npx stryker init`
- [ ] 設定 `stryker.config.json`：
  - [ ] `mutate: ["src/commands/**/*.ts", "src/lib/**/*.ts"]`
  - [ ] `testRunner: "vitest"`
  - [ ] `thresholds: { high: 80, low: 60, break: 50 }`
- [ ] 跑 baseline → 看 score（預期 60-70%）
- [ ] tune 速度（concurrency、incremental mode）
- [ ] 處理明顯 false positive
- [ ] **驗收**：mutation score ≥ 70%；把 P0-1 differential test 全 disable，score 跌 ≥ 10 個百分點
- [ ] 加進 weekly CI（避免拖慢 PR）
- 估時：2-3h

---

## 推薦執行順序

| Phase | 項目 | 累計時 |
|---|---|---|
| 1 | P0-2（lint） | 0:15 |
| 1 | P0-3（厚 fixture） | 1:15 |
| 1 | P0-8（json mode） | 2:45 |
| 1 | P0-1（differential） | 5:45 |
| 1 | P0-4（property） | 7:45 |
| 2 | P1-5（nested contract） | 8:15 |
| 2 | P1-6（live smoke CI） | 9:15 |
| 3 | P2-7（snapshot） | 10:00 |
| 4 | P3-9（mutation） | 13:00 |

P1 完成後，本 session 這類 bug 的再現機率接近零。

---

## 非目標（明確排除，避免 scope creep）

- [ ] ~~重寫 resolver 為 async constructor~~ — default-arg pattern 已 OK，動了會炸大量現有測試
- [ ] ~~移除 fixture-based fallback~~ — 離線/沒 creds 還能用 stations / fare 是真實價值
- [ ] ~~TDX e2e 100% 覆蓋~~ — 429 限流會打爛、CI 變慢；live smoke 限定每週一次足矣
- [ ] ~~加新 endpoint 進 CLI~~ — 現有 9 命令對應 6 endpoint 已涵蓋 TDX 對 THSR 全部公開資料

---

## 接手時先讀的檔案

- `src/services/data-source.ts` — 資料源切換層（live → cache → bundled fallback）
- `src/services/api.ts` — TDX endpoint wrapping
- `src/services/cache.ts` — file-based TTL cache
- `tests/setup.ts` — 全域 strip TDX env 確保 fixture 路徑 deterministic
- `tests/contract-tdx.test.ts` — schema drift detection
- `vitest.config.ts` — `setupFiles: ['./tests/setup.ts']`
- `.github/workflows/test.yml` — CI（目前只有 typecheck + build + test）
