// Tier 2 — the PERIOD PAGE's own state and the two rules that keep the page honest:
// `PeriodViewState`'s transitions (plan §4.10), CONSTRAINT 11 made mechanical in node (§9.4,
// §11 wave 5 oracle (a), §13 criterion 15), and THE CSS LINT of §10.3 (§11 wave 5 oracle (e)).
//
// WHICH MACHINE: none of the three parts is a hardware claim, and §4.10 says why in one line —
// NOTHING in `PeriodViewState` is machine state. `reading` is the chain the PAGE and the LISTING
// are READ through and never the chain the 1403 printed with (plan §5.3), so flipping it changes
// what is drawn and never what was printed; every machine read on the period surface is
// `machine.snapshot()`. The one hardware fact this file leans on is the IBM 1403's two print
// chains, A and H (`src/core/devices/printer1403.ts:47`, charset.md §5) — and it leans on the TYPE,
// not on a claim of its own.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · IT CONSTRUCTS NO VIEW AND MOUNTS NOTHING. `environment: 'node'` (vite.config.ts:8-11) and plan
//    §2.2 refuses jsdom. `period/session.ts` and the two authoring sessions are DOM-free by
//    construction (`test/period-is-dom-free.test.ts`'s required-path list), and `period/desk.ts` is
//    imported for FOUR EXPORTED BOOLEANS only — it builds no node at import time, so the import is
//    a read of four §15 rulings and not a mount.
//  · IT DOES NOT PARSE CSS. The lint below reads `src/ui/styles/period.css` AS TEXT, brace by
//    brace: it judges what a rule's selector STARTS WITH and whether a declaration block carries a
//    pixel width, and nothing else. Colour, spacing, the two paper textures and every custom
//    property are wave 5's to choose and no test's to approve.
//  · IT COUNTS NOTHING ITSELF. `form` and `card` clamp against bounds the CALLER passes — the form
//    stack is `paginate`'s to count (`period/paper/page.ts`) and the card faces the 1402's — so the
//    bounds in this file are fixtures, not facts.
//  · It asserts nothing about `index.html`; the class inventory across both files is
//    `test/period-css-covers-every-class.test.ts`'s.
//  · IT SHARES NO HELPER. The brace walker below is this file's own, as the comment strippers in
//    the wave's three tier-0 files are theirs, ON PURPOSE: Phase 4 adds no shared test-support
//    module (§3's file tables list none), and a fourth production-shaped module that four gates
//    depend on is a worse trade than short copies that can drift apart safely.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { createAutocoderSession } from '../src/ui/period/autocoder/session.js';
import {
  DESK_IS_LIGHT_LAMINATE_ON_CHARCOAL_PEDESTALS, NO_UNIT_DIMENSION_IS_DRAWN_OR_LABELLED,
  NO_WEBFONT, SOUND_IS_OUT,
} from '../src/ui/period/desk.js';
import { createRpgSession } from '../src/ui/period/rpg/session.js';
import {
  INITIAL_VIEW_STATE, reduce, type PeriodViewState,
} from '../src/ui/period/session.js';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BOUNDS = { forms: 3, cards: 4 } as const;

// ═══ (a) `PeriodViewState` AND ITS TRANSITIONS (plan §4.10) ══════════════════════════════════════

