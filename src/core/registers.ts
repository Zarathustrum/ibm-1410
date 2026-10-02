// src/core/registers.ts — the programmer-visible register set and the two reset keys.
// Source: docs/plans/phase-1-cpu-core.md §1, §3; docs/plans/architecture.md §4.3.
//
// IAR AAR BAR CAR DAR EAR FAR are held as magnitudes; Op and Op-modifier are held as cell bytes,
// because the console prints them as characters and the d-character tables index by BCD
// (research/architecture.md §6, A22-0526-3 pp.8-10 Fig. 5).
// CAR and DAR are here because address-doubling and Table Lookup need them; EAR/FAR because
// `G ccccc E` has to have something to store.

import { C, type Addr, type Cell, type Registers } from './types.js';

// research/console-and-physical.md §3 (A22-0526-3 p.52): Program Reset "sets Op register,
// Op-modifier register and A-data register to C-bit only (blank with correct parity)". Blank is
// octal 00, so odd parity puts the C bit on by itself.
export const BLANK_WITH_C: Cell = C;

// research/architecture.md §1 (A22-0526-3 p.8): IAR = 00001 after program reset or computer
// reset. docs/plans/phase-1-cpu-core.md §1 states the same.
export const IAR_AFTER_RESET: Addr = 1;

export class RegisterFile implements Registers {
  iar: Addr = IAR_AFTER_RESET;
  aar: Addr = 0;
  bar: Addr = 0;
  car: Addr = 0;
  dar: Addr = 0;
  ear: Addr = 0;
  far: Addr = 0;
  op: Cell = BLANK_WITH_C;
  opMod: Cell = BLANK_WITH_C;

  // PROGRAM RESET (research/console-and-physical.md §3, A22-0526-3 pp.49, 52; S223-2648 p.75).
  // Of the state this class holds it clears exactly two things and sets one:
  //   - the Op register and the Op-modifier register go to blank-with-C;
  //   - IAR goes to 00001 (the key sets the "branch to 00001" latch).
  // It does NOT clear AAR, BAR, CAR, DAR, EAR or FAR. Only a POWER-ON reset clears the seven
  // address registers, via the System Reset that accompanies it (S223-2648 pp.76-77) — and
  // power-on is not one of the console keys this class models.
  // The rest of what the key does — cycle and scan control latches, the I- and A-ring triggers,
  // the A-data register, the storage address register, the console inquiry latch, the 1401
  // control latches, the arithmetic control latches, the logic clocks and a triggered Start
  // Reset — is state this emulator does not hold, or belongs to other modules.
  programReset(): void {
    this.op = BLANK_WITH_C;
    this.opMod = BLANK_WITH_C;
    this.iar = IAR_AFTER_RESET;
  }

  // COMPUTER RESET = program reset + start reset + a reset of the check circuits, the timing
  // clocks and all machine indicators; IAR -> 00001 (research/console-and-physical.md §3,
  // A22-0526-3 p.49, p.52; S223-2648 p.76 item 1). Every one of those additions lives outside
  // this class: Start Reset clears the address-check and address-exit error latches, and the
  // machine indicators are `indicators.ts`, whose documented quirk is that computer reset leaves
  // *low* and *unequal* ON. The remote/1014 inquiry latches and the tape-density latch survive
  // both keys; the console inquiry latch does not.
  // So, for the registers alone, computer reset does exactly what program reset does.
  computerReset(): void {
    this.programReset();
  }
}
