🗺️ SourceAtlas: Pattern Analysis
═════════════════════════════════════════════════════════════════════════════

🧩 **CLI Command Pattern** │ 3 files found

---

## 📋 Overview

The CLI Command pattern in this codebase follows a separation-of-concerns architecture where each command (stations, fare, health) is implemented as a distinct module that delegates business logic to a dedicated resolver. Commands use Commander.js for argument parsing and cli-table3 for formatted output, while maintaining consistent emoji-based messaging for user feedback.

---

## 🔍 Best Examples

### Example 1: Complex Multi-Subcommand Pattern (stations.ts)
```typescript
// File: src/commands/stations.ts (101 lines)

const stationsCommand = new Command('stations')
  .description('Get THSR station information')
  .action(handleStationsCommand);  // Main action handler

stationsCommand
  .command('search <query>')
  .description('Search stations by name or code')
  .action(handleStationsSearch);

stationsCommand
  .command('info <station>')
  .description('Display detailed station information')
  .action(handleStationsInfo);

// Handler Functions - Delegate to Resolvers
async function handleStationsCommand() {
  try {
    const stations = await stationResolver.getAllStations();
    // Format and display using cli-table3
    const table = new Table({
      head: ['Station', 'Code', 'Location'],
      style: { head: ['cyan'], border: ['cyan'] }
    });
    stations.forEach(s => table.push([s.name, s.code, s.location]));
    console.log(table.toString());
  } catch (error) {
    console.error(`❌ Failed to fetch stations: ${error.message}`);
    process.exit(1);
  }
}
```

**Key Code Aspects:**
- Command definition separate from handlers
- Subcommands nested under parent command
- Business logic delegated to resolver class
- Async/await error handling with explicit process.exit()

**Key Points:**
- Handler functions use verb prefixes: `handleStationsCommand`, `handleStationsSearch`
- Each handler encapsulates one logical operation
- Output formatting (table) is part of handler responsibility
- Error messages use emoji prefix (❌, ✅, ⚠️)

---

### Example 2: Simple Single-Action Pattern (health.ts)
```typescript
// File: src/commands/health.ts (37 lines)

const healthCommand = new Command('health')
  .description('Check TDX API health and connectivity')
  .action(handleHealthCommand);

async function handleHealthCommand() {
  const config = new ConfigService();
  const client = new TDXApiClient(
    config.getClientId(),
    config.getClientSecret()
  );

  try {
    const health = await client.health();
    if (health.status === 'healthy') {
      console.log(`\n✅ ${health.message}\n`);
      process.exit(0);
    } else {
      console.log(`\n❌ ${health.message}\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Health check failed: ${error.message}\n`);
    process.exit(1);
  }
}
```

**Key Code Aspects:**
- Single action with no subcommands
- Direct service instantiation (config, API client)
- Explicit exit codes for shell integration
- Minimal output formatting

**Key Points:**
- Simple command can have inline handler
- Exit codes matter: 0 = success, 1 = failure
- Newlines around output for readability in terminal
- Error handling at top level catches all exceptions

---

### Example 3: Parameter-Driven Pattern (fare.ts)
```typescript
// File: src/commands/fare.ts (164 lines)

const fareCommand = new Command('fare')
  .description('Get THSR fares between stations')
  .argument('<from>', 'Origin station')
  .argument('<to>', 'Destination station')
  .action(handleFareCommand);

fareCommand
  .command('list')
  .description('List all available routes')
  .option('--limit <number>', 'Limit results', '100')
  .action(handleFareList);

async function handleFareCommand(from: string, to: string) {
  try {
    // Resolve station names to codes
    const fromStation = await stationResolver.resolveStation(from);
    const toStation = await stationResolver.resolveStation(to);

    // Query fare
    const fare = await fareResolver.getFareByName(
      fromStation.code,
      toStation.code
    );

    if (!fare) {
      console.warn(`⚠️  No direct fare between ${from} and ${to}`);
      process.exit(1);
    }

    // Display results
    displayFareDetails(fare);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Fare query failed: ${error.message}`);
    process.exit(1);
  }
}

