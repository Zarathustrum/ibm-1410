// src/core/devices/device.ts — the device seam: the interface every peripheral implements and
// the registry the channel looks them up in.
// Source: docs/plans/architecture.md §2 B9, §3 block 5, §4.10; research/io.md §1, §2.
//
// Two rules hold this boundary in place and nothing here may bend them:
//   1. Devices produce VALUES, never side effects — a `Uint8Array` of cell bytes on input, a
//      `ConsoleLine[]` / `PrintEvent[]` the machine's `snapshot()` reads on output
//      (docs/plans/architecture.md §2, "Devices produce values").
//   2. The channel does the MODE translation (move vs load), the device does the RENDERING.
//      A 1403 printing a blank ahead of a marked character and a 1415 printing an inverted
//      circumflex over one are two renderings of the same channel output (io.md §3, §7, §8).

import type { Device } from '../types.js';

export type { Device };

/**
 * Devices on one channel, keyed by the x2 (tens) character of the x-control field — `1` card
 * reader, `2` printer, `4` punch, `T` console printer, `U`/`B` tape, `F` disk
 * (research/io.md §2, A22-0526-3 p.105 Figure 107). One device per x2 per channel: the 1410
 * runs one device per channel at a time (io.md §1, "Concurrency").
 */
export class DeviceRegistry {
  private readonly byX2 = new Map<string, Device>();

  register(device: Device): void {
    this.byX2.set(device.x2, device);
  }

  /** `undefined` = nothing attached at that x2 — the channel turns that into Not Ready. */
  lookup(x2: string): Device | undefined {
    return this.byX2.get(x2);
  }
}
