// The gate must not go green because the network was down.
//
// `tools/fetch-oracles.ts` prints ORACLES UNAVAILABLE and exits 0 on any download failure, so
// `npm test` still runs — and every tier that guards on `oraclePath()` quietly skips. That is
// the right behaviour for a developer offline and the wrong behaviour for a gate: tiers 2 and
// 3, which carry the only expected values this project has, would report nothing and pass.
// This test is the difference between "the oracles agreed" and "the oracles never ran".
import { describe, expect, it } from 'vitest';
import { oraclePath } from './oracles.js';

/** The four cube1us/1410 fixtures `npm run oracles` downloads. */
const REQUIRED = ['cc01.cor', 'insttest.cor', 'ilentest.cor', 'note1410.txt'] as const;

describe('oracle fixtures', () => {
  it('all four are in oracles/, so no tier skipped silently', () => {
    if (process.env['ALLOW_MISSING_ORACLES'] === '1') return;
    const missing = REQUIRED.filter((name) => oraclePath(name) === null);
    expect(
      missing,
      `oracles/ is missing ${missing.join(', ')} — run \`npm run oracles\` (it exits 0 when the ` +
        'download fails, which is how a green run can mean "every oracle tier skipped"). To run ' +
        'the suite without them anyway, set ALLOW_MISSING_ORACLES=1.'
    ).toEqual([]);
  });
});
