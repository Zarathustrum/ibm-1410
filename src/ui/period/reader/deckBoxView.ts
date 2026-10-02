// src/ui/period/reader/deckBoxView.ts — the deck a person types at the desk beside the 1402: the
// column notation, the errors that parse produced, the card faces it makes, and the two buttons
// that put it in the machine.
// Source: Phase-4 plan §3.3's `deckBoxView.ts` row (`unitrecord/deckBox.ts` restyled — `LEGEND`,
// `RECONSTRUCTION`, `refresh`, `setText` and the `put.disabled` rule survive), §6.4 (`keyBootstrap`
// replaces `findAlterBox`), §7.1 (the caption table — a deck-box face is captioned `deck box,
// card N`), §9.4 (the typed hand-off `coding → reader` is `deckBoxView.setText(text)`),
// §10.3 (inline style attributes — `src/ui/styles/period.css` is wave 5's), §11 wave 3.
// Phase-2 sources carried across with the code: plan §9 (the three column tokens and the parse
// rules), §13 (the sample deck's report is a reconstruction and the UI says so).
//
// WHICH MACHINE: the IBM 1402 on a 1410 — the file feed this box loads is filled by
// `machine.loadDeck`, and READER START / END OF FILE are keys on the 1402 itself
// (console-and-physical.md §7 [verified], A22-0526-3 pp.60-61, Fig.60 p.61), pressed at
// `reader/keysView.ts` and never here. The twelve bootstrap characters below are the 1410's
// channel-1 load record (software.md §10.2; `src/formats/loader.ts:26-32`), not a 1401's.
//
// A ONE-WAVE TRANSITIONAL STATE, RECORDED AS SUCH AND NOT AS A DESIGN (orchestrator ruling, wave
// 3): `opts.keyBootstrap` is OPTIONAL and in wave 3 **no caller supplies it** — the `ConsoleSession`
// that owns `keyBootstrap` is wave 4's file (§6.4, §3.3). So `key the bootstrap` is drawn DISABLED
// this wave, captioned `keyed at the 1415 from wave 4`, and the operator keys the twelve characters
// by hand into the INTERNALS tab's frozen ALTER box in the meantime. Wave 4's `reader/mount.ts`
// edit passes the hook and the button comes alive; nothing else here changes.
//
// The sample deck is an IMPORT, not a fetch: `demos/` sits outside `public/`, so a fetch works
// under `npm run dev` and 404s in a `vite build` output (Phase-2 plan §10). `?raw` needs no
// dependency and is declared once in `src/ui/period/raw-import.d.ts`.
//
// WHAT THIS FILE DELIBERATELY DOES NOT DO:
//  · **No DOM walk.** `deckBox.ts:45-55`'s `findAlterBox()` — a `document.querySelectorAll(
//    'input[type="text"]')` scan keyed on a label's text node — is DELETED, not moved. Phase 4
//    rewrites the DOM it hunted, and a selector across views breaks silently while a typed
//    hand-off breaks at `npm run typecheck` (DECISIONS.md 2026-08-31; plan §9.4).
//  · **No clipboard fallback.** `deckBox.ts:131-137`'s hidden read-only `<input>` + `select()`
//    existed only because the walk could fail; with the walk gone it has nothing to fall back
//    from (§9.4).
//  · It reaches no other view and touches no element it did not create. Everything it needs from
//    the machine arrives through the `Session` it is handed, and everything it gives away leaves
//    through `setText` (§9.4's two typed hand-offs).
//  · It computes no card geometry: `renderCardFace` (wave 1's `paper/cardGeometry.ts` behind
//    `reader/cardFaceView.ts`) draws every face, and this file only picks the caption and scale.
//  · It carries no CSS class of its own beyond `.deck-box` and `.deck-errors`, which
//    `index.html:31-32` already rules (plan §10.3's class inventory); every other rule here is an
//    inline style attribute, exactly as `printer/formView.ts` does today.