describe('PeriodViewState transitions (plan §4.10, §5.3)', () => {
  it('starts at §4.10\'s literal: MACHINE ROOM, green bar, chain A, ruler on, form 1, card 0', () => {
    // MACHINE ROOM is the default because §1's storyboard opens at the desk and not at the panel;
    // form is 1 and not 0 because `paginate` numbers forms the way an operator counts sheets.
    expect(INITIAL_VIEW_STATE)
      .toEqual({ tab: 'machine', bars: true, reading: 'A', ruler: true, form: 1, card: 0 });
  });

  it('toggles bars and ruler, and each toggle returns a NEW object because it always changed', () => {
    const barsOff = reduce(INITIAL_VIEW_STATE, { kind: 'bars' }, BOUNDS);
    expect(barsOff.bars).toBe(false);
    expect(barsOff).not.toBe(INITIAL_VIEW_STATE);
    expect(reduce(barsOff, { kind: 'bars' }, BOUNDS).bars).toBe(true);

    const rulerOff = reduce(INITIAL_VIEW_STATE, { kind: 'ruler' }, BOUNDS);
    expect(rulerOff.ruler).toBe(false);
    expect(reduce(rulerOff, { kind: 'ruler' }, BOUNDS).ruler).toBe(true);
  });

  it('flips `reading` A↔H and touches nothing else — a VIEW field, never a machine one (§5.3)', () => {
    const h = reduce(INITIAL_VIEW_STATE, { kind: 'chain' }, BOUNDS);
    expect(h.reading).toBe('H');
    expect(reduce(h, { kind: 'chain' }, BOUNDS).reading).toBe('A');
    expect({ ...h, reading: 'A' }).toEqual(INITIAL_VIEW_STATE);
  });

  it('sets `tab`, and returns THE SAME OBJECT for the tab already selected', () => {
    const internals = reduce(INITIAL_VIEW_STATE, { kind: 'tab', tab: 'internals' }, BOUNDS);
    expect(internals.tab).toBe('internals');
    expect(reduce(internals, { kind: 'tab', tab: 'internals' }, BOUNDS)).toBe(internals);
    expect(reduce(INITIAL_VIEW_STATE, { kind: 'tab', tab: 'machine' }, BOUNDS))
      .toBe(INITIAL_VIEW_STATE);
  });

  it('clamps `form` into [1, bounds.forms] — 1-BASED, because a form stack starts at sheet one', () => {
    const at = (form: number): number => reduce(INITIAL_VIEW_STATE, { kind: 'form', form }, BOUNDS)
      .form;
    expect([at(0), at(1), at(2), at(3), at(9), at(-7)]).toEqual([1, 1, 2, 3, 3, 1]);
  });

  it('clamps `card` into [0, bounds.cards - 1] — 0-BASED, because it is an INDEX of a face', () => {
    const at = (card: number): number => reduce(INITIAL_VIEW_STATE, { kind: 'card', card }, BOUNDS)
      .card;
    expect([at(-1), at(0), at(3), at(4), at(99)]).toEqual([0, 0, 3, 3, 3]);
  });

  it('returns THE SAME OBJECT when a clamp lands on the value already held (§10.2\'s diff)', () => {
    // The point of the identity: `period/mount.ts`'s joined-key diff sees no change and touches no
    // DOM. `toBe`, not `toEqual` — an equal-but-new object would repaint the form every keypress.
    expect(reduce(INITIAL_VIEW_STATE, { kind: 'form', form: 1 }, BOUNDS)).toBe(INITIAL_VIEW_STATE);
    expect(reduce(INITIAL_VIEW_STATE, { kind: 'form', form: 0 }, BOUNDS)).toBe(INITIAL_VIEW_STATE);
    expect(reduce(INITIAL_VIEW_STATE, { kind: 'card', card: 0 }, BOUNDS)).toBe(INITIAL_VIEW_STATE);
    expect(reduce(INITIAL_VIEW_STATE, { kind: 'card', card: -5 }, BOUNDS)).toBe(INITIAL_VIEW_STATE);
  });

  it('pins an EMPTY stack and an EMPTY hopper at 1 and 0 rather than at 0 and -1', () => {
    // `session.ts:79, :83` guards both tops with `Math.max`. §4.10's prose says only "clamp against
    // bounds the caller passes"; the guard is the implementation's, and it is the right one — a
    // page with nothing printed yet still shows "form 1 of 0" rather than form 0.
    const empty = { forms: 0, cards: 0 } as const;
    expect(reduce(INITIAL_VIEW_STATE, { kind: 'form', form: 9 }, empty).form).toBe(1);
    expect(reduce(INITIAL_VIEW_STATE, { kind: 'card', card: 9 }, empty).card).toBe(0);
  });

  it('is PURE: no action mutates the state it was handed', () => {
    const before: PeriodViewState = { ...INITIAL_VIEW_STATE };
    for (const action of [{ kind: 'bars' }, { kind: 'ruler' }, { kind: 'chain' },
      { kind: 'tab', tab: 'internals' }, { kind: 'form', form: 3 },
      { kind: 'card', card: 2 }] as const) {
      reduce(INITIAL_VIEW_STATE, action, BOUNDS);
    }
    expect(INITIAL_VIEW_STATE).toEqual(before);
  });
});

