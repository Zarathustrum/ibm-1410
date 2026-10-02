// src/core/decode.ts — read-out: scan to the next word mark, classify the form, load the
// address registers.
// Source: docs/plans/phase-1-cpu-core.md §4.1; docs/plans/architecture.md §4.4.
//
// Nothing here executes anything. Everything here is what the 1411 does between sensing the
// word mark over an op code and the start of the E phase: the I-ring read-out, the
// length-validity check, address decoding with indexing, the address-double rule, the D
// cycle, and the two op-modifier traps. `cpu.ts` calls these four functions in order and
// adds nothing to them.

import { checkAddress, decodeAddress, resolveIndex } from './address.js';
import { BLANK } from './bcd.js';
import { InstructionCheck } from './checks.js';
import { BLANK_WITH_C } from './registers.js';
import {
  BCD6,
  type Addr, type Cell, type Fetched, type Form, type OpEntry, type OpForm,
  type Registers, type Storage,
} from './types.js';

/**
 * Read-out. Starts at the op code, which must carry a word mark, and continues character by
 * character until a word mark is sensed — that word mark belongs to the NEXT instruction's op
 * code, and this instruction must contain no interior word marks
 * (research/architecture.md §7, A22-0526-3 p.11).
 *
 * The scan has NO length cap. `N` accepts any length (opcodes.md §2 N row: "any (1, 2, 3, …)")
 * and the tape bootstrap works precisely because a word-marked `N` at 00011 runs to the first
 * word mark inside the just-loaded record (software.md §10.4). Its only bound is the end of
 * installed storage, which raises an address check — that is what `checkAddress` is here for
 * (docs/plans/architecture.md §9 row C1).
 */
export function fetch(storage: Storage, iar: Addr): Fetched {
  const opAddr = iar;
  if (!storage.wm(opAddr)) throw new InstructionCheck('no word mark on op code', opAddr);

  const chars: number[] = [storage.read(opAddr)];
  let p = opAddr + 1;
  while (!storage.wm(checkAddress(storage, p, 'increment'))) {
    chars.push(storage.read(p));
    p++;
  }
  return { opAddr, chars: Uint8Array.from(chars), nsi: p };
}

/**
 * Which of the eight printed instruction formats this instruction is
 * (research/architecture.md §7 / opcodes.md §1.1, both A22-0526-3 p.11). Length alone decides,
 * because `selectForm` has already established that the length is one this op accepts.
 *
 * `Olong` is op `N`'s. `N` is the one row with a real `ANY_LENGTH` and it is percent-type
 * (opcodes.md §1.2), so no A-address is ever read into AAR/CAR at I-ring time and its §2
 * register row prints `NSI / Ap / Bp` — untouched at EVERY length. `Olong` is the one form
 * that assigns no fields, so `N` classifies there whatever its length; the plan's own form
 * table excepts `N` from form `O` for the same reason (plan §4.1, `O` row).
 */
export function classifyForm(entry: OpEntry, form: OpForm, length: number): Form {
  if (entry.opChar === 'N' && form.lengths.length === 0) return 'Olong';
  switch (length) {
    case 1: return 'O';
    case 2: return 'Od';
    case 5: return 'Oxxxd';
    case 6: return 'Oa';
    case 7: return 'Oad';
    case 10: return 'Oxxxbd';
    case 11: return 'Oab';
    case 12: return 'Oabd';
    default: return 'Olong';
  }
}

/**
 * True for a `dModifiers` column that admits the blank d-character and nothing else — a column
 * whose single key IS `' '`. `'none'` is a different statement ("this form has no d position at
 * all") and must NOT answer true here: it would make `pickForm` pick a no-d form for a blank
 * d-character. `'none'` falls through to `pickForm`'s `matches[0]`.
 */
function blankOnly(mods: OpForm['dModifiers']): boolean {
  if (typeof mods !== 'object') return false;
  const keys = Object.keys(mods);
  return keys.length === 1 && keys[0] === ' ';
}

/**
 * `J` prints TWO §2 rows and BOTH carry lengths `[1, 7]` (opcodes.md §2, A22-0526-3 p.36), so
 * `selectForm` — keyed on length alone — cannot separate them. The d-character does: blank is
 * Branch Unconditionally, anything else tests one indicator from the §6.1 table. No other op
 * has two forms that overlap on length, so every other call returns on the second line.
 */
