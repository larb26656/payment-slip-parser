## Quick Facts

- Language/runtime: Node.js + TypeScript.
- Entry point: `src/index.ts`.
- Types: `src/core/types.ts`.

## Tooling

- Install dependencies with `npm install`.
- Development watcher: `npm run dev` (uses `tsx`).
- Type checking / build output: `npm run build` (emits to `dist/`).
- Tests: `npm test` (Vitest). Prefer focused specs near the code under test.

## Coding Guidelines

- Keep files in ECMAScript module format (`"type": "module"` in `package.json`).
- Default to ASCII; introduce other characters only when already present and justified.
- Add concise comments only when logic is non-obvious.
- When editing, prefer minimal diffs and avoid touching unrelated changes.

## Testing Expectations

- Run `npm test` before sharing changes.
- When adding parsers or data extractors, include unit tests that cover happy-path and error cases.
