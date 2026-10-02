// src/core/isa/exec/control.ts — no-op, halt, store-address-register and the two
// non-1410 op codes the table carries only so decode can reject them.
//
// WAVE 1 built `noOp`, `halt` and `haltBranch`; WAVE 3 adds `storeAddressRegister`.
// `$` and `=` are 7010-only and never dispatch.

import { glyphOf } from '../../bcd.js';
import { InstructionCheck, UnimplementedOp } from '../../checks.js';
import { BCD6, WM, ZA, ZB, type Addr, type ExecContext, type OpForm, type Storage } from '../../types.js';
import { notBuilt } from './stub.js';

/**
 * `N` No Operation, ANY length — opcodes.md §2 p.24: "Written over any instruction's op code to
 * make that whole instruction ineffective; the remaining characters are skipped. Word marks
 * unaffected."
 *
 * There is nothing to do. The read-out already scanned to the word mark on the next op code, so
 * "the remaining characters are skipped" is the scan itself, and the §2 register row
 * `NSI / Ap / Bp` leaves both address registers exactly as the previous operation left them —
 * which `decode.ts`'s `Olong` case has already respected by assigning no fields. An empty body
 * is the whole instruction.
 */
export const noOp: OpForm['exec'] = () => {
  // deliberately empty — see above
};

/**
 * `.` Halt at L=1 — opcodes.md §2 p.23: "System stops; START resumes with the next sequential
 * instruction." Registers `NSI / Ap / Bp`, so IAR is already NSI when the machine stops and the
 * next `step()` (the emulator's START) simply carries on there.
 */
export const halt: OpForm['exec'] = (ctx) => {
  ctx.halt = true;
};

/**
 * `. iiiii` Halt and Branch at L=6 — opcodes.md §2 p.23: "System stops; START resumes at the
 * I-address (unconditional branch)." §2 prints no not-taken result: the branch always happens.
 *
 * Taken-branch register model (docs/plans/phase-1-cpu-core.md §4.1, architecture.md §9 row C5):
 * opcodes.md §2 prints `IAR = NSIB` for a taken branch while research/architecture.md §9 says
 * IAR becomes the branch address + 1. Both describe the same machine at different instants — at
 * the end of the execute phase IAR holds NSIB and AAR holds BI, and the NEXT read-out takes the
 * op-code address from AAR into STAR and reloads IAR (opcodes.md §1.3, A22-0526-3 p.12). We set
 * IAR = BI, AAR = BI, BAR = NSIB and fetch from IAR, which is behaviourally identical for every
 * program because the subroutine-return mechanism `G ccccc B` reads BAR. So the machine stops
 * with IAR = BI and the next `step()` fetches the branched-to instruction.
 */
export const haltBranch: OpForm['exec'] = (ctx) => {
  ctx.sym.BI = ctx.regs.aar;      // the I-address, already decoded and indexed into AAR
  ctx.sym.NSIB = ctx.sym.NSI;     // the instruction that would have followed, had it not branched
  ctx.branchTaken = true;
  ctx.halt = true;
};

// ═══ `G` Store Address Register — opcodes.md §2 p.22 (A22-0526-3) ═════════

/** An address is five characters, everywhere on this machine — research/architecture.md §4. */
export const ADDRESS_CHARACTERS = 5;

/**
 * Decimal digit -> the BCD code G writes out. "Address characters are translated to
 * two-out-of-five code on entry to an address register and RETRANSLATED TO BCD when stored out
 * by G" (research/architecture.md §6, A22-0526-3 pp.8-9), and the register holds a magnitude —
 * an index tag was consumed on the way in and is not carried. So each of the five characters is
 * a plain decimal digit with NO zone bits: `1`-`9` are octal 01-11 and `0` is octal 12, the 8-2
 * code (research/charset.md §2). Index 0..9.
 */
const DIGIT_CODE: readonly number[] = [0o12, 0o01, 0o02, 0o03, 0o04, 0o05, 0o06, 0o07, 0o10, 0o11];

/** The zone bits G leaves alone — see `storeAddress`. */
const ZONES = ZB | ZA;

