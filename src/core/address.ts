// src/core/address.ts — five characters in core become a magnitude plus an index tag.
// Source: docs/plans/phase-1-cpu-core.md §3; docs/plans/architecture.md §4.2.
//
// Addresses in STORAGE are five characters where the zone bits over the tens and hundreds
// positions are an index tag, not magnitude. Addresses in REGISTERS are magnitudes. The
// conversion happens exactly once, when the address field is read into an address register
// (research/architecture.md §4, §5; A22-0526-3 pp.8, 14-15).

import { AddressCheck } from './checks.js';
import { BCD6, ZA, ZB, type Addr, type AddressUse, type Cell, type DecodedAddress, type Storage } from './types.js';

// The `[unverified]` fallback from docs/plans/phase-1-cpu-core.md §10: the manual says only that
// "the system will stop on an error" when an indexed effective address lands outside installed
// storage on a 20K/40K/60K machine. We stop; we never wrap.
export const INDEX_OUT_OF_RANGE_TRAPS = true;   // OPEN: open-questions.md architecture row

// A hand-written 64-entry table, NOT a derived rule. research/architecture.md §4 gives two
// overlapping statements — "every position must have a numeric total of 0-9" and "legal
// tens/hundreds characters: numerals, letters, and `/ ? ! ‡`", with `&`, `$` and `#` explicitly
// causing an address check — which do not reduce to one arithmetic rule: `&` has numeric bits 0
// yet is illegal, and `0` is coded 8-2 yet means zero. The legal set is therefore exactly the 40
// characters the manual lists: the ten numerals, the twenty-six letters, and `/ ? ! ‡`.
// `null` = address check. Rows of eight, by octal code (research/charset.md §2).
const ADDRESS_DIGIT: readonly (number | null)[] = [
  //  00 blank  01 '1'  02 '2'  03 '3'  04 '4'  05 '5'  06 '6'  07 '7'
      null,        1,      2,      3,      4,      5,      6,      7,
  //  10 '8'    11 '9'  12 '0'  13 '#'  14 '@'  15 ':'  16 '>'  17 radical
         8,        9,      0,   null,   null,   null,   null,   null,
  //  20 'ƀ'    21 '/'  22 'S'  23 'T'  24 'U'  25 'V'  26 'W'  27 'X'
      null,        1,      2,      3,      4,      5,      6,      7,
  //  30 'Y'    31 'Z'  32 '‡'  33 ','  34 '%'  35 wsep  36 '\'  37 segmark
         8,        9,      0,   null,   null,   null,   null,   null,
  //  40 '-'    41 'J'  42 'K'  43 'L'  44 'M'  45 'N'  46 'O'  47 'P'
      null,        1,      2,      3,      4,      5,      6,      7,
  //  50 'Q'    51 'R'  52 '!'  53 '$'  54 '*'  55 ']'  56 ';'  57 delta
         8,        9,      0,   null,   null,   null,   null,   null,
  //  60 '&'    61 'A'  62 'B'  63 'C'  64 'D'  65 'E'  66 'F'  67 'G'
      null,        1,      2,      3,      4,      5,      6,      7,
  //  70 'H'    71 'I'  72 '?'  73 '.'  74 lozenge 75 '['  76 '<'  77 grpmark
         8,        9,      0,   null,   null,   null,   null,   null,
];

export function addressDigit(cell: Cell): number | null {
  return ADDRESS_DIGIT[cell & BCD6] ?? null;
}

// Index-tag weights, research/architecture.md §5 (A22-0526-3 p.14 Fig. 10).
const TAG_A_TENS = 1, TAG_B_TENS = 2, TAG_A_HUND = 4, TAG_B_HUND = 8;

// Index register n occupies 00020+5n through 00024+5n as ORDINARY STORAGE — IR1 = 00025-00029
// … IR15 = 00095-00099 (research/architecture.md §5, A22-0526-3 p.14 Fig. 9).
const IR_BASE = 20, IR_WIDTH = 5;

