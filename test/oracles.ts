// Helper for tests, not itself a test. Tiers that need the fetched oracle
// fixtures gate on oraclePath() and log ORACLES_ABSENT_MESSAGE when skipped:
//   describe.skipIf(!oraclePath('cc01.cor'))(...)
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// This file lives at <repo>/test/oracles.ts.
const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ORACLES_DIR = join(REPO_ROOT, 'oracles');

export function oraclePath(name: string): string | null {
  const full = join(ORACLES_DIR, name);
  return existsSync(full) ? full : null;
}

export const ORACLES_ABSENT_MESSAGE =
  'oracles/ absent — run `npm run oracles`; tier skipped';
