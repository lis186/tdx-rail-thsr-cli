/**
 * Build smoke tests — verify the published artifact (dist/index.js) actually
 * runs under plain Node. The other e2e tests use tsx, which silently rewrites
 * imports and would let us ship a broken build (already happened once: missing
 * .js suffixes in src caused `node dist/index.js` to crash even though all
 * source-level tests were green).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const DIST_ENTRY = resolve(ROOT, 'dist/index.js');

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

function runNode(args: string[], opts: { timeoutMs?: number } = {}): Promise<CliResult> {
  return new Promise((resolveResult, reject) => {
    const child = spawn('node', [DIST_ENTRY, ...args], { cwd: ROOT, env: process.env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => { stdout += c.toString(); });
    child.stderr.on('data', (c) => { stderr += c.toString(); });
    const t = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`timed out: ${args.join(' ')}`));
    }, opts.timeoutMs ?? 15_000);
    child.on('close', (code) => {
      clearTimeout(t);
      resolveResult({ stdout, stderr, exitCode: code });
    });
    child.on('error', (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}

function runBuild(): Promise<void> {
  return new Promise((resolveResult, reject) => {
    const child = spawn('npm', ['run', 'build'], { cwd: ROOT, env: process.env });
    let stderr = '';
    child.stderr.on('data', (c) => { stderr += c.toString(); });
    const t = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('build timed out'));
    }, 60_000);
    child.on('close', (code) => {
      clearTimeout(t);
      if (code === 0) resolveResult();
      else reject(new Error(`build failed (exit ${code}): ${stderr}`));
    });
    child.on('error', (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}

describe('Build smoke tests', () => {
  beforeAll(async () => {
    // Always rebuild — stale dist would mask the very class of bug this file
    // exists to catch.
    await runBuild();
    if (!existsSync(DIST_ENTRY)) {
      throw new Error('dist/index.js missing after build');
    }
  }, 90_000);

  it('dist/index.js exists and is a non-empty file', () => {
    const stats = statSync(DIST_ENTRY);
    expect(stats.isFile()).toBe(true);
    expect(stats.size).toBeGreaterThan(0);
  });

  it('node dist/index.js --version prints version', async () => {
    const { stdout, exitCode } = await runNode(['--version']);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  }, 20_000);

  it('node dist/index.js --help lists commands', async () => {
    const { stdout, exitCode } = await runNode(['--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('thsr');
    expect(stdout).toMatch(/stations|fare|schedule/);
  }, 20_000);

  it('node dist/index.js stations runs end-to-end', async () => {
    const { stdout, exitCode } = await runNode(['stations']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('高鐵車站列表');
    expect(stdout).toContain('南港');
  }, 20_000);

  it('node dist/index.js train-status train 601 runs', async () => {
    const { stdout, exitCode } = await runNode(['train-status', 'train', '601']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('601');
    expect(stdout).toContain('板橋');
  }, 20_000);
});
