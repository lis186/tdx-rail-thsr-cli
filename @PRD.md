# 🚄 Taiwan High Speed Rail CLI - Product Roadmap (@PRD)

**Last Updated:** 2025-12-29
**Version:** 0.1.0
**Status:** 初始發佈版本

---

## 📋 API 端點覆蓋清單

### 🔷 第一層：核心票務資訊（基礎服務）

#### 1. 車站資訊 - GET /v2/Rail/THSR/Station
- [x] `stations` - 列出所有車站
- [x] `stations search <query>` - 搜尋車站（模糊匹配）
- [x] `stations info <station>` - 顯示車站詳細資訊
- [x] `stations --filter "City=台北市"` - OData $filter 過濾
- [x] `stations --select "StationCode,Name"` - OData $select 欄位選擇
- [x] `stations --orderby "Name"` - OData $orderby 排序
- [x] `stations --top 10 --skip 5` - OData 分頁查詢 ($top/$skip)
- [x] `stations --nearby "25.0477,121.5170" --radius 1000` - 空間查詢 (Haversine 公式)

#### 2. 票價資訊 - GET /v2/Rail/THSR/ODFare
- [x] `fare <from> <to>` - 查詢兩站票價
- [x] `fare list` - 列出所有票價路線
- [x] `fare routes <station>` - 顯示指定車站的路線（出發和到達）
- [x] `fare list --filter "OriginStationCode=TPE"` - OData $filter 過濾
- [x] `fare list --select "OriginStationCode,DestinationStationCode,Price"` - OData $select 欄位選擇
- [x] `fare list --orderby "Price"` - OData $orderby 排序
- [x] `fare list --top 20 --skip 10` - OData 分頁查詢 ($top/$skip)
- [x] `fare --date "2025-12-31"` - 特定日期票價查詢

#### 3. 營運業者資訊 - GET /v2/Rail/Operator
- [x] `operator list` - 列出所有軌道營運業者
- [x] `operator info <operator-id>` - 顯示特定營運業者資訊
- [x] `operator list --filter "OperatorCode=THSR"` - OData $filter 過濾

---

### 🔷 第二層：進階查詢功能（OData 標準功能）

#### OData 查詢參數實現
- [x] $select - 欄位選擇（stations 端點已支援）
- [x] $filter - 進階過濾（stations 端點已支援）
- [x] $orderby - 結果排序（stations 端點已支援）
- [x] $top / $skip - 分頁查詢（stations 端點已支援）
- [x] $format - 響應格式控制（JSON/XML）
- [x] 空間查詢 nearby() - 1000m 範圍內搜尋

---

### 🔷 第三層：實時動態功能（TDX 平台實時 API）

#### 列車時刻表 - GET /v2/Rail/THSR/Schedule（待確認是否提供）
- [ ] `schedule <station>` - 查詢指定站點的列車時刻
- [ ] `schedule <from> <to>` - 查詢路線時刻表
- [ ] `schedule --date "2025-12-31"` - 特定日期時刻表
- [ ] `schedule --filter "TrainNo=601"` - 特定列車號搜尋

#### 實時列車狀態 - GET /v2/Rail/THSR/TrainStatus（待確認是否提供）
- [ ] `train-status <train-number>` - 查詢列車實時狀態
- [ ] `train-status <station>` - 查詢經過該站的列車狀態
- [ ] `train-status --filter "Status=Delayed"` - 篩選延誤列車

#### 座位可用性 - GET /v2/Rail/THSR/Availability（待確認是否提供）
- [ ] `seat-availability <train-number>` - 查詢列車座位可用性
- [ ] `seat-availability <from> <to>` - 查詢路線座位供應
- [ ] `seat-availability --seat-type "Standard"` - 篩選特定艙等
- [ ] `seat-availability --class "Business"` - 篩選商務車廂

#### 列車延誤資訊 - GET /v2/Rail/THSR/Delay（待確認是否提供）
- [ ] `train-delay <station>` - 查詢該站列車延誤情況
- [ ] `train-delay --filter "Delay>5"` - 篩選超過 5 分鐘延誤
- [ ] `train-delay-alert <station>` - 訂閱延誤警報

#### 列車運營狀態 - GET /v2/Rail/THSR/ServiceStatus（待確認是否提供）
- [ ] `service-status` - 查詢整體服務狀態
- [ ] `service-status --station <station>` - 查詢特定站點狀態
- [ ] `service-status --alert-only` - 僅顯示異常狀態

---

### 🔷 第四層：增值服務功能（外部集成）

#### 行程規劃 - 自組開發或第三方 API
- [ ] `journey-plan <from> <to>` - 最優行程規劃
- [ ] `journey-plan --departure-time "14:00"` - 指定出發時間
- [ ] `journey-plan --arrival-time "18:00"` - 指定到達時間
- [ ] `journey-plan --transfers-allowed true` - 允許轉運

#### 轉運建議 - 自組開發或第三方 API
- [ ] `transfers <from> <to>` - 轉運選項建議
- [ ] `transfers --prefer-time 30` - 轉運時間偏好（分鐘）
- [ ] `transfers --other-transport` - 包含其他交通工具建議

