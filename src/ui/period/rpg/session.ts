// DOM-free state for the host-side RPG block: specification text, data-card text, and the last
// generation result. The browser view is only an adapter over this object; the complete hand-off
// to Autocoder is exercised in node by test/tier4-rpg-demo.test.ts.
// Phase-5 plan §3.1, §3.5, §13 criterion 13a.

import { generate as generateProgram } from '../../../rpg/generate.js';
import type { RpgResult } from '../../../rpg/types.js';

export interface RpgHandOff {
  readonly source: string;
  readonly dataCards: string;
}

export interface RpgSession {
  readonly specText: string;
  readonly dataText: string;
  readonly result: RpgResult | undefined;
  setSpecText(text: string): void;
  setDataText(text: string): void;
  /** Generate from the current specification text. Spec defects return diagnostics, never throw. */
  generate(): RpgResult;
  /** Empty until the last generation succeeded; the browser uses that state to disable SEND. */
  handOff(): RpgHandOff;
}

export function createRpgSession(): RpgSession {
  let specText = '';
  let dataText = '';
  let result: RpgResult | undefined;

  const invalidate = (): void => { result = undefined; };

  return {
    get specText(): string { return specText; },
    get dataText(): string { return dataText; },
    get result(): RpgResult | undefined { return result; },
    setSpecText(text: string): void {
      specText = text;
      invalidate();
    },
    setDataText(text: string): void {
      dataText = text;
      invalidate();
    },
    generate(): RpgResult {
      result = generateProgram(specText);
      return result;
    },
    handOff(): RpgHandOff {
      return result?.ok === true
        ? { source: result.source, dataCards: dataText }
        : { source: '', dataCards: '' };
    },
  };
}
