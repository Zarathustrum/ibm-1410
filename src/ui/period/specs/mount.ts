// src/ui/period/specs/mount.ts — the SPECS station on the desk: the sheet, what the generator gave
// back, and the one key that carries the result across to the coding station.
// Source: Phase-4 plan §9.2 (the station), §1 steps 2-3 (the storyboard the click path follows),
// §9.4 (the typed hand-off, now across a TAB boundary), §10.1 (the desk appends into the element it
// is handed), §11 wave 5b. `git mv` from Phase 5's `period/rpg/mount.ts`; the invalidation closure
// and the hand-off are its, and `FRAMING` below is Phase 5's paragraph verbatim.
//
// WHICH MACHINE: the 1410's CARD RPG, and `FRAMING` says in the page's own words which 1410 could
// have run it — rpg-sources.md §2.2 and §6 (C28-1443 not digitised; the shared X24-1336…1339
// columns from J24-0215-2). The generation itself is HOST-SIDE and the paragraph says so.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **It never reaches across another view's DOM.** SEND TO AUTOCODER is the typed
//    `sourceBox.setText(source, dataCards)` — the ruling DECISIONS.md 2026-08-31 recorded, because
//    "Phase 4 rewrites that DOM and a selector breaks silently", and this is the phase that
//    rewrites it (plan §9.4). It breaks at `npm run typecheck` or not at all.
//  · **It keeps no state of its own.** The specification text, the data cards and the last result
//    live in `period/rpg/session.ts`, which is DOM-free and did not move —
//    `test/tier4-rpg-demo.test.ts` drives the whole hand-off through it in node, unedited here.
//  · It draws no facsimile form: `specs/sheetView.ts` carries that refusal and its citations.

import { make } from '../dom.js';
import type { SourceBox } from '../coding/sheetView.js';
import { createRpgResultView } from './resultView.js';
import { createRpgSession } from '../rpg/session.js';
import { createRpgSpecBox } from './sheetView.js';

const FRAMING =
  'C28-1443, the 1410 RPG manual, is not digitised. These columns use the shared X24-1336 '
  + 'through X24-1339 card-system sheets documented in J24-0215-2. The real 1410 RPG processor '
  + 'needed 20K, a 1402 and two tape units to generate, then 20K, a 1402, four tape units and a '
  + '1403 Model 2 to assemble its output; this 20K, one-channel, tape-free configuration could '
  + 'never run it. IBM emitted IOCS macros. This host-side construction emits named open code '
  + 'because the emulator has no macro library.';

export function mountRpg(sourceBox: SourceBox, host: HTMLElement): void {
  const session = createRpgSession();
  const result = createRpgResultView();
  const send = document.createElement('button');
  send.textContent = 'SEND TO AUTOCODER';
  send.disabled = true;
  const note = make('div');
  note.style.margin = '.3em 0 0';

  const invalidate = (): void => {
    result.render(undefined);
    send.disabled = true;
    note.textContent = '';
  };

  const specs = createRpgSpecBox(session, {
    invalidate,
    generate(): void {
      const generated = session.generate();
      result.render(generated);
      send.disabled = !generated.ok;
      note.textContent = generated.ok
        ? `${generated.cards.length} Autocoder source cards generated.`
        : 'SEND TO AUTOCODER is disabled: fix the specification diagnostics and generate again.';
    },
  });

  send.addEventListener('click', () => {
    const handOff = session.handOff();
    if (handOff.source === '') return;
    sourceBox.setText(handOff.source, handOff.dataCards);
    note.textContent =
      'Autocoder source and data-card boxes filled. Press ASSEMBLE, then PUNCH INTO HOPPER.';
  });

  const heading = make('h2');
  heading.textContent = 'RPG — 1410 Report Program Generator (host-side)';
  const framing = make('div');
  framing.textContent = FRAMING;
  framing.style.fontSize = '.9em';
  framing.style.margin = '0 0 .6em';
  host.append(make('hr'), heading, framing, specs.el, result.el, send, note);
  result.render(undefined);
}
