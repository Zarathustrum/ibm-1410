// src/ui/period/raw-import.d.ts — the period surface's ambient module declarations for Vite's
// `?raw` import suffix, and for the one stylesheet `src/ui/main.ts` imports.
// Source: Phase-4 plan §3.1 (wave 0's file table), §10.3 (the stylesheet), §10.6 item 1 and
// item 2 (why Vite, and why a CSS import costs one line here rather than a dependency).
//
// This project carries no `vite/client` types (and, per tsconfig.json's own note, no
// `@types/node`), so the five `demos/*?raw` sample imports — reader/deckBoxView.ts:50,
// coding/sheetView.ts:37-38 and specs/sheetView.ts:32-33 — and `main.ts`'s
// `import './styles/period.css'` are declared here.
//
// THE MERGE IS A SIMPLIFICATION, NOT AN ENFORCEMENT — BUT ONLY BECAUSE OF ONE COMPILER FLAG, and
// the whole record is written down because the file this one replaces stated half of it.
// `src/ui/autocoder/raw-import.d.ts:4-8` said that re-declaring an already-declared pattern "would
// merge into a duplicate `export default` and fail `npm run typecheck`". It was RIGHT that the
// blocks collide and WRONG about the condition: the collision is invisible to this project's
// `npm run typecheck` because `tsconfig.json:22` sets `"skipLibCheck": true`, which skips type
// checking of every `.d.ts`. MEASURED with the repo's own `tsc` 5.9.3 and this `tsconfig.json`
// (plan §3.1, §10.6 item 1):
//   · two identical `declare module '*.cards?raw'` blocks in two files  -> exit 0
//   · the same two blocks in one file                                   -> exit 0
//   · either of the above with a live raw import of a .cards file present -> exit 0
//   · the SAME duplicate under `--skipLibCheck false`                    -> exit 2,
//     `error TS2300: Duplicate identifier 'text'`, reported at BOTH declaration sites
//   · this merged file alone under `--skipLibCheck false`                -> exit 0
// So a second copy is tolerated rather than legal, and the three shims are merged into one because
// ONE PLACE is easier to find and to extend — Phase 6's `*.asm?raw` line goes here — and because a
// duplicate would be an error the moment `skipLibCheck` were turned off.
//
// WHAT THIS FILE DOES NOT DO: it declares no `*.svg`, no `*.json`, no `*.txt` and no `vite/client`
// triple-slash reference. Ambient declarations are visible across the whole program, so a pattern
// added here is added for every file in the repo; keep it to what is actually imported.

declare module '*.cards?raw' {
  const text: string;
  export default text;
}

declare module '*.asm?raw' {
  const text: string;
  export default text;
}

declare module '*.rpg?raw' {
  const text: string;
  export default text;
}

// A shorthand ambient declaration takes no body: the module is typed `any`, which is all a
// side-effect-only stylesheet import needs (plan §10.6 item 2).
declare module '*.css';
