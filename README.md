# tdx-rail-thsr-cli

🚄 Taiwan High Speed Rail (THSR) CLI Tool powered by TDX API

A command-line interface for querying Taiwan High Speed Rail information including stations, fares, and route information. Built with TypeScript and tested with Vitest using actual TDX API responses.

[![Tests](https://img.shields.io/badge/tests-25%2F25%20passed-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-97.66%25%20(lib)-green)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict%20mode-blue)]()
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-green)]()

## ✨ Features

- **🔍 Station Information**: Query and search THSR stations with fuzzy matching
- **💰 Fare Lookup**: Get ticket prices with multiple cabin classes and ticket types
- **🛤️ Route Exploration**: Find all available routes to/from a station
- **🏥 API Health Check**: Verify TDX API connectivity and status
- **✅ Test-Driven Development**: Comprehensive test suite with 25 unit tests (97.66% coverage)
- **🌐 Multi-language Support**: Chinese, English names, and station codes
- **🔤 Fuzzy Matching**: Smart station name resolution using Levenshtein distance

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** or yarn
- **TDX API Credentials** (free from https://tdx.transportdata.tw/)

### Installation

1. **Clone and Install**

```bash
git clone <repository-url>
cd tdx-rail-thsr-cli
npm install
npm run build
```

2. **Configure API Credentials**

```bash
# Create .env file from template
cp .env.example .env

# Edit .env with your TDX credentials
# TDX_CLIENT_ID=your-client-id
# TDX_CLIENT_SECRET=your-client-secret
```

3. **Verify Installation**

```bash
# Test API connectivity
node dist/index.js health

# List all stations
node dist/index.js stations
```

### Get TDX API Credentials

1. Visit https://tdx.transportdata.tw/
2. Register an account (free)
3. Create an application to get Client ID and Secret
4. Add credentials to `.env` file

## 📖 Usage

### Global Options

All commands support these options:

```bash
-f, --format <format>   Output format: json (default) | table
-q, --quiet            Quiet mode (no extra info)
-v, --verbose          Verbose mode (debug info)
-h, --help             Show help for command
--version              Show version number
```

### Commands

#### 🔍 **Stations** - Query station information

```bash
# List all 12 THSR stations
node dist/index.js stations

# Search stations (supports Chinese, English, fuzzy matching)
node dist/index.js stations search 台北
node dist/index.js stations search taipei
node dist/index.js stations search TPE

# Search with table format
node dist/index.js stations search 台北 -f table
```

#### 💰 **Fare** - Query ticket prices

```bash
# Get fare between two stations (returns multiple prices)
node dist/index.js fare 台北 台中

# List all available routes (100 routes total)
node dist/index.js fare list

# Find routes from/to a specific station
node dist/index.js fare routes 台北

# Show routes going to Taipei
node dist/index.js fare routes 台北  # Shows both departure and arrival
```

#### 🏥 **Health** - Check API status

```bash
# Verify TDX API connectivity
node dist/index.js health
```

### Usage Examples

```bash
# Search for stations with English fuzzy matching
node dist/index.js stations search taichung

# Get fare with table output
node dist/index.js fare 新竹 台中 -f table

# Verbose mode for debugging
node dist/index.js stations search 高雄 -v

# Use in scripts (with quiet mode)
node dist/index.js health -q && echo "API is ready"
```

## 🔧 Development

### Scripts

```bash
# Testing
npm test                # Run all tests (25 tests)
npm run test:watch     # Watch mode - re-run on file change
npm run test:coverage  # Generate coverage report

# Building & Type Checking
npm run build          # Compile TypeScript to JavaScript
npm run typecheck      # Type checking without compilation
npm run lint           # Run ESLint (optional)

# Development
npm run dev -- <args>  # Run directly with tsx (supports hot reload)
```

### Test Results

Latest test run:
- ✅ **25/25 tests passed**
- ✅ **97.66% coverage** for business logic (lib/)
- ✅ **Zero type errors** with TypeScript strict mode
- ✅ Test execution time: ~2.9s

```bash
# View coverage report
npm run test:coverage
# Coverage by module:
# - StationResolver: 94.94%
# - FareResolver: 100%
# - station-resolver.test.ts: 100%
# - fare-resolver.test.ts: 100%
```

### Development Workflow

```bash
# 1. Start development server with watch mode
npm run dev -- stations

# 2. Run tests in watch mode
npm run test:watch

# 3. Type checking while developing
npm run typecheck

# 4. Build for production
npm run build

# 5. Test the production build
node dist/index.js health
```

## Project Structure

```
src/
├── commands/          # CLI commands
│   ├── stations.ts   # Station queries
│   ├── fare.ts       # Fare queries
│   └── health.ts     # Health check
├── lib/               # Business logic
│   ├── station-resolver.ts
│   └── fare-resolver.ts
├── services/          # External service integration
│   ├── api.ts        # TDX API client
│   └── config.ts     # Configuration management
├── data/              # Static data
│   ├── stations.ts   # Station data
│   └── fares.ts      # Fare data
├── types/             # TypeScript types
│   └── api.ts        # API type definitions
├── cli.ts            # CLI setup
└── index.ts          # Entry point

tests/
├── fixtures/          # Mock API response data
│   ├── thsr-stations.json
│   └── thsr-fares.json
├── station-resolver.test.ts
└── fare-resolver.test.ts
```

## 🧪 Testing Strategy

This project uses **Test-Driven Development (TDD)** with actual API response data:

### Test Approach

- **Test fixtures**: Real responses from TDX THSR API endpoints
- **Unit tests**: 25 tests covering core business logic
- **Mock Service Worker**: Intercepts API calls for reliable testing
- **Coverage**: 97.66% for `src/lib/` (business logic)

### What's Tested

✅ **Station Resolver** (13 tests, 94.94% coverage)
- Chinese name resolution (台北 → TPE)
- English name resolution (Taipei → TPE)
- Station code lookup (TPE → Taipei)
- Fuzzy matching with Levenshtein distance
- Search ranking and sorting

✅ **Fare Resolver** (12 tests, 100% coverage)
- Multiple cabin classes (Standard, Business, Unreserved)
- Multiple ticket types (Full price, Discounted)
- Standard fare detection (lowest price)
- Fare breakdown by category
- Route finding and filtering

### Running Tests

```bash
# All tests
npm test

# Watch mode (re-run on changes)
npm run test:watch

# With coverage
npm run test:coverage

# Specific test file
npm test -- station-resolver.test.ts
```

## THSR API Endpoints

The CLI uses the following TDX Rail THSR API endpoints:

- `GET /v2/Rail/THSR/Station` - Station information
- `GET /v2/Rail/THSR/ODFare` - Origin-Destination fares

## Available THSR Stations

1. 南港 (Nangang) - NAK
2. 台北 (Taipei) - TPE
3. 板橋 (Banqiao) - BAC
4. 桃園 (Taoyuan) - TAY
5. 新竹 (Hsinchu) - HSC
6. 苗栗 (Miaoli) - MIL
7. 台中 (Taichung) - TAC
8. 彰化 (Changhua) - CHA
9. 雲林 (Yunlin) - YUL
10. 嘉義 (Chiayi) - CHY
11. 台南 (Tainan) - TNN
12. 左營 (Zuoying) - ZUY

## Implementation Notes

### Station Resolution

The `StationResolver` supports multiple query formats:
- Chinese names: "台北", "台中"
- English names: "Taipei", "Taichung"
- Station codes: "TPE", "TAC"
- Fuzzy matching with Levenshtein distance

### Fare Parsing

The `FareResolver` handles:
- Multiple cabin classes (Standard, Business, Unreserved)
- Multiple ticket types (Full price, Discounted)
- Automatic standard fare detection (lowest price)
- Detailed fare breakdown by category

## Performance

- Fast station resolution using fuzzy matching algorithm
- In-memory caching of station and fare data
- Efficient route lookup using indexed maps
- OAuth token caching with automatic refresh

## Error Handling

- Graceful fallback when TDX API is unavailable
- Clear error messages for invalid queries
- Proper exit codes for scripting integration

## 🎯 Implementation Details

### Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Language** | TypeScript | 5.7.2 |
| **Runtime** | Node.js | >=20.0.0 |
| **CLI Framework** | Commander.js | 12.1.0 |
| **HTTP Client** | ofetch | 1.4.1 |
| **Testing** | Vitest | 2.1.8 |
| **Testing Mock** | Mock Service Worker | 2.7.0 |
| **Output** | cli-table3 | 0.6.5 |
| **Config** | conf (dotenv) | 13.0.1 |
| **Metrics** | prom-client | 15.1.3 |

### Architecture

```
CLI Layer (commands/)
    ↓
Business Logic Layer (lib/)
    ├─ StationResolver
    └─ FareResolver
    ↓
Service Layer (services/)
    ├─ TDX API Client
    └─ Config Manager
    ↓
Data Layer (data/)
    ├─ Stations (static)
    └─ Fares (static)
```

### Key Algorithms

- **Fuzzy Matching**: Levenshtein distance for station name resolution
- **Fare Parsing**: Parse multiple cabin classes and ticket types
- **Route Lookup**: Indexed maps for O(1) route finding

### Performance

- **Station Resolution**: O(n) with Levenshtein, indexed maps for O(1) fallback
- **Memory**: In-memory caching of all stations and fares (~50KB)
- **API Calls**: Cached OAuth tokens with automatic refresh
- **Startup**: ~50ms (after dependencies loaded)

## 📋 Future Enhancements

- [ ] Real-time train status and delays
- [ ] Journey planning with transfer suggestions
- [ ] Timetable queries and schedules
- [ ] Booking integration
- [ ] Additional languages (Japanese, Korean)
- [ ] Webhook/API server mode
- [ ] Persistent caching with Redis
- [ ] Docker image and deployment configs
- [ ] GraphQL API wrapper
- [ ] Performance metrics dashboard

## 🤝 Contributing

Contributions welcome! Please ensure:

```bash
# Tests pass
npm test

# Type checking passes
npm run typecheck

# Code formatted (optional)
npm run lint
```

### Commit Guidelines

- Use conventional commits: `feat:`, `fix:`, `refactor:`, etc.
- Write descriptive commit messages
- Include issue references if applicable

## 📄 License

MIT - See LICENSE file for details

## 🔗 References

- [TDX Open Data Platform](https://tdx.transportdata.tw/) - Taiwan transport data
- [TDX API Documentation](https://tdx.transportdata.tw/api-service) - API specifications
- [Taiwan High Speed Rail](https://www.thsrc.com.tw/) - Official THSR website
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Vitest](https://vitest.dev/) - Unit testing framework

## 📞 Support

- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Ask questions on GitHub Discussions
- **Documentation**: Check README and code comments

---

**Made with ❤️ for Taiwan High Speed Rail enthusiasts**
