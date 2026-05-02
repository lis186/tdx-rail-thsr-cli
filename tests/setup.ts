/**
 * Global test setup.
 *
 * Strip TDX credentials from the test process so commands fall back to
 * bundled fixtures deterministically. Tests that genuinely need live API
 * (e2e-cli "health (live TDX API)" and tests/contract-tdx.test.ts) load
 * the sibling project's .env explicitly inside their own setup.
 *
 * Without this, running `npm test` in a shell that has TDX_CLIENT_ID
 * exported would leak live API data into fixture-based assertions.
 */

import { beforeAll } from 'vitest';

beforeAll(() => {
  delete process.env.TDX_CLIENT_ID;
  delete process.env.TDX_CLIENT_SECRET;
});
