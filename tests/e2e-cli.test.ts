/**
 * True E2E tests — spawn the actual CLI as a subprocess via tsx.
 *
 * Unlike the parseAsync tests, these exercise:
 *   - src/index.ts entry (dotenv load, argv handoff)
 *   - cli.ts wiring across all 13 commands
 *   - real stdout/stderr separation
 *   - real exit codes
 *   - commander's --help, --version, unknown-command paths
 *   - dotenv pickup from a sibling project's .env (for the `health` command)
 *
 * Each subprocess takes ~0.5–1.5s due to tsx startup, so this file is kept
 * lean and the per-test timeout is generous.
 */

import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const CLI_ENTRY = resolve(__dirname, '../src/index.ts');
const SHARED_ENV = '/Users/justinlee/dev/tdx-rail-tra-cli/.env';

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

function runCli(args: string[], opts: { envFile?: string; timeoutMs?: number } = {}): Promise<CliResult> {
  return new Promise((resolveResult, reject) => {
    const env = { ...process.env };
    if (opts.envFile && existsSync(opts.envFile)) {
      // tsx + dotenv handles its own .env load via DOTENV_CONFIG_PATH or implicit cwd .env;
      // simplest reliable path: read+inject env vars into the child's env.
      // We avoid pulling in dotenv at the test level by deferring to a tiny inline parse.
      const content = require('node:fs').readFileSync(opts.envFile, 'utf-8') as string;
      for (const line of content.split('\n')) {
        const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const value = m[2].replace(/^["']|["']$/g, '');
        env[m[1]] = value;
      }
    }

    const child = spawn('npx', ['tsx', CLI_ENTRY, ...args], {
      env,
      cwd: resolve(__dirname, '..'),
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`CLI timed out after ${opts.timeoutMs ?? 15000}ms: ${args.join(' ')}`));
    }, opts.timeoutMs ?? 15000);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolveResult({ stdout, stderr, exitCode: code });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

const PER_TEST_TIMEOUT = 30_000;

describe('E2E CLI subprocess', () => {
  // ─── meta commands ───────────────────────────────────────────
  describe('meta', () => {
    it('--version prints package version', async () => {
      const { stdout, exitCode } = await runCli(['--version']);
      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/\d+\.\d+\.\d+/);
    }, PER_TEST_TIMEOUT);

    it('--help prints usage including all commands', async () => {
      const { stdout, exitCode } = await runCli(['--help']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('thsr');
      // Should list at least a few command names
      expect(stdout).toMatch(/stations|fare|schedule/);
    }, PER_TEST_TIMEOUT);

    it('unknown command exits non-zero with error on stderr', async () => {
      const { stderr, exitCode } = await runCli(['definitely-not-a-command']);
      expect(exitCode).not.toBe(0);
      expect(stderr.length).toBeGreaterThan(0);
    }, PER_TEST_TIMEOUT);
  });

  // ─── happy paths for every command ───────────────────────────
  describe('happy paths', () => {
    it('stations lists all stations', async () => {
      const { stdout, exitCode } = await runCli(['stations']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('高鐵車站列表');
      expect(stdout).toContain('南港');
      expect(stdout).toContain('左營');
    }, PER_TEST_TIMEOUT);

    it('stations search 台北', async () => {
      const { stdout, exitCode } = await runCli(['stations', 'search', '台北']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('台北');
    }, PER_TEST_TIMEOUT);

    it('stations info 南港', async () => {
      const { stdout, exitCode } = await runCli(['stations', 'info', '南港']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('南港');
      expect(stdout).toContain('NAK');
    }, PER_TEST_TIMEOUT);

    it('fare 南港 台北', async () => {
      const { stdout, exitCode } = await runCli(['fare', '南港', '台北']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('票價查詢');
      expect(stdout).toContain('NT$');
    }, PER_TEST_TIMEOUT);

    it('schedule (default lists dates and trains)', async () => {
      const { stdout, exitCode } = await runCli(['schedule']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('高鐵時刻表查詢');
    }, PER_TEST_TIMEOUT);

    it('schedule train 601', async () => {
      const { stdout, exitCode } = await runCli(['schedule', 'train', '601', '--date', '2025-12-31']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('601');
    }, PER_TEST_TIMEOUT);

    it('journey-plan 南港 左營', async () => {
      const { stdout, exitCode } = await runCli(['journey-plan', '南港', '左營', '--date', '2025-12-31']);
      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/最優行程規劃|找不到從/);
    }, PER_TEST_TIMEOUT);

    it('seat-availability default', async () => {
      const { stdout, exitCode } = await runCli(['seat-availability']);
      expect(exitCode).toBe(0);
      // Without TDX creds the command shows the explicit no-data notice;
      // with creds it'll usually be empty too since THSR rarely publishes.
      expect(stdout).toMatch(/TDX 無高鐵座位狀態公告|高鐵座位狀態/);
    }, PER_TEST_TIMEOUT);

    it('news default', async () => {
      const { stdout, exitCode } = await runCli(['news']);
      expect(exitCode).toBe(0);
      // Empty without creds; non-empty hits live endpoint when CI runs them.
      expect(stdout).toMatch(/目前沒有可顯示的高鐵消息|高鐵最新消息/);
    }, PER_TEST_TIMEOUT);

    it('alerts default', async () => {
      const { stdout, exitCode } = await runCli(['alerts']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('高鐵警報公告');
    }, PER_TEST_TIMEOUT);

    it('transfers 南港 台中', async () => {
      const { stdout, exitCode } = await runCli(['transfers', '南港', '台中', '--date', '2025-12-31']);
      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/轉運選項|找不到從/);
    }, PER_TEST_TIMEOUT);

  });

  // ─── live API: health hits real TDX with shared .env ─────────
  describe('health (live TDX API)', () => {
    const hasEnv = existsSync(SHARED_ENV);
    (hasEnv ? it : it.skip)(
      'health connects to TDX via sibling project .env',
      async () => {
        const { stdout, exitCode } = await runCli(['health'], { envFile: SHARED_ENV, timeoutMs: 30_000 });
        expect(exitCode).toBe(0);
        expect(stdout).toMatch(/TDX API connection successful|TDX API 運作正常/);
      },
      45_000,
    );

    it('health with no creds reports unhealthy and exits 1', async () => {
      // Strip TDX creds so the child sees an empty config.
      const env = { ...process.env };
      delete env.TDX_CLIENT_ID;
      delete env.TDX_CLIENT_SECRET;
      const child = spawn('npx', ['tsx', CLI_ENTRY, 'health'], {
        env,
        cwd: resolve(__dirname, '..'),
      });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (c) => { stdout += c.toString(); });
      child.stderr.on('data', (c) => { stderr += c.toString(); });
      const exitCode: number | null = await new Promise((res, rej) => {
        const t = setTimeout(() => { child.kill('SIGKILL'); rej(new Error('timeout')); }, 20_000);
        child.on('close', (code) => { clearTimeout(t); res(code); });
      });
      expect(exitCode).toBe(1);
      // Either the catch path message ("錯誤") or the unhealthy branch fires.
      expect(stdout + stderr).toMatch(/錯誤|Missing required environment|TDX/);
    }, PER_TEST_TIMEOUT);
  });

  // ─── --date plumbing across parent + subcommand ──────────────
  describe('--date inheritance', () => {
    // Subcommands no longer redeclare `--date`; they read parent's value via
    // optsWithGlobals(). This test guards against a regression where the
    // commander v12 same-name shadowing returns (parent eats the flag, child
    // silently uses its default).
    it('transfers best surfaces date validation error from a bad --date', async () => {
      const { stdout, exitCode } = await runCli([
        'transfers', 'best', '南港', '台中', '--date', 'not-a-date',
      ]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('日期格式錯誤');
    }, PER_TEST_TIMEOUT);

  });
});
