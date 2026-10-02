import { describe, it, expect } from 'vitest';
import { BLANK_WITH_C, IAR_AFTER_RESET, RegisterFile } from '../src/core/registers.js';

// research/console-and-physical.md §3 (A22-0526-3 pp.49, 52; S223-2648 pp.75-77).
describe('RegisterFile', () => {
  it('comes up with IAR 00001 and blank-with-C in Op and Op-modifier', () => {
    const r = new RegisterFile();
    expect(IAR_AFTER_RESET).toBe(1);
    expect(BLANK_WITH_C).toBe(0x40);
    expect(r.iar).toBe(1);
    expect(r.op).toBe(0x40);
    expect(r.opMod).toBe(0x40);
  });

  it('program reset sets IAR to 00001 and blanks Op and Op-modifier (p.52)', () => {
    const r = new RegisterFile();
    r.iar = 2000; r.op = 0o61; r.opMod = 0o27;
    r.programReset();
    expect(r.iar).toBe(1);
    expect(r.op).toBe(0x40);
    expect(r.opMod).toBe(0x40);
  });

  // Only a POWER-ON reset clears the seven address registers, through the System Reset that comes
  // with it (S223-2648 pp.76-77). Neither console key this class models does.
  it('leaves AAR BAR CAR DAR EAR FAR alone across both keys', () => {
    const r = new RegisterFile();
    r.aar = 5980; r.bar = 6979; r.car = 111; r.dar = 222; r.ear = 333; r.far = 444;
    r.programReset();
    expect([r.aar, r.bar, r.car, r.dar, r.ear, r.far]).toEqual([5980, 6979, 111, 222, 333, 444]);
    r.computerReset();
    expect([r.aar, r.bar, r.car, r.dar, r.ear, r.far]).toEqual([5980, 6979, 111, 222, 333, 444]);
  });

  // Computer reset = program reset + start reset + check circuits, timing clocks and all machine
  // indicators (S223-2648 p.76 item 1). Everything it adds lives outside this class, so on the
  // registers alone it does exactly what program reset does.
  it('computer reset also lands IAR on 00001', () => {
    const r = new RegisterFile();
    r.iar = 2000; r.op = 0o61; r.opMod = 0o27;
    r.computerReset();
    expect(r.iar).toBe(1);
    expect(r.op).toBe(0x40);
    expect(r.opMod).toBe(0x40);
  });
});