// ═══ (b) CONSTRAINT 11, IN NODE (plan §9.4, §13 criterion 15) ════════════════════════════════════

describe('constraint 11: an edited sheet never punches the last deck (plan §9.4)', () => {
  const SOURCE = readFileSync(join(REPO_ROOT, 'demos/hello-dad.asm'), 'utf8');

  it('assembles, punches a hopper, and is NOT stale — the state the next case falsifies', () => {
    // Without this case "setSource leaves hopperText() empty" is vacuously true of a fresh session
    // and asserts nothing at all, which is exactly the defect §9.4 records.
    const session = createAutocoderSession();
    session.setSource(SOURCE);
    expect(session.assemble().ok).toBe(true);
    expect(session.stale).toBe(false);
    expect(session.hopperText().length).toBeGreaterThan(0);
  });

  it('goes stale on a ONE-CHARACTER setSource and empties the hopper (criterion 15)', () => {
    const session = createAutocoderSession();
    session.setSource(SOURCE);
    session.assemble();
    const punched = session.hopperText();

    session.setSource(`${SOURCE} `);                       // one character, and it is a space
    expect(session.stale).toBe(true);
    expect(session.hopperText()).toBe('');
    // The LISTING and the object deck stay readable beside the edited source (`session.ts:54-57`);
    // it is `stale` alone that stops the stale deck reaching the hopper.
    expect(session.result).not.toBeUndefined();

    session.assemble();
    expect(session.stale).toBe(false);
    expect(session.hopperText()).toBe(punched);
  });

  it('goes stale on setDataText too — the data cards ride behind the object deck', () => {
    const session = createAutocoderSession();
    session.setSource(SOURCE);
    session.assemble();
    expect(session.hopperText().length).toBeGreaterThan(0);

    session.setDataText('0001');
    expect(session.stale).toBe(true);
    expect(session.hopperText()).toBe('');
  });

  it('empties the RPG hand-off on setSpecText (rpg/session.ts:31, :37-40, :49-53)', () => {
    const rpg = createRpgSession();
    rpg.setSpecText(readFileSync(join(REPO_ROOT, 'demos/card-list.rpg'), 'utf8'));
    expect(rpg.generate().ok).toBe(true);
    expect(rpg.handOff().source.length).toBeGreaterThan(0);

    rpg.setSpecText(' ');
    expect(rpg.result).toBeUndefined();
    expect(rpg.handOff()).toEqual({ source: '', dataCards: '' });
  });
});

// ═══ (c) THE CSS LINT (plan §10.3, §11 wave 5 oracle (e)) ════════════════════════════════════════

const CSS_PATH = 'src/ui/styles/period.css';
const CSS = readFileSync(join(REPO_ROOT, CSS_PATH), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');

interface Rule { readonly selectors: readonly string[]; readonly body: string; }

/**
 * Every style rule in the file, brace by brace. At-rule preludes (`@media`, `@supports`) are NOT
 * selectors and their nested rules ARE; a `@keyframes` block's `from` / `50%` preludes are not
 * selectors either and are skipped with the whole at-rule.
 */
function rules(css: string): readonly Rule[] {
  const found: Rule[] = [];
  const stack: string[] = [];
  let prelude = '';
  let i = 0;
  while (i < css.length) {
    const ch = css[i] ?? '';
    if (ch === '{') {
      const head = prelude.trim();
      const inKeyframes = stack.some((s) => /^@(-\w+-)?keyframes\b/.test(s));
      if (!head.startsWith('@') && !inKeyframes) {
        const close = closeOf(css, i);
        found.push({
          selectors: head.split(',').map((s) => s.trim()).filter((s) => s !== ''),
          body: css.slice(i + 1, close),
        });
      }
      stack.push(head);
      prelude = '';
    } else if (ch === '}') {
      stack.pop();
      prelude = '';
    } else prelude += ch;
    i += 1;
  }
  return found;
}

/** The index of the `}` matching the `{` at `open`. */
function closeOf(css: string, open: number): number {
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') { depth -= 1; if (depth === 0) return i; }
  }
  return css.length;
}

