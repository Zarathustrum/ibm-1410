// Minimal ambient declarations for the Node built-ins used under tools/ and
// test/. There is no @types/node in node_modules (checked: not brought in
// transitively by Vite 8 or Vitest 4) so this shim exists instead. Keep it
// to exactly what the codebase calls — extend it if a new Node API is used,
// don't pre-declare anything speculative.
//
// `fetch` is not declared here: lib "DOM" already provides it.

declare module 'node:fs' {
  export function readFileSync(path: string): Buffer;
  export function readFileSync(path: string, encoding: 'utf8' | 'utf-8'): string;
  export function writeFileSync(path: string, data: string | Uint8Array): void;
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function unlinkSync(path: string): void;
  export function readdirSync(path: string): string[];
  export function readdirSync(path: string, options: { recursive: true; encoding: 'utf8' }): string[];
  export function statSync(path: string): { isDirectory(): boolean; isFile(): boolean; size: number };
}

declare module 'node:child_process' {
  export function execFileSync(
    file: string, args: string[], options: { cwd: string; encoding: 'utf8' },
  ): string;
}

declare module 'node:crypto' {
  interface Hash {
    update(data: string | Uint8Array): Hash;
    digest(encoding: 'hex'): string;
  }
  export function createHash(algorithm: string): Hash;
}

declare module 'node:path' {
  export function join(...parts: string[]): string;
  export function resolve(...parts: string[]): string;
  export function dirname(path: string): string;
  export function basename(path: string): string;
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
}

interface Buffer extends Uint8Array {}

declare const process: {
  argv: string[];
  exit(code?: number): never;
  exitCode?: number;
  stdout: { write(s: string): boolean };
  env: Record<string, string | undefined>;
};