export function pickForm(entry: OpEntry, length: number, d: Cell): OpForm | undefined {
  const matches = entry.forms.filter((f) => f.lengths.length === 0 || f.lengths.includes(length));
  if (matches.length < 2) return matches[0];
  const wantBlank = (d & BCD6) === BLANK;
  return matches.find((f) => blankOnly(f.dModifiers) === wantBlank) ?? matches[0];
}

/**
 * The d-character this instruction will operate under, BEFORE `applyFields` writes it: its own
 * where the form supplies one, the op-modifier register's where it does not. `pickForm` needs
 * it, and a chained `J` (length 1) can only be told apart by the register's value — which is
 * exactly why the 11-character blanking trap matters.
 */
export function effectiveDChar(form: Form, fetched: Fetched, regs: Registers): Cell {
  const c = fetched.chars;
  switch (form) {
    case 'Od': return c[1] ?? BLANK_WITH_C;
    case 'Oxxxd': return c[4] ?? BLANK_WITH_C;
    case 'Oad': return c[6] ?? BLANK_WITH_C;
    case 'Oxxxbd': return c[9] ?? BLANK_WITH_C;
    case 'Oabd': return c[11] ?? BLANK_WITH_C;
    case 'Oab': return BLANK_WITH_C;   // blanked — A22-0526-3 p.12, see `applyFields`
    default: return regs.opMod;        // O / Oa / Olong reuse the previous modifier
  }
}

/** What `applyFields` did, for the symbol set, the index-cycle count and the L2 trace. */
export interface FieldEffects {
  /** The A/I/C address this instruction supplied, after indexing. `null` = it supplied none. */
  a: Addr | null;
  /** The B address this instruction supplied, after indexing. `null` = it supplied none. */
  b: Addr | null;
  /** Address fields that carried an index tag — cpu.ts adds `INDEX_US` for each. */
  indexed: number;
  /** The D cycle that restores the invariant `DAR == BAR` — 223-2589 p.52. */
  dCycle: boolean;
}

/**
 * The plan §4.1 form table, executed. Every address field goes through `decodeAddress` and
 * `resolveIndex`: indexing is real at read-out, the instruction image in storage is never
 * modified, and an indexed result outside installed storage is an address check
 * (research/architecture.md §5, A22-0526-3 pp.14-15).
 *
 * `G` is the one exception to the indexing rule, and the one op that writes CAR alone; see
 * `isG` below.
 *
 * The address-double decision reads `entry.addressDouble` — the table's column, transcribed
 * from opcodes.md §1.4 — never a list written out here. The set is `A S ? ! , ⌑ / J R X` and
 * it EXCLUDES `@` and `%`, which is the 1401 compatibility trap.
 */