function displayFareDetails(fare: Fare) {
  const table = new Table({
    head: ['Class', 'Standard', 'Discount'],
    style: { head: ['cyan'], border: ['cyan'] }
  });

  fare.prices.forEach(price => {
    table.push([
      price.class,
      `NT$${price.standard}`,
      `NT$${price.discount}`
    ]);
  });

  console.log(`\n✅ Fares from ${fare.from} to ${fare.to}:\n`);
  console.log(table.toString());
}
```

**Key Code Aspects:**
- Parameters extracted from command arguments
- Station name resolution before query
- Data transformation (codes) between layers
- Conditional output formatting based on result state

**Key Points:**
- Resolver used for fuzzy matching station names
- Display logic extracted to separate function
- Table styling consistent across commands
- Newlines enhance readability

---

## 🎯 Key Conventions

1. **Command Naming**: `<resource>Command` (e.g., `stationsCommand`, `fareCommand`, `healthCommand`)

2. **Handler Naming**: `handle<Resource><Action>` (e.g., `handleStationsCommand`, `handleFareList`, `handleHealthCommand`)

3. **Resolver Pattern**: Business logic in `<resource>-resolver.ts` classes with methods like:
   - `getAllStations()`
   - `searchStations(query)`
   - `getFareByName(from, to)`

4. **Output Formatting**: Use `cli-table3` with consistent styling:
   ```typescript
   head: ['cyan']
   border: ['cyan']
   ```

5. **Error Messaging**: Emoji prefixes for status:
   - ✅ Success operations
   - ❌ Error conditions
   - ⚠️ Warning conditions
   - Process exits with appropriate codes (0, 1)

6. **Service Injection**: Commands instantiate services they need:
   - `ConfigService` for credentials
   - `TDXApiClient` for API calls
   - Resolvers for business logic

7. **Async Pattern**: All handlers use async/await with try-catch error handling at the top level

---

## 🧪 Testing Pattern

**Location**: `tests/` directory with `*.test.ts` files

**Testing Strategy**:
```typescript
// Test the resolver, not the CLI command
describe('StationResolver', () => {
  it('should return all stations', async () => {
    const resolver = new StationResolver(mockApiClient);
    const stations = await resolver.getAllStations();
    expect(stations).toHaveLength(12);
    expect(stations[0]).toHaveProperty('code');
  });
});
```

**Key Points**:
- Test resolvers independently, not CLI layer
- Mock API client using MSW (Mock Service Worker)
- Test data in `tests/fixtures/` (thsr-stations.json, thsr-fares.json)
- Commands tested through integration tests if needed

---

## ⚠️ Common Pitfalls to Avoid

1. **Mixing CLI logic with business logic**
   - ❌ Don't: Put API calls directly in handlers
   - ✅ Do: Delegate to resolver classes

2. **Inconsistent error handling**
   - ❌ Don't: Swallow errors silently or throw without exit code
   - ✅ Do: Always catch, log with emoji, exit(1)

3. **Hard-coding configuration values**
   - ❌ Don't: Inline API credentials or endpoints
   - ✅ Do: Use ConfigService for all credentials

4. **Forgetting parameter validation**
   - ❌ Don't: Assume station names are valid
   - ✅ Do: Use resolveStation() to normalize and validate

5. **Inconsistent output formatting**
   - ❌ Don't: Use different table styles or emoji sets
   - ✅ Do: Use centralized table styling config

6. **Not handling edge cases**
   - ❌ Don't: Assume every query returns results
   - ✅ Do: Check for empty results, invalid stations, API errors

---

## 📝 Step-by-Step Implementation Guide

### Adding a New CLI Command

#### Step 1: Create the Resolver (if needed)
```typescript
// src/lib/new-resolver.ts
export class NewResolver {
  constructor(private apiClient: TDXApiClient) {}

  async getNewData(param: string): Promise<NewData[]> {
    const response = await this.apiClient.getNewEndpoint(param);
    return this.transformData(response);
  }

  private transformData(raw: any): NewData[] {
    // Transform API response to domain model
  }
}
```

#### Step 2: Create the Command File
```typescript
// src/commands/new-command.ts
import { Command } from 'commander';
import { NewResolver } from '../lib/new-resolver.ts';
import Table from 'cli-table3';

const newResolver = new NewResolver(new TDXApiClient(...));

export const newCommand = new Command('new')
  .description('Description of new command')
  .action(handleNewCommand);
```

#### Step 3: Implement Main Handler
```typescript
async function handleNewCommand() {
  try {
    const data = await newResolver.getNewData();
    displayNewData(data);
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}
```

#### Step 4: Implement Display Function
```typescript
function displayNewData(data: NewData[]) {
  const table = new Table({
    head: ['Column1', 'Column2'],
    style: { head: ['cyan'], border: ['cyan'] }
  });

  data.forEach(item => {
    table.push([item.col1, item.col2]);
  });

  console.log(`\n✅ New Data:\n`);
  console.log(table.toString());
}
```

#### Step 5: Register in CLI
```typescript
// src/cli.ts
import { newCommand } from './commands/new-command.ts';

cli.addCommand(newCommand);
```

#### Step 6: Add Tests
```typescript
// tests/new-resolver.test.ts
describe('NewResolver', () => {
  it('should get new data', async () => {
    const resolver = new NewResolver(mockApiClient);
    const data = await resolver.getNewData('param');
    expect(data).toBeDefined();
  });
});
```

---

## 🔗 Related Patterns

1. **Resolver Pattern** - Business logic abstraction layer (found in `src/lib/`)
2. **Service Layer Pattern** - API client and configuration management (found in `src/services/`)
3. **Mock Service Worker (MSW)** - API mocking for testing (used in test setup)
4. **Commander.js** - CLI framework base pattern
5. **CLI Table Formatting** - Consistent output presentation

---

## ✅ Verification Results

**Files Analyzed**: 3
- `src/commands/stations.ts` (101 lines)
- `src/commands/fare.ts` (164 lines)
- `src/commands/health.ts` (37 lines)

**Directories Verified**: 3
- `src/commands/` - Command implementations
- `src/lib/` - Resolver classes
- `tests/` - Test implementations

**Code Snippets Extracted**: 3
- Multi-subcommand pattern (stations)
- Simple single-action pattern (health)
- Parameter-driven pattern (fare)

**Conventions Identified**: 7
- Command naming
- Handler naming
- Resolver pattern
- Output formatting
- Error messaging
- Service injection
- Async pattern

---

═════════════════════════════════════════════════════════════════════════════
🗺️ v2.10.1 │ Constitution v1.1 │ CLI Pattern Analysis

💾 Saved: `.sourceatlas/patterns/cli-command.md`
✅ Ready for: Future CLI command implementations
═════════════════════════════════════════════════════════════════════════════