import { BOOTSTRAP_KEYSTROKES } from '../../../formats/loader.js';
import { make } from '../dom.js';
import { CARD_CAPTIONS, renderCardFace } from './cardFaceView.js';
import type { Session } from '../unitrecord/session.js';
import sampleDeck from '../../../../demos/hello-dad.cards?raw';

/** Plan §9, in one line. There is deliberately no word-mark notation — a card carries no mark. */
const LEGEND =
  'One line = one card. A column is a machine glyph, or {12-7-8} — a punch list, rows 12, 11, 0-9 '
  + 'in any order — or {} for an unpunched column. Short lines pad to 80. No word-mark notation: '
  + 'a mark travels as the {0-5-8} word separator and load mode makes it one on the way in.';

/**
 * AMENDED 2026-09-04 (Phase 6). This line used to read "no Avco 1410 is documented and no printout
 * of it survives", citing avco-and-reentry.md §1-2. The first half is WITHDRAWN: a family
 * member recalls being in the room with the 1410 and using it, recorded as `[testimony]` in
 * avco-and-reentry.md §2 by the escalation commit that also removed the same claim from the
 * showcase page. The desk now claims nothing in either direction about which machines were
 * installed where — that question belongs in the research file and the walkthrough, with its
 * provenance, not in drawn text a reader takes for settled. What survives is the half that was
 * always doing the work: no printout of an actual run survives, so the report is a reconstruction.
 */
const RECONSTRUCTION =
  'The sample deck prints a RECONSTRUCTION: no printout of an actual run survives. '
  + 'The report is built to the shape of the period, not copied from one.';

/**
 * The WORD MARK key as `controls.ts` spells it for a text box (`WORD_MARK_KEY` there, which is not
 * exported and `controls.ts` is BYTE-FROZEN — plan §13 criterion 3). `^` is deliberately not one of
 * the 64 machine characters, so it can never collide with data (`controls.ts:18-21`).
 */
const WORD_MARK_KEY = '^';

/**
 * What `key the bootstrap` says while it is dead — the wave-3 transitional caption named in the
 * header above, and the whole of what a person needs to know at the desk: the button is not broken,
 * the station that owns the keystrokes has not been built yet.
 */
const BOOTSTRAP_FROM_WAVE_4 = 'keyed at the 1415 from wave 4';

/**
 * THE CONSOLE DIALOGUE, SPELLED ONCE — §6.3's steps, in the order an operator does them. Used
 * three times and copied none: the wave-3 dead-button caption below, the refusal the live button
 * writes when the 1415 keyboard is locked, and `coding/mount.ts`'s PUNCH INTO HOPPER note, which
 * hands the operator off to this station. It is a SENTENCE FRAGMENT and carries no closing period,
 * so each use punctuates it.
 */
export const CONSOLE_PROCEDURE =
  'address 00000, DISPLAY; MODE = ALTER, START; COMPUTER RESET; MODE = RUN, START';

/** The twelve characters, spelled once, from the one constant that derives them (`loader.ts:53`). */
const BOOTSTRAP_TEXT = BOOTSTRAP_KEYSTROKES.text;

/**
 * The `^`-form of `BOOTSTRAP_KEYSTROKES`, DERIVED from it so there is no second copy of the string
 * — `deckBox.ts:34-36`'s `keyedBootstrap()`, carried across because the wave-3 note below has to
 * print a string a person can type into `controls.ts:50`'s alter box, whose WORD MARK key is the
 * literal `^` (`controls.ts:117`, `keyed()` at `:121-133`). `loader.ts:29`'s "positions 1 and 11"
 * are 0-BASED STORAGE ADDRESSES: they are the 2nd and the 12th character, the `L` and the `R`, and
 * a person counting them 1-based would mark the `A` and the `$` and the load would never execute.
 *
 * TWO PATHS, and §8.1 says this is the one place the plan is easy to get wrong: this `^` form is
 * UI-ONLY. It must NEVER reach `machine.alter`, which knows only the 64 machine characters and
 * throws on the first caret. Nothing here calls `machine.alter` and nothing here presses a key.
 */
const keyedBootstrap = (): string => [...BOOTSTRAP_KEYSTROKES.text]
  .map((ch, i) => (BOOTSTRAP_KEYSTROKES.wordMarks[i] === true ? WORD_MARK_KEY + ch : ch))
  .join('');