// `at` is the high-order (leftmost) of the five address characters: ten-thousands, thousands,
// hundreds, tens, units. Zone bits are legal ONLY over the tens and hundreds; a zone bit in the
// units, thousands or ten-thousands position makes the address invalid
// (research/architecture.md §4, A22-0526-3 p.8).
export function decodeAddress(s: Storage, at: Addr): DecodedAddress {
  let value = 0;
  let valid = true;
  let hund = 0, tens = 0;
  for (let i = 0; i < 5; i++) {
    const cell = s.read(at + i);
    if (i === 2) hund = cell;
    if (i === 3) tens = cell;
    const digit = addressDigit(cell);
    if (digit === null) valid = false;
    value = value * 10 + (digit ?? 0);      // keep the place values aligned even when invalid
    // positions 2 and 3 are hundreds and tens — the only two that may carry zones.
    if (i !== 2 && i !== 3 && (cell & (ZA | ZB)) !== 0) valid = false;
  }
  const tag = ((tens & ZA) !== 0 ? TAG_A_TENS : 0)
            | ((tens & ZB) !== 0 ? TAG_B_TENS : 0)
            | ((hund & ZA) !== 0 ? TAG_A_HUND : 0)
            | ((hund & ZB) !== 0 ? TAG_B_HUND : 0);
  return { value, tag: tag as DecodedAddress['tag'], valid };
}

// Adds the index factor algebraically and returns the effective address. Untagged addresses come
// back unchanged. research/architecture.md §5 (A22-0526-3 pp.14-15):
//   - the 5-digit factor is added AFTER the address enters the address register; the instruction
//     image in storage is never modified;
//   - the factor's sign comes from the zone bits of its own UNITS position: B alone is minus,
//     none / BA / A are plus;
//   - word marks anywhere in 00025-00099 are ignored during indexing, and zone bits in the index
//     register are ignored except in that units position;
//   - overflow during index addition does NOT set the arithmetic overflow latch, so this routine
//     never touches the indicators;
//   - the result must be a valid address, otherwise the machine stops on an address check.
export function resolveIndex(s: Storage, d: DecodedAddress): Addr {
  if (!d.valid) throw new AddressCheck('invalid address character or misplaced zone bit');

  // Being inside installed storage is a property of the ADDRESS, not of the indexing:
  // research/architecture.md §4 (A22-0526-3 p.8) gives "valid magnitudes 00000 through 79999"
  // for the largest system, so an UNTAGGED field naming a position the machine does not have is
  // an address check exactly as an indexed result is, below. Without this an `A 99999 88888` on a
  // 10K machine would load both registers silently and stop only at the first storage access.
  if (d.tag === 0) {
    if (d.value >= s.size) {
      throw new AddressCheck(`address ${d.value} outside installed storage (${s.size})`, d.value);
    }
    return d.value;
  }

  // research/architecture.md §4 (A22-0526-3 p.15): on a 10K system the high-order position of an
  // address being indexed must contain zero.
  if (s.size === 10_000 && Math.floor(d.value / 10_000) !== 0) {
    throw new AddressCheck(`indexed address ${d.value} has a non-zero high-order position on a 10K machine`);
  }

  const base = IR_BASE + IR_WIDTH * d.tag;
  let factor = 0;
  for (let i = 0; i < IR_WIDTH; i++) {
    const digit = addressDigit(s.read(base + i));
    if (digit === null) throw new AddressCheck(`non-numeric character in index register ${d.tag}`, base + i);
    factor = factor * 10 + digit;
  }
  const units = s.read(base + IR_WIDTH - 1);
  const minus = (units & ZB) !== 0 && (units & ZA) === 0;
  const effective = d.value + (minus ? -factor : factor);

  if (INDEX_OUT_OF_RANGE_TRAPS && (effective < 0 || effective >= s.size)) {
    throw new AddressCheck(`indexed address ${effective} outside installed storage (${s.size})`);
  }
  return effective;
}

// The remaining documented address-check branches, the two that depend on how the address is
// about to be used (research/architecture.md §4, A22-0526-3 p.8):
//   - 00000 is always valid for INCREMENTING operations; addressing 00000 in a DECREMENTING
//     operation stops with an address check, no exceptions;
//   - for incrementing operations the highest usable position is (top - 1) — 59998 on a 60K
//     machine. The top address itself causes an address check EXCEPT for console display/alter
//     and read/write "to end of core" I/O, which is what `topAddressPermitted` names. The top
//     address is always valid for decrementing operations.
// Range is checked here too, so a caller that builds an address arithmetically rather than
// through `resolveIndex` still gets the stop.
export function checkAddress(s: Storage, a: Addr, use: AddressUse, topAddressPermitted = false): Addr {
  if (!Number.isInteger(a) || a < 0 || a >= s.size) {
    throw new AddressCheck(`address ${a} outside installed storage (${s.size})`, a);
  }
  if (a === 0 && use === 'decrement') {
    throw new AddressCheck('00000 addressed by a decrementing operation', a);
  }
  if (a === s.size - 1 && use === 'increment' && !topAddressPermitted) {
    throw new AddressCheck(`top address ${a} addressed by an incrementing operation`, a);
  }
  return a;
}
