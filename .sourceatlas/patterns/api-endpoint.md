🗺️ SourceAtlas: Pattern Analysis
═════════════════════════════════════════════════════════════════════════════

🔌 **API Endpoint Pattern** │ 3 endpoints implemented

---

## 📋 Overview

API endpoints in this codebase are implemented through the `TDXApiClient` class, which handles OAuth2 authentication with token caching and provides typed methods for each endpoint. The pattern standardizes authentication, error handling, and response transformation through a single service layer, enabling consistent endpoint access across all CLI commands.

---

## 🔍 Best Examples

### Example 1: Standard Data Endpoint with Pagination (getStations)
```typescript
// File: src/services/api.ts (59-72 lines)

/**
 * Fetch THSR Stations
 */
async getStations(): Promise<THSRStation[]> {
  const token = await this.getAccessToken();
  const response = await $fetch<THSRStation[]>(
    `${this.baseUrl}/v2/Rail/THSR/Station?$format=JSON&$top=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  );

  return response;
}
```

**Key Code Aspects:**
- Type-safe response with generics `<THSRStation[]>`
- Token retrieval handled first (handles refresh automatically)
- OData query parameters: `$format=JSON&$top=100`
- Standard authorization header with Bearer token
- Direct response return (no transformation needed)

**Key Points:**
- Base URL and endpoint path are constants
- $top parameter sets pagination limit
- Headers include both Authorization and Accept
- Errors propagate naturally (not caught here)
- Response already typed from API

---

### Example 2: Large Result Set with Increased Limit (getFares)
```typescript
// File: src/services/api.ts (74-90 lines)

/**
 * Fetch THSR Fares
 */
async getFares(): Promise<THSRODFare[]> {
  const token = await this.getAccessToken();
  const response = await $fetch<THSRODFare[]>(
    `${this.baseUrl}/v2/Rail/THSR/ODFare?$format=JSON&$top=500`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  );

  return response;
}
```

**Key Code Aspects:**
- Same pattern as getStations but with higher limit
- Handles larger result sets (500 vs 100)
- Uses different endpoint path (/v2/Rail/THSR/ODFare)
- Type-safe with domain-specific type `THSRODFare[]`

**Key Points:**
- $top parameter should be set based on expected result count
- Station endpoint uses 100, Fare endpoint uses 500
- Pattern is identical except for endpoint and type
- No custom transformation needed (API returns clean data)

---

### Example 3: Health Check with Error Handling (health)
```typescript
// File: src/services/api.ts (92-114 lines)

/**
 * Health check
 */
