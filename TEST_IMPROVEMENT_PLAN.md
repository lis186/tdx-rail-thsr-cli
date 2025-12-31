# Test Improvement Plan - Priority Analysis

**Analysis Date**: 2025-12-31
**Current Coverage**: 74.71% (472 tests)
**Target Coverage**: 85%+
**Gap to Close**: ~10 percentage points

---

## 🔴 Critical Areas - High Priority

### 1. JourneyPlanner (64.80% | 73.46% branches) 🔴 CRITICAL

**Current Status**:
- Statement coverage: 64.80% (lowest in core library)
- Branch coverage: 73.46% (missing 26% of logic paths)
- Function coverage: 87.50% (some functions untested)
- 39 unit tests exist but gaps remain

**Problems Identified**:
```
Missing Test Cases:
├─ Early departure scenarios (lines 157-208 untested)
├─ Latest arrival optimization (lines 222-229 untested)
├─ Invalid date handling
├─ Circular route detection
├─ Transfer time constraints (5-180 min validation)
├─ Time preference filtering
├─ Day change scenarios (cross-midnight journeys)
└─ Multi-transfer path optimization

Branch Issues:
├─ scheduleResolver null checks (not fully tested)
├─ route filtering logic (some paths untested)
├─ preference matching (edge cases missing)
└─ recommendation ranking (tie-breaking not tested)
```

**Impact**: Journey planning is critical user workflow
**Recommendation**: Add 15-20 focused tests for:
- Early/latest departure edge cases
- Transfer time constraint violations
- Date boundary conditions
- Complex multi-leg scenarios

**Estimated Improvement**: +10-15% coverage

---

### 2. TransfersResolver (28.26% | 100% branches) 🔴 CRITICAL

**Current Status**:
- Statement coverage: 28.26% (severely under-tested)
- Branch coverage: 100% (but statement is low?)
- Function coverage: 20% (4 of 20 functions tested)
- 40 integration tests validate workflows, but direct unit tests missing

**Problems Identified**:
```
Untested Functions:
├─ findTransfers() - main function (partial coverage)
├─ findBestTransfer() - optimization logic
├─ rankTransfers() - ranking algorithm
├─ validateTransferTime() - time validation
├─ calculateWaitTime() - time calculation
├─ optimizeRoute() - route optimization
├─ filterByTimeWindow() - filtering logic
└─ Multiple helper methods

Direct Unit Test Gaps:
├─ No tests for transfer ranking algorithm
├─ No tests for wait time calculations
├─ No tests for time window filtering
├─ No tests for route optimization
└─ No edge case tests (negative transfers, etc.)
```

**Impact**: Transfers are key for multi-leg journeys
**Recommendation**: Create dedicated unit test file with:
- Transfer ranking edge cases
- Wait time calculations (0 min, 5 min, 180 min, 181+ min)
- Time window filtering scenarios
- Route optimization comparisons
- Invalid input handling

**Test Skeleton Needed** (20-25 tests):
```typescript
describe('TransfersResolver - Unit Tests', () => {
  describe('findTransfers', () => {
    // 5-7 tests
  });
  describe('findBestTransfer', () => {
    // 4-5 tests
  });
  describe('rankTransfers', () => {
    // 3-4 tests
  });
  describe('validateTransferTime', () => {
    // 3-4 tests
  });
  describe('Edge Cases', () => {
    // 5-6 tests
  });
});
```

**Estimated Improvement**: +15-20% coverage (to ~45%)

---

### 3. CLI Commands Handler Logic (16.81%) 🟠 HIGH

**Current Status**:
- 13 commands exist with handler functions
- 43 CLI integration tests verify registration
- Commands execute and produce output
- BUT: Handler console output logic not tested

**Problems Identified**:
```
CLI Handler Testing Gaps:
├─ stations.ts: 20% coverage
│  ├─ handleStationsCommand() - OData logic untested
│  ├─ handleSearchCommand() - fuzzy match results
│  └─ handleInfoCommand() - detailed output formatting
├─ fare.ts: 15.66% coverage
│  ├─ handleFareCommand() - fare display logic
│  ├─ handleListCommand() - list rendering
│  └─ handleRoutesCommand() - route filtering
├─ journey-plan.ts: 24.77% coverage
│  ├─ handleJourneyPlanCommand() - plan display
│  ├─ handleEarliestCommand() - earliest logic
│  └─ handleLatestCommand() - latest logic
├─ alerts.ts: 18.04% coverage
├─ occupancy.ts: 11.61% coverage
├─ schedule.ts: 13.98% coverage
└─ ... (all commands have similar gaps)

Output Testing Missing:
├─ Table formatting
├─ Error message display
├─ Data validation in handlers
├─ Option parsing and defaults
└─ Edge case error messages
```

**Root Cause**:
- CLI handlers use `console.log()` for output
- V8 coverage doesn't track console output paths
- Would need mock console or alternate approach

**Recommendation**: Create CLI handler mock tests:
- Mock `console.log` to capture output
- Create mock resolver returns
- Test all option combinations
- Verify error message formatting
- Test default option values