/**
 * The five characters of one address into core, UNITS DIGIT AT `c` and the ten-thousands digit
 * at `c-4`: "the C-address is the RIGHTMOST position of the destination" (opcodes.md §2 p.22).
 *
 * Two more clauses of the same row are the whole of the write rule: "Word marks in the C field
 * have no effect; zones in the C field are not disturbed." So the store neither stops at nor
 * changes a word mark, and it replaces only the 8421 portion of each character — an index tag
 * already sitting over the tens or hundreds position of the destination survives, which is what
 * makes `G ccccc B` safe to fire into the I-address of a tagged `J iiiii ␣`. `setChar`
 * recomputes the check bit, since parity is odd over BA8421 + WM (architecture.md §2).
 *
 * A destination below 00000 is `CoreStorage`'s address check, not a special case here.
 */
function storeAddress(storage: Storage, c: Addr, value: Addr): void {
  let rest = value;
  for (let i = 0; i < ADDRESS_CHARACTERS; i++) {
    const at = c - i;
    const digit = DIGIT_CODE[rest % 10] ?? 0;
    rest = Math.floor(rest / 10);
    const cell = storage.read(at);
    storage.setChar(at, (cell & ZONES) | digit, (cell & WM) !== 0);
  }
}

/**
 * OPEN: opcodes.md §2's `G` row names four d-characters (`A B E F`, plus the feature-only `T`)
 * and neither it nor A22-0526-3 p.22 says what any other d-character does. Treated as the `J`
 * row already treats an unknown modifier (`UNDEFINED_J_D_CHAR_IS_INSTRUCTION_CHECK` in
 * branch.ts) — an op-modifier the I ring cannot decode is an Instruction Check with nothing
 * executed (research/architecture.md §7). The alternative, storing *something*, would silently
 * corrupt five positions of the program. open-questions.md, opcodes row.
 */
export const UNDEFINED_G_D_CHAR_IS_INSTRUCTION_CHECK = true;

/**
 * `G ccccc d` — opcodes.md §2 p.22. Stores the register named by d as five characters ending at
 * the C-address. Registers after: `NSI / Ap / Bp` — neither AAR nor BAR moves, because the
 * address travelled to the C-address register at read-out (`decode.ts`, the `isG` branch of
 * `applyFields`) and never through AAR. Not indexable, timing a flat 69.75 µs.
 *
 * `E` and `F` are the channel 1 / channel 2 I/O address registers, which hold tape addresses in
 * OVERLAP mode (research/architecture.md §6). This configuration has no processing overlap, so
 * they are never loaded and both read 00000 — a real register, honestly empty, not a stub.
 */
export const storeAddressRegister: OpForm['exec'] = (ctx) => {
  storeAddress(ctx.storage, ctx.regs.car, selectedRegister(ctx));
};

function selectedRegister(ctx: ExecContext): Addr {
  const glyph = glyphOf(ctx.regs.opMod & BCD6);
  switch (glyph) {
    case 'A': return ctx.regs.aar;
    case 'B': return ctx.regs.bar;
    case 'E': return ctx.regs.ear;
    case 'F': return ctx.regs.far;
    // `G ccccc T` stores the real-time clock, not an address register: Program Addressable
    // Clock, feature manual G22-6654, "not base 1410" (opcodes.md §9.4). The table row carries
    // the d-character so the modifier is decoded rather than mistaken for a typo; the feature
    // is out of Phase 1, so it raises its own citation.
    case 'T':
      throw new UnimplementedOp(
        'G ccccc T', undefined,
        'Program Addressable Clock (Special Feature) — opcodes.md §9.4, G22-6654',
        ctx.fetched.opAddr,
      );
    default:
      if (!UNDEFINED_G_D_CHAR_IS_INSTRUCTION_CHECK) return ctx.regs.aar;
      throw new InstructionCheck(
        `undefined G d-character "${glyph}" (opcodes.md §2 p.22 names A B E F)`,
        ctx.fetched.opAddr,
      );
  }
}

// `$` Store and Restore Status — 7010 only, opcodes.md §9.3
export const storeRestoreStatus: OpForm['exec'] = notBuilt('$');

// `=` Floating Point — 7010 only, opcodes.md §9.3
export const floatingPoint: OpForm['exec'] = notBuilt('=');