const RULES = rules(CSS);
/** The rules that draw a printed form or a card face — the two things whose width is a NUMBER. */
const PAPER = /green-bar|card-face|period-form|period-card/;
const PIXEL_WIDTH = /(?:^|[\s;{])(?:min-|max-)?width\s*:[^;}]*\d\s*px/;

describe('the period stylesheet lint (plan §10.3, §11 wave 5 oracle (e))', () => {
  it('fetches nothing: no @import, no @font-face and no url(http (NO_WEBFONT, §10.4)', () => {
    // The settled deliverable is a STATIC LOCAL page (DECISIONS.md 2026-08-30); a downloaded face
    // or a remote image is a second network request on it. `desk.ts`'s OPEN block carries the
    // fallback: if a platform lacks `⌑` or `‡`, those two are drawn as SVG paths and not fetched.
    expect(NO_WEBFONT).toBe(true);
    expect(CSS).not.toContain('@import');
    expect(CSS).not.toContain('@font-face');
    // A REGEX, not `toContain('url(http')`: the substring reads only the bare form, so
    // `url("https://…/x.png")` — the shape a copied rule actually arrives in — walked straight
    // past it. Optional whitespace and either quote character are all fetches too.
    expect(CSS).not.toMatch(/url\(\s*['"]?http/);
  });

  it('writes NO PIXEL WIDTH on a form or a card selector — those numbers live in TS', () => {
    // The form is 132 characters wide and the card face is a `viewBox`; both are computed in
    // DOM-free modules under `period/paper/` with tests (plan §0 bullet 1, §10.3). A pixel width
    // here would be the one number that matters in the file that must carry none.
    expect(NO_UNIT_DIMENSION_IS_DRAWN_OR_LABELLED).toBe(true);
    const offenders = RULES
      .filter((r) => r.selectors.some((s) => PAPER.test(s)) && PIXEL_WIDTH.test(r.body))
      .map((r) => `${r.selectors.join(', ')} { … ${r.body.trim().slice(0, 60)} … }`);
    expect(offenders).toEqual([]);
  });

  it('scopes EVERY selector under #machine-room or .period- — no bare element selector', () => {
    // This is what keeps `index.html`'s `#internals` block from being restyled by the period
    // surface, and the two surfaces "visually foreign to each other on purpose" (architecture.md
    // §6, plan §10.3, critic item 6). `#machine-room pre` is scoped; a bare `pre` is not.
    const bare = RULES
      .flatMap((r) => r.selectors)
      .filter((s) => !s.startsWith('#machine-room') && !s.startsWith('.period-'));
    expect(bare).toEqual([]);
  });

  it('never styles `body` — the one selector that cannot be scoped stays in index.html', () => {
    expect(RULES.flatMap((r) => r.selectors).filter((s) => /(^|[\s>+~])body\b/.test(s)))
      .toEqual([]);
  });

  it('parses the file at all, so the four absence cases cannot pass vacuously', () => {
    // The real stylesheet first: an unparsed file yields no rules and every case above passes on
    // nothing. Then the parser itself, on a seed carrying all three shapes it must tell apart.
    expect(RULES.length).toBeGreaterThan(20);
    expect(RULES.filter((r) => r.selectors.some((s) => PAPER.test(s))).length).toBeGreaterThan(0);

    const seeded = '@media (max-width: 40em) { #machine-room .period-form { width: 12px } }\n'
      + '@keyframes blink { from { opacity: 0 } }\n'
      + 'pre { margin: 0 }\n';
    const seen = rules(seeded);
    expect(seen.map((r) => r.selectors)).toEqual([['#machine-room .period-form'], ['pre']]);
    expect(PIXEL_WIDTH.test(seen[0]?.body ?? '')).toBe(true);
  });

  it('pins the four §15 rulings the desk and the stylesheet share, by name', () => {
    // Read as VALUES rather than as strings in the file: `desk.ts` builds no node at import time,
    // so a node test may import it (plan §12.1 T0's reason for the alternative).
    expect([DESK_IS_LIGHT_LAMINATE_ON_CHARCOAL_PEDESTALS, NO_UNIT_DIMENSION_IS_DRAWN_OR_LABELLED,
      NO_WEBFONT, SOUND_IS_OUT]).toEqual([true, true, true, true]);
  });
});