#### 線上預訂 - 與官方高鐵系統整合
- [ ] `booking create <from> <to> <date>` - 建立預訂
- [ ] `booking list` - 顯示我的預訂
- [ ] `booking cancel <booking-id>` - 取消預訂
- [ ] `booking modify <booking-id>` - 修改預訂
- [ ] `booking pay <booking-id>` - 支付預訂

#### 會員系統 - 與官方會員系統整合
- [ ] `member login` - 會員登入
- [ ] `member logout` - 會員登出
- [ ] `member profile` - 顯示會員資料
- [ ] `member points` - 查詢累積哩程
- [ ] `member redeem <points>` - 兌換優惠

---

## 📊 實現狀態統計

| 層級 | 功能數量 | 已實現 | 未實現 | 覆蓋率 | 優先度 |
|------|---------|--------|--------|--------|--------|
| 第一層（核心） | 15 | 15 | 0 | **100%** | 🔴 高 |
| 第二層（進階） | 6 | 6 | 0 | **100%** | 🟡 中 |
| 第三層（實時） | 15+ | 0 | 15+ | 0% | 🟡 中 |
| 第四層（增值） | 12+ | 0 | 12+ | 0% | 🟢 低 |
| **總計** | **48+** | **21** | **27+** | **44%** | - |

---

## 🎯 開發優先度排序

### Phase 1: MVP 增強（1-2 週）✅ 當前版本
- [x] 車站列表查詢
- [x] 車站搜尋
- [x] 票價查詢
- [x] API 健康檢查

**成果：** 核心功能發佈版本

### Phase 2: 進階查詢（2-3 週）
- [ ] OData $filter 實現
- [ ] OData $select 實現
- [ ] OData $orderby 實現
- [ ] 分頁支援
- [ ] 空間查詢支援

**目標覆蓋率：** 35%
**預計發佈：** v0.2.0

### Phase 3: 實時功能（3-4 週）
- [ ] 確認 TDX 實時 API 可用性
- [ ] 時刻表查詢實現
- [ ] 實時狀態查詢實現
- [ ] 座位可用性查詢實現
- [ ] 延誤警報實現

**目標覆蓋率：** 70%
**預計發佈：** v0.3.0

### Phase 4: 增值服務（4-8 週）
- [ ] 行程規劃引擎
- [ ] 轉運建議系統
- [ ] 預訂系統整合
- [ ] 會員系統整合
- [ ] 推播通知

**目標覆蓋率：** 100%
**預計發佈：** v1.0.0

---

## 📈 開發進度追蹤

```
Phase 1 (MVP): ████████████████████ 100% ✅
Phase 2 (進階): ████████████████████ 100% ✅
Phase 3 (實時):                      0% ⏳
Phase 4 (增值):                      0% ⏳

總進度: ███████████░░░░░░░░░░░░░░░░░ 44%
```

---

## 🔍 API 端點驗證狀態

| 端點 | Swagger 確認 | 實現狀態 | 測試狀態 | 備註 |
|------|-----------|---------|---------|------|
| /v2/Rail/THSR/Station | ✅ 已確認 | ✅ 已實現 | ✅ 已驗證 | 核心功能 |
| /v2/Rail/THSR/ODFare | ✅ 已確認 | ✅ 已實現 | ✅ 已驗證 | 核心功能 + 日期查詢 |
| /v2/Rail/Operator | ✅ 已確認 | ✅ 已實現 | ✅ 已驗證 | 營運業者 |
| /v2/Rail/THSR/Schedule | ❓ 未確認 | ❌ 未實現 | ⏳ 待確認 | 需 TDX 確認 |
| /v2/Rail/THSR/TrainStatus | ❓ 未確認 | ❌ 未實現 | ⏳ 待確認 | 需 TDX 確認 |
| /v2/Rail/THSR/Availability | ❓ 未確認 | ❌ 未實現 | ⏳ 待確認 | 需 TDX 確認 |
| /v2/Rail/THSR/Delay | ❓ 未確認 | ❌ 未實現 | ⏳ 待確認 | 需 TDX 確認 |

---

## 📝 待辦事項

### 立即行動（本週）
- [ ] 向 TDX 確認第三層實時 API 的可用性
- [ ] 整理 API 文檔和範例
- [ ] 建立開發分支用於 Phase 2

### 短期計劃（下週）
- [ ] 開始 Phase 2 OData 查詢實現
- [ ] 撰寫進階查詢的文檔
- [ ] 新增進階查詢測試用例

### 中期計劃（2-4 週）
- [ ] 完成 Phase 2 所有功能
- [ ] 根據 TDX 回覆決定 Phase 3 方向
- [ ] 評估預訂系統整合的可行性

---

## 🔗 參考資源

- [TDX 官方平台](https://tdx.transportdata.tw/)
- [TDX API 文檔](https://tdx.transportdata.tw/api-service)
- [台灣高鐵官網](https://www.thsrc.com.tw/)
- [OData 標準](https://www.odata.org/)

---

**責任人：** lis186
**最後更新：** 2025-12-29
**下次審查：** 2026-01-05
