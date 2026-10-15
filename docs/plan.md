# Audiobook Player (Morgiobooks): Electron + React + TypeScript learning build

## Context
The user is a C++ engineer who knows JavaScript well and is new to TypeScript, Electron and the npm/Node toolchain. They are building a Windows desktop audiobook player, **Morgiobooks**, to learn how a real TypeScript application is structured.
**How we work:** the user builds the project themselves, one step at a time. Claude explains each step (what to do, why, and what each line means) and the user writes the files and runs the commands. Claude only writes files when the user explicitly asks. A generated electron-vite scaffold was tried first and thrown away because it hid too much; the setup was then rebuilt by hand.

## Scope decisions
- **MP4 files with chapter metadata only** (`.mp4`, `.m4a`, `.m4b` are the same container; treat them identically). **One file = one book.** Folders of MP3s are not planned (they may come later as a second kind of book).
- **Fully offline.** All files are local; nothing is fetched from the internet. Cover art comes only from the files. No auto-updater.

## Stack (as built)
| Concern | Choice | Notes |
|---|---|---|
| Runtime | Electron 44 (contains Node 24.21) | `@types/node` pinned to 24 to match Electron's Node |
| Language | TypeScript **6.0** (`~6.0`), strict | TS 7 was tried, but typescript-eslint only supports TS < 6.1 |
| Main + preload build | `tsc` (root `tsconfig.json`), CommonJS output to `dist/` | `module: nodenext`, `noEmitOnError`, `sourceMap` |
| Page build | Vite 8 + `@vitejs/plugin-react`, output to `dist/page/` | Own `src/page/tsconfig.json` (`module: preserve`, DOM lib, `noEmit`) |
| UI | React 19, `useState` to start | Component library (e.g. Mantine) optional later |
| Dev loop | `scripts/dev.mjs` starts Vite's dev server, then Electron with `DEV_SERVER_URL` | Main/preload changes need a manual restart; electron-vite is an option later |
| Lint + format | ESLint 10 + typescript-eslint + **ESLint Stylistic** (no Prettier) | Allman braces, 4-space indent, double quotes, semicolons |
| Metadata | `music-metadata` 12.x in main, with `includeChapters: true` | Reads QuickTime chapter tracks and Nero `chpl` lists. **ESM-only package; main is CommonJS**: check `require(esm)` works at the start of milestone 3, otherwise switch main to ESM or bundle |
| Audio | HTML `<audio>` in the page | Electron plays AAC in MP4; ALAC/AC-3 audio won't play (detect and report) |
| Persistence | JSON file in `app.getPath('userData')` | |
| Tests | Vitest | |
| Packaging | electron-builder, Windows installer | |

## Layout
```
src/
  main/main.ts         Node: window, IPC handlers, dialogs (later: library.ts, protocol.ts, progressStore.ts)
  preload/preload.ts   Exposes window.api via contextBridge; implements the Api contract
  shared/api.ts        Api contract (interface) used by preload and page
  shared/types.ts      Domain types (milestone 1)
  page/                React app: index.html, main.tsx, app.tsx, global.d.ts, tsconfig.json
scripts/dev.mjs        Dev launcher
vite.config.mts        Vite config incl. a small CSP plugin (strict in builds, allows inline in dev)
```

## Milestones
**0. Tooling — DONE.** Hand-built: npm, TypeScript, Electron, preload/IPC folder picker, Vite + React, ESLint Stylistic, VS Code launch configs ("Run App" and "Run App (dev)").

**1. Domain types — NEXT.** `src/shared/types.ts`:
```ts
export type Seconds = number;
export interface Chapter { title: string; start: Seconds; end: Seconds; }   // from start of book
export interface Book { id: string; filePath: string; title: string; author?: string; duration: Seconds; chapters: readonly Chapter[]; coverDataUrl?: string; }
export interface Progress { bookId: string; position: Seconds; updatedAt: number; }   // updatedAt = Date.now()
```
A file with no chapters is treated as one chapter covering the whole book. Exercise for the user: `findChapterAt(chapters, position): Chapter | undefined` in `src/shared/chapters.ts`.
*Concepts:* interface vs type, string-literal unions, optional properties, `readonly`, type aliases as documentation, plain data across IPC/JSON.

**2. Typed IPC bridge.** Add `scanLibrary`, `getProgress`, `saveProgress` to `Api`. Tie `ipcMain.handle` handlers to the contract so main's return types are checked (e.g. a channel → type map).
*Concepts:* generics, mapped/indexed types. Validate all IPC arguments in main as `unknown`. Main remembers the user-chosen library folder; the page never names arbitrary paths.

**3. Library scanning** (`main/library.ts`). Find `.mp4`/`.m4a`/`.m4b` files under the chosen folder; `parseFile(path, { includeChapters: true })` for title, author, duration, chapters, cover (as data URL). Skip/report unplayable codecs. First check the ESM import works from CommonJS main.
*Concepts:* third-party types, async fs, narrowing `unknown` errors.

**4. Serving audio safely** (`main/protocol.ts`). Privileged `audiobook://` scheme (`stream: true`) via `protocol.handle` + `net.fetch(pathToFileURL(...))`. Must support range requests/seeking in multi-hundred-MB files. Only serve files inside the library folder: `realpath` + `isInside(root, target)` using `path.relative` (never plain `startsWith`).

**5. Library and player UI.** `LibraryGrid` → `BookCard`, `PlayerBar`, `ChapterList`. `useAudioPlayer` hook wraps `<audio>`: play/pause, seek, ±30s, speed 0.75–2×, chapter navigation (seeking within the one file; no track switching).
*Concepts:* typed props, `useRef<HTMLAudioElement>`, typed event handlers, discriminated unions for player state, `key` in lists.

**6. Resume where you left off** (`main/progressStore.ts`). `Record<bookId, Progress>` as JSON in userData; save at most every 5 s and on pause; restore last book and position on start.
*Concepts:* `Record`, `Partial`/`Pick`, validating untrusted JSON.

**7. Polish.** `navigator.mediaSession` (media keys, Windows media overlay), sleep timer, keyboard shortcuts. Optional hardening: block all network requests from the page in main (second layer alongside the CSP). CSP will need `img-src 'self' data:` for cover art.

**8. Tests and packaging.** Vitest for pure functions (`findChapterAt`, time formatting). `electron-builder --win` installer (no auto-updater).

## Verification (each milestone)
- `npx tsc --noEmit`, `npx tsc --noEmit -p src/page`, and `npm run lint` pass.
- Run with F5 ("Run App (dev)") or `npm run dev-start`; check the terminal (main) and DevTools (page) for errors.
- From milestone 3: test against real MP4 audiobooks, with and without chapters.
- From milestone 6: close and reopen; it resumes at the saved position.
- Milestone 8: `npx vitest run` passes; the installer installs and plays a book.