async health(): Promise<{ status: string; message: string }> {
  try {
    const token = await this.getAccessToken();
    await $fetch(`${this.baseUrl}/v2/Rail/THSR/Station?$format=JSON&$top=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      status: 'healthy',
      message: 'TDX API connection successful',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `TDX API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
```

**Key Code Aspects:**
- Try-catch wrapper for error handling
- Returns structured result object (not raw data)
- Uses minimal request ($top=1) for performance
- Custom error message formatting
- Never throws (always returns status object)

**Key Points:**
- Health checks should catch errors gracefully
- Minimal response size (only 1 record) improves speed
- Error message includes instanceof check for type safety
- Structured response allows caller to decide action
- Could be used for CLI health diagnostics

---

## 🎯 Key Conventions

1. **Endpoint Method Naming**: `get<Resource>()` (e.g., `getStations()`, `getFares()`)
   - Consistent naming for all endpoint methods
   - Uses action verb "get" (retrieval-only, stateless)

2. **Authorization Pattern**:
   ```typescript
   const token = await this.getAccessToken();
   // ... use token in headers
   ```
   - Always retrieve token first (handles caching/refresh)
   - Pass via Bearer token in Authorization header

3. **OData Query Parameters**:
   - `$format=JSON` - Explicitly request JSON format
   - `$top=<number>` - Pagination limit (100-500 based on endpoint)
   - Pattern: `${baseUrl}/v2/Rail/THSR/<Endpoint>?$format=JSON&$top=<limit>`

4. **Type Safety**: Use TypeScript generics for response types
   - `$fetch<THSRStation[]>(url, options)`
   - Import types from `src/types/api.ts`
   - Enables IDE autocomplete and compile-time checking

5. **Headers Structure**:
   ```typescript
   headers: {
     Authorization: `Bearer ${token}`,
     Accept: 'application/json',
   }
   ```
   - Both Authorization and Accept headers required
   - Bearer token format: `Bearer <token_value>`

6. **Error Handling**: Propagate errors to caller (resolvers handle)
   - Don't catch errors in data fetch methods
   - Let caller decide error handling strategy
   - Exception: health check wraps in try-catch for resilience

7. **Response Transformation**: Keep transformations minimal
   - API response usually matches domain types
   - Only transform when necessary (data cleanup)
   - Let resolvers handle business logic

---

## 🔐 OAuth2 Token Management Pattern

### Token Caching Strategy
```typescript
// src/services/api.ts (32-54 lines)

private accessToken: string | null = null;
private tokenExpiresAt: number | null = null;

async getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
    return this.accessToken;
  }

  // Fetch new token
  const response = await $fetch<TokenResponse>(this.authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    }).toString(),
  });

  // Cache with 1-minute early refresh buffer
  this.accessToken = response.access_token;
  this.tokenExpiresAt = Date.now() + response.expires_in * 1000 - 60000;

  return this.accessToken;
}
```

**Key Points**:
- Tokens cached in memory to avoid repeated auth requests
- Early refresh (60 seconds before expiry) prevents token-expired errors
- Grant type: `client_credentials` (service-to-service authentication)
- URLSearchParams used for form-encoded body

---

## 🧪 Testing Pattern

**Location**: `tests/fixtures/` directory

**Test Setup**:
```typescript
// Mock API responses
// tests/fixtures/thsr-stations.json - Real TDX API response
// tests/fixtures/thsr-fares.json - Real TDX API response

import { server } from './setup.js'; // MSW server setup
import { TDXApiClient } from '../src/services/api.js';

describe('TDXApiClient', () => {
  it('should fetch stations', async () => {
    const client = new TDXApiClient('test-id', 'test-secret');
    const stations = await client.getStations();
    expect(stations).toHaveLength(12);
  });
});
```

**Key Points**:
- Use Mock Service Worker (MSW) for API mocking
- Real API responses stored in fixture files
- Test API layer separately from resolvers
- No actual network calls during tests

---

## ⚠️ Common Pitfalls to Avoid

1. **Hardcoding endpoints**
   - ❌ Don't: `const url = 'https://tdx.transportdata.tw/api/basic/v2/Rail/...'`
   - ✅ Do: Use `${this.baseUrl}/v2/Rail/THSR/...` with constant baseUrl

2. **Missing OData parameters**
   - ❌ Don't: `getStations(): $fetch(`${this.baseUrl}/v2/Rail/THSR/Station`)`
   - ✅ Do: Include `?$format=JSON&$top=100` for proper pagination

3. **Inconsistent authorization**
   - ❌ Don't: Some methods send Bearer token, others don't
   - ✅ Do: All endpoints require Bearer token in Authorization header

4. **Not handling token expiry**
   - ❌ Don't: Cache token indefinitely
   - ✅ Do: Implement cache invalidation with early refresh buffer

5. **Mixing transformation logic**
   - ❌ Don't: Transform data in API client methods
   - ✅ Do: Let resolvers handle transformation, API client returns raw data

6. **Silent error suppression**
   - ❌ Don't: `try { await $fetch(...) } catch (e) { return null }`
   - ✅ Do: Let errors propagate (except in health checks)

7. **No response type hints**
   - ❌ Don't: `const response = await $fetch(url)`
   - ✅ Do: `const response = await $fetch<THSRStation[]>(url)`

---

## 📝 Step-by-Step Implementation Guide

### Adding a New API Endpoint

#### Step 1: Define Response Type
```typescript
// File: src/types/api.ts

export interface THSRNewData {
  id: string;
  name: string;
  description?: string;
}
```

#### Step 2: Add Endpoint Method
```typescript
// File: src/services/api.ts (add to TDXApiClient class)