**Estimated Effort**: 30-40 tests needed

**Estimated Improvement**: +8-12% coverage

---

## 🟡 Medium Priority Areas

### 4. Schedule Transfer Time Constraints (73.46% branches)

**Current Status**:
- ScheduleResolver has 99.23% statement coverage
- But transfer time constraint logic in JourneyPlanner needs work

**Missing Tests**:
```
Transfer Time Scenarios:
├─ Transfer time = 5 minutes (minimum valid)
├─ Transfer time = 30 minutes (typical)
├─ Transfer time = 180 minutes (maximum valid)
├─ Transfer time = 1 minute (too short)
├─ Transfer time = 181 minutes (too long)
├─ No valid transfer window (trains too far apart)
└─ Multiple parallel transfer options
```

**Location**: Tests should be in journey-planner.test.ts
**Estimated Tests**: 8-10 new tests
**Coverage Gain**: +3-5%

---

### 5. OData Advanced Filtering (92.09% coverage)

**Current Status**:
- ODataUtils: 92.09% statement, 85.13% branches
- Missing lines: 232-233, 284-285

**Missing Test Cases**:
```
OData Features Not Fully Tested:
├─ Complex filter combinations
├─ Multiple $select fields with special characters
├─ $orderby with multi-field sorting
├─ Edge cases in query string parsing
├─ Filter operator combinations
├─ Malformed query handling
└─ Unicode field name support
```

**Estimated Tests**: 10-12 new tests
**Coverage Gain**: +2-3%

---

### 6. ConnectionChecker Complex Scenarios (84.28%)

**Current Status**:
- 84.28% statement coverage
- Missing lines: 249, 253-254, 260

**Missing Test Cases**:
```
Connection Scenarios Not Tested:
├─ Three-train connections (chained transfers)
├─ Connections with <5 minute windows
├─ Multiple viable paths (confidence ranking)
├─ Same-platform connections
├─ Reverse direction connections
├─ Cancelled train in chain
├─ Delayed arrival affecting next train
└─ Confidence scoring edge cases (40-50%, 50-60%, etc.)
```

**Estimated Tests**: 12-15 new tests
**Coverage Gain**: +4-6%

---

### 7. AlertsResolver Severity Filtering (86.56%)

**Current Status**:
- 86.56% statement coverage
- Missing some severity level combinations

**Missing Test Cases**:
```
Alert Severity Edge Cases:
├─ Critical + High together
├─ Medium severity filtering
├─ Multiple alert types per severity
├─ Alert deduplication
├─ Time-based alert expiration
├─ Alert aggregation scenarios
└─ Empty severity lists
```

**Estimated Tests**: 8-10 new tests
**Coverage Gain**: +2-3%

---

## 🟢 Lower Priority Areas

### 8. OccupancyAnalyzer Recommendation Logic (91.08%)

**Current Status**:
- 91.08% statement coverage
- Missing recommendations edge cases

**Missing Tests**:
```
Occupancy Scenarios:
├─ Train with 0% occupancy
├─ Train with 100% occupancy
├─ Multiple trains same occupancy
├─ Partial occupancy data
├─ Seasonal variation
└─ Rush hour scenarios
```

**Estimated Tests**: 6-8 tests
**Coverage Gain**: +2-3%

---

### 9. FareResolver Edge Cases (98.75%)

**Current Status**:
- 98.75% statement coverage
- Missing line: 136-137

**Missing Tests**:
```
Fare Edge Cases:
├─ Promotional fares
├─ Child/Senior discounts
├─ Group discounts
├─ Round-trip special pricing
└─ Seasonal price variations
```

**Estimated Tests**: 4-6 tests
**Coverage Gain**: +0.5-1%

---

## 📊 Test Improvement Roadmap

### Phase 1: Critical Fixes (1-2 days)
**Target**: +15-20% overall coverage improvement

```
Priority 1 - JourneyPlanner
├─ Create 15-20 focused unit tests
├─ Cover early/latest departure edge cases
├─ Test transfer time constraints
├─ Validate date boundary handling
└─ Expected gain: +10-15% (to ~75%)

Priority 2 - TransfersResolver
├─ Create dedicated unit test file
├─ Add 20-25 direct unit tests
├─ Test ranking algorithm thoroughly
├─ Cover wait time calculations
└─ Expected gain: +15-20% (to ~45%)
```

**Phase 1 Impact**: Overall coverage 74.71% → ~85%

---

### Phase 2: Medium Priority (1 week)
**Target**: +5-8% additional coverage

```
Priority 3 - CLI Handlers
├─ Mock console.log for output testing
├─ Create handler-specific test file
├─ Add 30-40 CLI handler tests
└─ Expected gain: +8-12% (to ~25%)

Priority 4 - Advanced Features
├─ OData filtering edge cases (10-12 tests)
├─ ConnectionChecker scenarios (12-15 tests)
├─ AlertsResolver severity (8-10 tests)
└─ Expected gain: +5-8%
```

**Phase 2 Impact**: Overall coverage ~85% → ~90%

