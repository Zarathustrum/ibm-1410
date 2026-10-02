// src/ui/period/dom.ts — the PERIOD surface's own DOM helpers and its own `View` interface.
// Source: Phase-4 plan §3.1 (wave 0's file table), §3.6 (the reuse-verbatim rows), §3.8 (the
// two cross-surface imports), §14 R9.
//
// WHY THIS FILE EXISTS AT ALL, since `src/ui/internals/panel.ts:22-37` already exports four of
// these: `panel.ts` is never refactored to share them. `src/ui/internals/controls.ts:12` imports
// `make` from `panel.ts`, and `controls.ts` is BYTE-FROZEN at SHA-256
// a6d90f54c0649625dcf32161d12332dd867bf66a424752fcfc55b4bfd4bf318f (architecture.md §6, "Phase 4
// reuses these controls verbatim"; plan §13 criterion 3; test/ui-controls-verbatim.test.ts).
// Extracting `make()` into a shared module would edit that import line and break the freeze on day
// one. So the period surface gets its OWN copy, and the two surfaces stay "visually foreign to
// each other on purpose" (architecture.md §6) with exactly two imports crossing between them
// (plan §3.8) — neither of them a DOM helper.
//
// `make`, `cell`, `row`, `table` and `View` carry the SAME SIGNATURES `panel.ts` gives them, so the
// thirteen moved importers change an import specifier and nothing else, and so the page frame can
// hold a `View` from either surface. `box`, `svg` and `text` are new here.
//
// WHAT THIS FILE DOES NOT DO: it computes no number and holds no state. Every number the period
// page draws lives in a DOM-free module under `period/paper/` or `period/console/`, tested in node
// (plan §0 bullet 1). It also carries no CSS class literal of its own — `src/ui/styles/period.css`
// is wave 5's, and a class named here would be a rule wave 5 owes (plan §10.3).

import type { MachineState } from '../../core/types.js';

/** The render contract every mounted view satisfies: one element, redrawn from one snapshot. */
export interface View {
  readonly el: HTMLElement;
  render(s: MachineState): void;
}

export const make = (tag: string, cls?: string): HTMLElement => {
  const e = document.createElement(tag);
  if (cls !== undefined) e.className = cls;
  return e;
};

export const cell = (t: string): HTMLElement => {
  const e = make('td');
  e.textContent = t;
  return e;
};

export const row = (...cells: readonly HTMLElement[]): HTMLElement => {
  const e = make('tr');
  e.append(...cells);
  return e;
};

export const table = (): HTMLElement => make('table');

/** A labelled container — the caption a station's panel carries above its contents. */
export const box = (legend: string, ...children: readonly (HTMLElement | string)[]): HTMLElement => {
  const f = make('fieldset');
  const l = make('legend');
  l.textContent = legend;
  f.append(l, ...children);
  return f;
};

// SVG elements are NAMESPACED: `createElement('rect')` makes an unknown HTML element that renders
// nothing, which is why the two helpers below exist rather than a second argument to `make`
// (the same namespace constant `cardView.ts` already carries).
const SVG_NS = 'http://www.w3.org/2000/svg';

export const svg = (tag: string, cls?: string): SVGElement => {
  const e = document.createElementNS(SVG_NS, tag);
  if (cls !== undefined) e.setAttribute('class', cls);
  return e;
};

/** An SVG `<text>` node with its content set — the labels drawn on a card, a form or a panel. */
export const text = (content: string, cls?: string): SVGElement => {
  const e = svg('text', cls);
  e.textContent = content;
  return e;
};