/**
 * Fetch new data
 */
async getNewData(): Promise<THSRNewData[]> {
  const token = await this.getAccessToken();
  const response = await $fetch<THSRNewData[]>(
    `${this.baseUrl}/v2/Rail/THSR/NewData?$format=JSON&$top=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  );

  return response;
}
```

#### Step 3: Estimate Appropriate $top Value
```typescript
// Research expected result count:
// - Stations: 12 items → $top=100 (safe buffer)
// - Fares: ~100 items → $top=500 (safe buffer)
// - NewData: ? items → $top=<appropriate>
```

#### Step 4: Create Resolver Class
```typescript
// File: src/lib/new-resolver.ts

export class NewResolver {
  constructor(private apiClient: TDXApiClient) {}

  async getAllNewData(): Promise<THSRNewData[]> {
    const data = await this.apiClient.getNewData();
    // Optional: transform/filter data here
    return data;
  }

  async searchNewData(query: string): Promise<THSRNewData[]> {
    const data = await this.apiClient.getNewData();
    return data.filter(item =>
      item.name.toLowerCase().includes(query.toLowerCase())
    );
  }
}
```

#### Step 5: Create CLI Command
```typescript
// File: src/commands/new-command.ts

const newResolver = new NewResolver(
  new TDXApiClient(clientId, clientSecret)
);

const newCommand = new Command('new')
  .description('Fetch new data')
  .action(async () => {
    try {
      const data = await newResolver.getAllNewData();
      // Display data
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });
```

#### Step 6: Register and Test
```typescript
// File: src/cli.ts
cli.addCommand(newCommand);

// tests/new-resolver.test.ts
describe('NewResolver', () => {
  it('should fetch new data', async () => {
    const resolver = new NewResolver(mockApiClient);
    const data = await resolver.getAllNewData();
    expect(data).toBeDefined();
  });
});
```

---

## 🔗 Related Patterns

1. **OAuth2 Token Management** - Token caching with early refresh
2. **Service Layer Pattern** - Centralized API client abstraction
3. **Type-Safe Fetching** - Generic types for $fetch responses
4. **Resolver Pattern** - Business logic layer using API client
5. **MSW Mocking** - Testing without real API calls

---

## 📊 Current Endpoint Coverage

| Endpoint | Method | Path | Status |
|----------|--------|------|--------|
| Stations | getStations() | /v2/Rail/THSR/Station | ✅ Implemented |
| Fares | getFares() | /v2/Rail/THSR/ODFare | ✅ Implemented |
| Health | health() | /v2/Rail/THSR/Station (check) | ✅ Implemented |
| Schedule | ⏳ getSchedule() | /v2/Rail/THSR/Schedule | ❌ Pending |
| TrainStatus | ⏳ getTrainStatus() | /v2/Rail/THSR/TrainStatus | ❌ Pending |
| Delay | ⏳ getDelay() | /v2/Rail/THSR/Delay | ❌ Pending |
| Operator | ⏳ getOperators() | /v2/Rail/Operator | ❌ Pending |

---

## ✅ Verification Results

**Files Analyzed**: 2
- `src/services/api.ts` (115 lines, 3 methods)
- `src/types/api.ts` (type definitions)

**Endpoints Implemented**: 3
- `getStations()` - Station information
- `getFares()` - Fare pricing data
- `health()` - API connectivity check

**OAuth2 Features**: 1
- Token caching with 60-second early refresh buffer
- Client credentials grant type
- Automatic token refresh on expiry

**HTTP Headers**: 2 standard patterns
- Authorization: Bearer <token>
- Accept: application/json

**OData Parameters**: 2
- $format=JSON
- $top=<limit>

---

═════════════════════════════════════════════════════════════════════════════
🗺️ v2.10.1 │ Constitution v1.1 │ API Endpoint Pattern Analysis

💾 Saved: `.sourceatlas/patterns/api-endpoint.md`
✅ Ready for: Adding new API endpoints (Phase 2-4)
═════════════════════════════════════════════════════════════════════════════