---

### Phase 3: Polish (1 week)
**Target**: +2-5% additional coverage

```
Priority 5 - Edge Cases
├─ OccupancyAnalyzer recommendations (6-8 tests)
├─ FareResolver special cases (4-6 tests)
├─ Various edge case scenarios
└─ Expected gain: +2-5%
```

**Phase 3 Impact**: Overall coverage ~90% → 92-95%

---

## 📋 Test Creation Template

### For JourneyPlanner Tests

```typescript
describe('JourneyPlanResolver - Advanced Scenarios', () => {
  describe('Early and Latest Departure', () => {
    it('should find earliest departure with constraints');
    it('should find latest arrival with constraints');
    it('should handle no available early departure');
    it('should handle no available late arrival');
    it('should optimize multiple early options');
  });

  describe('Transfer Time Constraints', () => {
    it('should accept 5-minute transfer (minimum)');
    it('should reject 4-minute transfer (too short)');
    it('should accept 180-minute transfer (maximum)');
    it('should reject 181-minute transfer (too long)');
    it('should handle multiple transfer windows');
  });

  describe('Complex Route Scenarios', () => {
    it('should plan three-leg journey');
    it('should optimize circular routes');
    it('should detect unreachable destinations');
    it('should rank alternatives by efficiency');
  });

  describe('Date and Time Edge Cases', () => {
    it('should handle cross-midnight journeys');
    it('should handle year boundary');
    it('should handle DST transitions');
    it('should prefer direct routes over transfers');
  });
});
```

### For TransfersResolver Tests

```typescript
describe('TransfersResolver - Unit Tests', () => {
  describe('Transfer Ranking', () => {
    it('should rank by transfer time (ascending)');
    it('should rank by wait time (ascending)');
    it('should prefer balanced connections');
    it('should handle tied ranking scenarios');
  });

  describe('Time Window Validation', () => {
    it('should validate 5-minute minimum');
    it('should validate 180-minute maximum');
    it('should handle edge case boundaries');
    it('should reject invalid windows');
  });

  describe('Wait Time Calculation', () => {
    it('should calculate exact wait times');
    it('should handle station arrival delays');
    it('should account for platform change time');
  });

  describe('Route Optimization', () => {
    it('should find shortest path');
    it('should minimize total travel time');
    it('should balance with comfort');
  });
});
```

### For CLI Handler Tests

```typescript
describe('CLI Handlers - Mock Testing', () => {
  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log');
  });

  describe('stations handler', () => {
    it('should display all stations with correct columns');
    it('should format table output correctly');
    it('should handle search results');
    it('should display station info details');
  });

  describe('fare handler', () => {
    it('should display fare with correct format');
    it('should show fare breakdown');
    it('should handle missing fare gracefully');
  });

  describe('journey-plan handler', () => {
    it('should display journey with legs');
    it('should calculate total duration');
    it('should handle no journey found');
  });
});
```

---

## 🎯 Success Criteria

### After Phase 1 (1-2 days)
- [ ] JourneyPlanner: 64.80% → 75%+
- [ ] TransfersResolver: 28.26% → 45%+
- [ ] Overall: 74.71% → 82%+
- [ ] All critical paths tested

### After Phase 2 (1 week)
- [ ] CLI handlers: 16.81% → 25%+
- [ ] Advanced scenarios: +5-8% coverage
- [ ] Overall: 82% → 90%+
- [ ] All major workflows tested

### After Phase 3 (2 weeks)
- [ ] Overall: 90% → 93%+
- [ ] All edge cases covered
- [ ] Production ready with high confidence
- [ ] Maintainable test suite

---

## 💡 Key Metrics to Track

| Metric | Current | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|---------|
| Overall Coverage | 74.71% | 82%+ | 90%+ | 93%+ |
| JourneyPlanner | 64.80% | 75%+ | 80%+ | 85%+ |
| TransfersResolver | 28.26% | 45%+ | 55%+ | 60%+ |
| CLI Handlers | 16.81% | 18%+ | 25%+ | 28%+ |
| Test Count | 472 | 550+ | 650+ | 730+ |
| Pass Rate | 100% | 100% | 100% | 100% |

---

## 🚀 Implementation Priority

**Start with**:
1. JourneyPlanner tests (biggest impact)
2. TransfersResolver tests (critical functionality)
3. CLI handler tests (user-facing)

**Then continue with**:
4. ConnectionChecker advanced scenarios
5. OData advanced filtering
6. AlertsResolver edge cases

**Finally**:
7. Polish remaining edge cases
8. Performance benchmarking
9. Load testing scenarios

---

## 📝 Notes

- JourneyPlanner and TransfersResolver are the highest-value targets
- CLI handlers need mocking strategy (console.log interception)
- Many integration tests exist but direct unit tests are sparse
- Focus on conditional logic (branches) not yet covered
- Add regression tests for bug fixes

**Total Tests to Add**: 100-150 tests
**Expected Final Coverage**: 90-95%
**Estimated Time**: 2-3 weeks with focused effort
