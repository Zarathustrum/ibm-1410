// Downloads the four cube1us/1410 oracle fixtures into a gitignored
// oracles/ directory, verifying each against a pinned sha256. See
// docs/plans/phase-1-cpu-core.md §6.1 and architecture.md §10 — images are
// GPL-3.0 upstream and are fetched, never vendored.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'cube1us/1410';
const COMMIT = '6f6c8bb5d6b1bc360275541bd5f6feb229a8fa83'; // master as of 2026-08-08

interface OracleFile {
  path: string;
  sha256: string;
}

const FILES: OracleFile[] = [
  { path: 'Core/cc01.cor', sha256: 'f5547da93e067636330a6f2f74de257025bb20f88fd53dfe51fcfb14bdfc5e97' },
  { path: 'Core/insttest.cor', sha256: 'a0cf8c89806f11bfa53774160061cce4d4dbe55b092a7ecb7dfacbd580f00e8d' },
  { path: 'Core/ilentest.cor', sha256: '1b8795241744c77ae42b05dc28a0ef923faed625d5fe1a19f1826a3ffd2b84b4' },
  { path: 'note1410.txt', sha256: '091867bbd3d75f0c31a098c6263172cd0a2c33b0489fa4029fc34c09253c43bc' }
];

// Compiled to build/tools/fetch-oracles.js (tsconfig.tools.json: rootDir
// ".", outDir "build"), so the repo root is two levels above this file.
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const ORACLES_DIR = join(REPO_ROOT, 'oracles');

function sha256(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

function basename(p: string): string {
  const parts = p.split('/');
  return parts[parts.length - 1] ?? p;
}

async function fetchOne(file: OracleFile): Promise<'downloaded' | 'skipped'> {
  const name = basename(file.path);
  const dest = join(ORACLES_DIR, name);

  if (existsSync(dest)) {
    const existing = sha256(readFileSync(dest));
    if (existing === file.sha256) return 'skipped';
  }

  const url = `https://raw.githubusercontent.com/${REPO}/${COMMIT}/${file.path}`;
  let bytes: Uint8Array;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`ORACLES UNAVAILABLE: ${name}: HTTP ${res.status} — oracle tiers will be skipped`);
      process.exit(0);
    }
    bytes = new Uint8Array(await res.arrayBuffer());
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.log(`ORACLES UNAVAILABLE: ${name}: ${reason} — oracle tiers will be skipped`);
    process.exit(0);
  }

  const got = sha256(bytes);
  if (got !== file.sha256) {
    if (existsSync(dest)) unlinkSync(dest);
    console.log(`ORACLE CHECKSUM MISMATCH: ${name}, expected ${file.sha256}, got ${got}`);
    process.exit(1);
  }

  if (!existsSync(ORACLES_DIR)) mkdirSync(ORACLES_DIR, { recursive: true });
  writeFileSync(dest, bytes);
  return 'downloaded';
}

async function main(): Promise<void> {
  for (const file of FILES) {
    await fetchOne(file);
  }
  const shortSha = COMMIT.slice(0, 7);
  console.log(`oracles: ${FILES.length} present (${REPO} @ ${shortSha})`);
}

void main();