/** Named because `mount.ts` returns it and cannot name an unexported type (Phase 3 plan §3.2). */
export interface DeckBox { readonly el: HTMLElement; setText(text: string): void }

/**
 * `opts.kick` is the page's one repaint request (`src/ui/main.ts`, plan §10.2): the frame renders
 * on `dirty` alone while the machine is stopped, and PUT DECK IN HOPPER is an operator action that
 * changes reader state without the CPU advancing. `opts.keyBootstrap` is wave 4's — see the header.
 * It RETURNS whether the twelve characters went in: false is the locked 1415 keyboard refusing
 * them, and the note below says so rather than claiming a load that never happened.
 */
export function createDeckBoxView(
  session: Session,
  opts: { kick: () => void; keyBootstrap?: (text: string, marks: readonly boolean[]) => boolean },
): DeckBox {
  const el = make('div', 'deck-box');

  const heading = make('div');
  heading.textContent = 'Deck box — what goes in the 1402\'s file feed';
  heading.style.fontWeight = 'bold';

  const legend = make('div');
  legend.textContent = LEGEND;
  legend.style.maxWidth = '56em';

  // `createElement('textarea')` is typed HTMLTextAreaElement; `make()` returns the widened
  // HTMLElement, so this one element is built directly — the same reason panel.ts builds its
  // base-address <input> that way.
  const box = document.createElement('textarea');
  box.rows = 8;
  box.spellcheck = false;
  box.wrap = 'off';

  const sample = make('button');
  sample.textContent = 'sample deck';
  sample.addEventListener('click', () => {
    box.value = sampleDeck;
    refresh();
  });

  // PUT DECK IN HOPPER — plan §13: press it and the deck is in the machine. Built directly rather
  // than through `make()` for the same reason the textarea above is: `.disabled` is on
  // HTMLButtonElement, and `make()` returns the widened HTMLElement.
  const put = document.createElement('button');
  put.textContent = 'PUT DECK IN HOPPER';
  const hopperNote = make('div');
  put.addEventListener('click', () => {
    // Disabled below whenever this would fail, so the guard is belt-and-braces, not a branch a
    // person can reach: the session refuses a deck with parse errors or no cards (§10).
    if (!session.putDeckInHopper()) return;
    hopperNote.textContent =
      `${session.deck.length} cards in hopper. Press READER START, then END OF FILE — with fewer `
      + 'than four cards behind the last one the machine would otherwise stop Not Ready (§13).';
    // The hopper the 1402 is holding just changed and the CPU did not advance, so the frame has to
    // be asked for (plan §10.2). The mount's `gated` Session marks it too; both are one flag.
    opts.kick();
  });

  // KEY THE BOOTSTRAP — plan §6.4, §8.1. When the console station exists it feeds the twelve
  // characters through the SAME keyboard a person uses, one at a time, with the WORD MARK key on
  // the 2nd and the 12th of them — `loader.ts:29`'s 0-based storage addresses 1 and 11. It saves
  // typing, not steps: the operator still turns the rotary to DISPLAY, presses START, turns to
  // ALTER, presses START, COMPUTER RESET, RUN, START. It never calls `machine.alter` and it never
  // presses a key itself (§6.5 ruling 3).
  //
  // AND IT CAN BE REFUSED, WHICH THE NOTE SAYS. `keyBootstrap` returns false, having typed nothing,
  // unless the 1415 keyboard is open for DATA — which is the ALTER field, and an alter must follow
  // a display (§6.5 ruling 3 forbids any other way in). SO THE NOTE NAMES NO HALF OF THE DIALOGUE:
  // START in the DISPLAY detent opens the ADDRESS field, which `keyBootstrap` refuses in exactly
  // the same way, and START in ALTER without a display refuses at the 1415. It hands the operator
  // `CONSOLE_PROCEDURE`, the whole of §6.3's steps, which is what that constant is for.
  // The click handler branches on the return: the success note is not written unless the
  // characters went.
  const bootNote = make('div');
  const keyBoot = document.createElement('button');
  keyBoot.textContent = 'key the bootstrap';
  // The dead button's caption, drawn beside it rather than hidden in a tooltip: a disabled control
  // with no visible reason reads as a bug (the wave-3 transitional state, named in the header).
  const bootCaption = make('span');
  bootCaption.style.opacity = '0.7';
  const keyBootstrap = opts.keyBootstrap;
  keyBoot.disabled = keyBootstrap === undefined;
  if (keyBootstrap === undefined) {
    bootCaption.textContent = ` ${BOOTSTRAP_FROM_WAVE_4}`;
    bootNote.textContent =
      `key the bootstrap is dead this wave — ${BOOTSTRAP_FROM_WAVE_4}. Until the 1415 station is `
      + `built, type ${keyedBootstrap()} into the INTERNALS tab's alter box by hand — that is `
      + `${BOOTSTRAP_TEXT} with the WORD MARK key (${WORD_MARK_KEY}) before the 2nd and the 12th `
      + `character, the L and the R — then: ${CONSOLE_PROCEDURE}.`;
  } else {
    keyBoot.addEventListener('click', () => {
      // `wasKeyed`, not `keyed`: `keyed()` is the project's ONE word-mark parser
      // (`internals/controls.ts:123`) and nothing here is parsing.
      const wasKeyed = keyBootstrap(BOOTSTRAP_KEYSTROKES.text, BOOTSTRAP_KEYSTROKES.wordMarks);
      bootNote.textContent = wasKeyed
        ? `${BOOTSTRAP_TEXT} keyed at the 1415, one character at a time, with the WORD MARK key on `
          + 'the 2nd and the 12th character. It saves typing, not steps: COMPUTER RESET, RUN, START.'
        : 'Nothing was keyed — the 1415 keyboard is not open for data. Open it at the 1415 and '
          + `press this again. The whole dialogue: ${CONSOLE_PROCEDURE}.`;
      opts.kick();
    });
  }

  const note = make('div');
  note.textContent = RECONSTRUCTION;
  const errors = make('div', 'deck-errors');
  const cards = make('div');
  // The faces wrap rather than scroll: a hand deck is a few cards and they read as a stack on the
  // desk, not as a filmstrip. Inline until wave 5's stylesheet takes it (plan §10.3).
  cards.style.display = 'flex';
  cards.style.flexWrap = 'wrap';
  cards.style.gap = '0.6em';

  function refresh(): void {
    const found = session.setDeckText(box.value);
    errors.textContent = [
      `${session.deck.length} cards, ${found.length} errors`,
      ...found.map((e) => `line ${e.line}, column ${e.column}: ${e.message}`),
    ].join('\n');
    // §7.1's caption table: a face in the box says WHICH deck it belongs to, because the box and
    // the file feed can hold different bytes at the same moment. `deck` scale — the desk-sized
    // face, not the read station's and not the object deck's.
    cards.replaceChildren(
      ...session.deck.map((card, i) => renderCardFace(card, CARD_CAPTIONS.deckBox(i + 1), 'deck')),
    );
    // A deck with a bad column or no cards is not one the 1402 can be handed, so the key is dead
    // rather than failing when pressed. Editing the text also retires the note: it describes the
    // deck that WENT IN, and the reader still holds that one, not what is in the box now.
    put.disabled = found.length > 0 || session.deck.length === 0;
    hopperNote.textContent = '';
  }
  box.addEventListener('input', refresh);

  // The `sample deck` button's own two statements, named: `box.value` and `refresh()` are the two
  // closure-private things a hand-off from outside has to touch (Phase 3 plan §3.2). This is
  // `coding → reader`, the second of §9.4's two typed hand-offs, and PUNCH INTO HOPPER is its one
  // caller.
  function setText(text: string): void {
    box.value = text;
    refresh();
  }

  el.append(
    heading, legend, box, sample, ' ', put, ' ', keyBoot, bootCaption,
    note, errors, hopperNote, bootNote, cards,
  );
  refresh();
  return { el, setText };
}