export function applyFields(
  entry: OpEntry, form: Form, fetched: Fetched, regs: Registers, storage: Storage,
): FieldEffects {
  const at = fetched.opAddr;
  const c = fetched.chars;
  const eff: FieldEffects = { a: null, b: null, indexed: 0, dCycle: false };

  // `G` is the only percent-type op code (opcodes.md §1.2) that carries an address at all, and
  // read-out treats it specially twice over. Both statements are its own opcodes.md §2 row's, and
  // both cite A22-0526-3 p.22: "Cannot be indexed" — which research/architecture.md §5 states as
  // "x-control fields (I/O) and G (Store Address Register) instructions cannot be indexed"
  // (pp.11, 22) — and "Uses the C-address register, so AAR is not disturbed". The x-control
  // fields never reach here; they stay raw in the instruction.
  const isG = entry.opChar === 'G';

  // One address field, read from storage at its own position so the 64-entry address-character
  // table and the zone/index rules apply exactly once (docs/plans/architecture.md §4.2).
  //
  // OPEN: neither manual says what the tens/hundreds ZONE BITS of an un-indexable address mean.
  // The simplest reading of research/architecture.md §4 is taken here — the address-character
  // table already gives every legal zoned character (`Z` = 9, `‡` = 0, …) its own digit, so the
  // tag is simply forced to 0 and `G 009Z6 B` stores into 00996. The field is still validity- and
  // range-checked, and costs no 34.5 µs index cycle.
  const address = (offset: number): Addr => {
    const decoded = decodeAddress(storage, at + offset);
    if (isG) return resolveIndex(storage, { ...decoded, tag: 0 });
    if (decoded.tag !== 0) eff.indexed++;
    return resolveIndex(storage, decoded);
  };

  switch (form) {
    case 'O':
      // AAR, BAR and the op-modifier register are all untouched: a 1-character instruction
      // reuses whatever the previous operation left (A22-0526-3 p.12). The D cycle sets BAR
      // into STAR, modifies it by zero and reads it into DAR — 223-2589 p.52.
      regs.dar = regs.bar;
      eff.dCycle = true;
      break;

    case 'Od':
      // `F 2 K 4` (+ `P Q` with MICR). No addresses.
      regs.opMod = c[1] ?? BLANK_WITH_C;
      break;

    case 'Oxxxd':
      // `U` only. x1x2x3 stays raw in the instruction; the channel decodes it (io.md §2).
      regs.opMod = c[4] ?? BLANK_WITH_C;
      break;

    case 'Oa': {
      const a = address(1);
      eff.a = a;
      if (entry.addressDouble) {
        // "read into AAR, BAR, CAR and DAR simultaneously, so that if a WM is read out at I
        // ring 6 time, the single address is used as both the A and B field addresses"
        // (223-2589 p.52) — the field operates on itself.
        regs.aar = regs.bar = regs.car = regs.dar = a;
      } else {
        // "Not address double-type op codes use the contents remaining in the BAR at the
        // completion of the previous E phase for the B field address" (223-2589 p.52).
        regs.aar = regs.car = a;
        regs.dar = regs.bar;
        eff.dCycle = true;
      }
      // The op-modifier register is deliberately NOT written: a 6-character form supplies no
      // d-character and REUSES the last previous operation modifier (A22-0526-3 pp.12, 25, 30,
      // 38; opcodes.md §2 rows `D`, `B`, `V`). This is the mirror of the `Oab` blanking below.
      break;
    }

    case 'Oad': {
      // `J R X G` (+ `Y` with Priority). Three different destinations, on the same two table
      // columns `Oa` reads — never a list written out here.
      const a = address(1);
      eff.a = a;
      if (isG) {
        // §2's G row prints `NSI / Ap / Bp`: "Uses the C-address register, so AAR is not
        // disturbed" (A22-0526-3 p.22). §1.4's "read into AAR and CAR" rule is stated for
        // NOT-percent-type op codes only, so the C-address reaches CAR alone.
        // OPEN: 223-2589 p.52 is silent on DAR for a percent-type address. CAR only, and no D
        // cycle — G supplies no B address and disturbs neither BAR nor DAR.
        regs.car = a;
      } else if (entry.addressDouble) {
        // `J R X` are address-double (opcodes.md §1.4): the I-address "is read into AAR, BAR,
        // CAR and DAR simultaneously" (223-2589 p.52) — which is exactly why §2's not-taken
        // row for all three prints `NSI / BI / BI`.
        regs.aar = regs.bar = regs.car = regs.dar = a;
      } else {
        // `Y` — neither percent-type nor address-double. AAR and CAR take the I-address; BAR is
        // whatever the previous E phase left, and the D cycle restores `DAR == BAR`
        // (223-2589 p.52), exactly as in the `Oa` case above.
        regs.aar = regs.car = a;
        regs.dar = regs.bar;
        eff.dCycle = true;
      }
      regs.opMod = c[6] ?? BLANK_WITH_C;
      break;
    }

    case 'Oxxxbd': {
      // `M L`. The x-control characters stay raw in the instruction — Wave 2's channel decodes
      // them (io.md §2, and the §9 C17 ruling lives in `Channel.decodeD`, not here).
      const b = address(4);
      eff.b = b;
      regs.bar = b;
      regs.opMod = c[9] ?? BLANK_WITH_C;
      break;
    }

    case 'Oab': {
      const a = address(1), b = address(6);
      eff.a = a; eff.b = b;
      regs.aar = regs.car = a;
      regs.bar = regs.dar = b;
      // An 11-position two-address instruction BLANKS the op-modifier register, so any chained instruction directly following is automatically assigned a blank d-character (A22-0526-3 p.12, via opcodes.md §1.2).
      regs.opMod = BLANK_WITH_C;
      break;
    }

    case 'Oabd': {
      const a = address(1), b = address(6);
      eff.a = a; eff.b = b;
      regs.aar = regs.car = a;
      regs.bar = regs.dar = b;
      regs.opMod = c[11] ?? BLANK_WITH_C;
      break;
    }

    case 'Olong':
      // Op `N` at any length: no fields, no registers, no modifier (opcodes.md §2 N row,
      // `NSI / Ap / Bp`). See `classifyForm`.
      break;
  }
  return eff;
}
