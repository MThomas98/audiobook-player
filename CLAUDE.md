# Morgiobooks

A Windows desktop audiobook player (Electron + React + TypeScript), built as a learning project. It plays local MP4 audiobooks (`.mp4`/`.m4a`/`.m4b`) with chapter metadata. One file = one book. Fully offline.

**Plan and milestone status:** [docs/plan.md](docs/plan.md). Read it before starting milestone work, and update it when a milestone finishes or the scope changes.

## How to work with the user
- The user is learning TypeScript, Electron and the Node toolchain (they're a C++ engineer). **They write the code themselves.** Explain each step and let them do it. Only edit project files when they explicitly ask.
- Go one small step at a time. Explain what each new line or option does and why.
- C++ comparisons help (headers ↔ `.d.ts`, `std::optional` ↔ `T | null`), but say where they break down.

## Commands
- `npm run dev-start`: development (Vite dev server + Electron). Page changes hot-reload; main/preload changes need a restart.
- `npm start`: build everything, then run the built app.
- `npm run build`: `tsc` (main/preload/shared) then `vite build` (page).
- `npm run lint` / `npm run format` (`eslint --fix`; there is no Prettier).
- Type-check: `npx tsc --noEmit` and `npx tsc --noEmit -p src/page`.
- VS Code F5: "Run App" (built) or "Run App (dev)" (Vite dev server, debugger attached to main). `.vscode/` is gitignored.

## Layout and environments
- `src/main/`, `src/preload/` and `src/shared/`: Node environment, root `tsconfig.json`, compiled by `tsc` to `dist/` as CommonJS.
- `src/page/`: browser environment, `src/page/tsconfig.json` (`module: preserve`, DOM lib, `noEmit`), built by Vite to `dist/page/`.
- `src/shared/` is type-checked under **both** configs. It must only contain plain types and pure logic (no Node or DOM APIs).
- `src/shared/api.ts` holds the `Api` contract. The preload implements it (`const api: Api`), and `src/page/global.d.ts` types `window.api`.
- `vite.config.mts` has a small CSP plugin: strict `default-src 'self'` in builds; inline scripts/styles allowed only on the dev server.

## Conventions
- Style is enforced by ESLint Stylistic: Allman braces, 4-space indent, double quotes, semicolons.
- `interface` for object shapes, `type` for unions and aliases. String-literal unions, not `enum`.
- Named exports for project code. Use `import type` for type-only imports.
- Data crossing IPC or saved as JSON must be plain data (no classes, functions, `Map` or `Date`).

## Security rules
- The page never gets `ipcRenderer` or Node. It only gets what the preload exposes via `contextBridge`.
- IPC handlers in main treat arguments as `unknown` and validate them.
- The page must not be able to name arbitrary paths. Main remembers the library folder the user chose; check paths with `realpath` + `path.relative` (never `startsWith`).
- Keep the CSP strict. Only loosen it for a specific need (e.g. `img-src 'self' data:` for cover art).

## Gotchas
- **VS Code sets `ELECTRON_RUN_AS_NODE=1`** in its terminals, which makes Electron run as plain Node (`require('electron')` is undefined). `dev.mjs` and the launch configs remove it; for a manual run use `Remove-Item Env:ELECTRON_RUN_AS_NODE`.
- **TypeScript is pinned to `~6.0`**, because typescript-eslint doesn't support TS 7 yet.
- **`@types/node` must match Electron's Node major version** (Electron 44 → Node 24). Recheck it when upgrading Electron.
- `tsc` never deletes stale output files in `dist/`; delete them by hand after moving or renaming files.
- Electron's types describe one `electron` module containing both main and renderer APIs, so `tsc` won't flag e.g. `ipcRenderer` used in main. In plain Node scripts (`dev.mjs`), `require("electron")` is the path to `electron.exe`, not the API.
- `music-metadata` is ESM-only and main is CommonJS. It should load through Node 24's `require(esm)`. If it doesn't, switch main to ESM or bundle it.
