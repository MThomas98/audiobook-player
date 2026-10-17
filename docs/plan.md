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
| Lint + format | ESLint 10 + typescript-eslint + **ESLint Stylistic** (no Prettier) | Allman braces, 4-space indent, double quotes, semicolons, binary operators at the end of the line (`operator-linebreak: after`) |
| Metadata | `music-metadata` 12.x in main, with `includeChapters: true` | Reads QuickTime chapter tracks and Nero `chpl` lists. **ESM-only package; main is CommonJS**: check `require(esm)` works at the start of milestone 3, otherwise switch main to ESM or bundle |
| Audio | HTML `<audio>` in the page | Verified with `canPlayType` in Electron 44: AAC, Opus and FLAC in MP4 play; ALAC, AC-3 and E-AC-3 don't. Main uses an allowlist on `metadata.format.codec` (`"MPEG-4/AAC"`, `"MPEG-1 layer 3"`). music-metadata doesn't name Opus/FLAC-in-MP4, so those are rejected too (rare for audiobooks). Recheck when upgrading Electron |
| Persistence | JSON file in `app.getPath('userData')` | |
| Tests | `node:test` for now (compiled with `tsc -p test`), Vitest in milestone 8 | |
| Packaging | electron-builder, Windows installer | |

## Layout
```
src/
  main/main.ts         Node: window, IPC handler table, dialogs (later: progressStore.ts)
  main/checkers.ts     Validators for IPC arguments: expectString, expectProgress (unknown -> typed)
  main/library.ts      Scanning/parsing books; owns the library Map and the main-only covers Map
  main/protocol.ts     morgiobooks:// scheme: streams audio (Range support) and serves covers
  main/range.ts        Pure Range-header parsing: parseRange -> full | partial | unsatisfiable
  preload/preload.ts   Exposes window.api via contextBridge; implements the Api contract with a typed invoker
  shared/api.ts        Api contract (interface) used by main, preload and page
  shared/types.ts      Domain types: Seconds, Chapter, Book, BookID, Library, Progress
  shared/book.ts       Pure book logic: getChapterAt
  shared/urls.ts       Scheme name and URL builders: audiobookUrl, coverUrl
  page/                React app: index.html, main.tsx, App.tsx, global.d.ts, tsconfig.json
test/                  Unit tests (node:test), own tsconfig, compiled to dist-test/
scripts/dev.mjs        Dev launcher
scripts/make-test-media.mjs  Test audiobook generator (ffmpeg)
vite.config.mts        Vite config incl. a small CSP plugin (strict in builds, allows inline in dev)
```

## Milestones
**0. Tooling — DONE.** Hand-built: npm, TypeScript, Electron, preload/IPC folder picker, Vite + React, ESLint Stylistic, VS Code launch configs ("Run App" and "Run App (dev)").

**1. Domain types — DONE.** `src/shared/types.ts`:
```ts
export type Seconds = number;
export interface Chapter { title: string; start: Seconds; end: Seconds; }   // from start of book
export interface Book { id: string; filePath: string; title: string; author?: string; duration: Seconds; chapters: readonly Chapter[]; hasCover: boolean; }
export interface Progress { bookId: string; position: Seconds; updatedAt: number; }   // updatedAt = Date.now()
```
(`Book` originally had `coverDataUrl?: string`; replaced by `hasCover` in milestone 4.) A file with no chapters is treated as one chapter covering the whole book. Implemented as `getChapterAt(chapters, position): Chapter | undefined` in `src/shared/book.ts` (`start <= position < end`; returns `undefined` at exactly the end of the book, which the player UI must handle).
Note: setting `"lib": ["es2025"]` in the root tsconfig breaks `electron.d.ts` (it references DOM types); the line was removed. `"skipLibCheck": true` is the alternative if DOM types should be kept out of main.
*Concepts:* interface vs type, string-literal unions, optional properties, `readonly`, type aliases as documentation, plain data across IPC/JSON.

**2. Typed IPC bridge — DONE.** `Api` = `selectFolder(): FolderContents | null`, `scanFolder(): Book[]`, `getProgress(bookId): Progress | null`, `saveProgress(progress): void` (all `Promise`s). Channel names are the `Api` method names.
- Main: `type Handlers = { [C in keyof Api]: (...args: unknown[]) => ReturnType<Api[C]> }`. A `handlers` object of that type (so a missing, extra or wrongly typed handler is a compile error) is registered with `Object.entries` + `ipcMain.handle`. Handler entries validate arguments (`expectString`, `expectProgress`, which returns a fresh object with only the known fields) and call typed `handleX` functions.
- Preload: `invoker<C>(channel): (...args: Parameters<Api[C]>) => ReturnType<Api[C]>`, with one `as` cast where `ipcRenderer.invoke` returns `Promise<any>`.
- `getProgress`/`saveProgress` are stubs until milestone 6 (their unused parameters are the only lint errors). `scanFolder` builds placeholder books from `FolderContents.files`; throws if no folder is selected.
*Concepts covered:* generics with constraints (vs C++ concepts/SFINAE), `keyof`, indexed access, `ReturnType`/`Parameters`, mapped types, type assertions, `unknown` + narrowing, type predicates, erased generics (no `typeof T`), `for...of` vs `for...in`.

**3. Library scanning — DONE** (`main/library.ts`). Recursive `readdir` for `.mp4`/`.m4a`/`.m4b`; `parseFile(path, { includeChapters: true })` (`require(esm)` works). Main holds `Library = Map<BookID, Book>` (BookID = normalized absolute path); `addFolderToLibrary`/`addFileToLibrary`/`getLibrary` return the whole library; cancelling returns it unchanged. Chapters: seconds = `start / timeScale`, each `end` = next start (last = duration); no chapters or a missing/zero `timeScale` → one whole-book chapter. Cover: `selectCover` → base64 data URL at first (moved to the protocol in milestone 4). Codec allowlist (`MPEG-4/AAC`, `MPEG-1 layer 3`); unreadable/unplayable files are logged and skipped per file. Verified with `npm run test-media`. Open: failures aren't reported to the page.
*Concepts:* third-party types, async fs, narrowing `unknown` errors.

**4. Serving audio safely — DONE** (`main/protocol.ts`, `main/range.ts`). Privileged `morgiobooks://` scheme (`standard`, `secure`, `stream`) via `protocol.handle`, routed by host: `morgiobooks://audiobook/<encodeURIComponent(BookID)>` and `morgiobooks://covers/<id>`. Main looks the ID up in the library map (unknown → 404); the page never supplies a path.
- **Seeking:** `net.fetch(pathToFileURL(...))` was tried first, but it ignores `Range` for `file:` URLs (always 200 + whole file, no `Accept-Ranges`), so Chromium read the whole file to reach `moov` and every seek restarted at 0 (issue #1). Now answered by hand: `stat` → `parseRange` (pure; 200 / 206 / 416 per RFC 9110, "invalid" ranges ignored, "unsatisfiable" → 416 with `bytes */size`) → `createReadStream({ start, end })` + `Readable.toWeb` as the body. Verified seeking in the 10-hour book.
- **Covers:** kept in main (`Map<BookID, IPicture>` in `library.ts`, only `image/jpeg`/`image/png`), served from memory with `Content-Type` = stored format. `Book.hasCover` replaces `coverDataUrl`, so covers no longer cross IPC as base64. CSP: `img-src morgiobooks:; media-src morgiobooks:` (`data:` removed).
- **Tests:** first unit tests (`test/range.test.ts`, `node:test`), see milestone 8.
*Concepts:* HTTP request/response, Range/206/416, streams and backpressure (Node vs web streams), discriminated unions, regex `exec`, definite assignment, `node:test`.

**5. Library and player UI — NEXT.** `LibraryGrid` → `BookCard`, `PlayerBar`, `ChapterList`. `useAudioPlayer` hook wraps `<audio>`: play/pause, seek, ±30s, speed 0.75–2×, chapter navigation (seeking within the one file; no track switching).
- **Player page** (issue #20): the player gets its own "now playing" view (cover, title/author, controls, chapter list) instead of sitting above the library grid. Choosing a book opens it; a back button returns to the library. One window, with the view switched in `App` state (`type View = "library" | "player"`); no router yet. Playback must continue across views, so `<audio>` and `useAudioPlayer` stay mounted in `App` and the player state is passed down. On the library view, a small bar shows the current book with play/pause and a way back to the player page.
*Concepts:* typed props, `useRef<HTMLAudioElement>`, typed event handlers, discriminated unions for player state, `key` in lists, lifting state up (keeping state alive across views).

**6. Remember the library and resume where you left off** (`main/libraryStore.ts`, `main/progressStore.ts`).
- **Library:** save the *sources* the user added (folder paths and individual file paths) as JSON in userData, not the scanned books. On start, load them and rescan to rebuild the `Map<BookID, Book>`; the page fetches it with `getLibrary` on mount. Missing folders/files are skipped and reported, not deleted from the list (the drive may just be unplugged). Add a way to remove a source. Caching scanned books (to skip rescanning) is an optional later optimization; covers would go in separate files, not in the JSON.
- **Progress:** `Record<BookID, Progress>` as JSON in userData; save at most every 5 s and on pause; restore last book and position on start.
- Write files safely (write to a temp file, then rename) so a crash mid-write can't corrupt them; validate loaded JSON as `unknown` like IPC input.
*Concepts:* `Record`, `Partial`/`Pick`, validating untrusted JSON.

**7. Polish.** `navigator.mediaSession` (media keys, Windows media overlay), sleep timer, keyboard shortcuts. Library filtering: a search box that narrows the grid by title/author (case-insensitive, done in the page over the books it already has; no IPC). Settings menu (issue #21): **which settings it has is still to be decided** when this milestone starts. Settings are saved by main as JSON in userData (same safe writes and validation as milestone 6) and changed through the typed `Api`. Optional hardening: block all network requests from the page in main (second layer alongside the CSP).

**8. Tests and packaging.** Vitest for pure functions (`getChapterAt`, `parseRange`, time formatting). `electron-builder --win` installer (no auto-updater).
- Unit tests started early (milestone 4) with Node's built-in runner (`node:test` + `node:assert`) to see the bare mechanism, starting with `parseRange`. In this milestone, switch to Vitest (it also covers the page) and port or remove the raw `node:test` tests.
- The CommonJS setup (`"type": "commonjs"`) blocks Node's type stripping (why tests are compiled with `tsc` first) and Vite's future native config loader (warning on `vite.config.mts` importing `src/shared/urls.ts`). Decide here whether to move to ESM or keep CommonJS.

## Side quest (optional, after milestone 5 or so): hand-written MP4 reader
Replace `music-metadata` with our own parser, as a learning exercise. Estimate: 3–5 days part-time, ~500–800 lines, for typical audiobook files.
- **Keep the same signature** (e.g. `readBook(path): Promise<Book>`) so the two readers can be swapped, and **differential-test** them: run both over the real collection and compare the `Book`s (fits Vitest in milestone 8).
- **Format:** a tree of boxes `[u32 size][4cc type][payload]`; `size == 1` means a 64-bit size follows, `size == 0` means to end of file. Only `moov` is needed (often at the *end* of the file; skip `mdat` without reading it).
- **Pieces, easiest first:**
  - Box walker with `FileHandle.read` at offsets. Guard against size < 8 (infinite loop), absurd sizes and deep nesting: these are untrusted files parsed in privileged main.
  - `mvhd`: timescale + duration (version 0 = 32-bit fields, version 1 = 64-bit).
  - `stsd` first entry 4cc: `mp4a` (AAC, playable) vs `alac` / `ac-3` (not playable).
  - `udta/meta/ilst` tags: `©nam`, `©ART`, `aART`, `covr`, each wrapping a `data` box (type indicator + locale + payload). Quirk: `meta` has 4 extra version/flags bytes in MP4 but not in QuickTime files.
  - `udta/chpl` Nero chapters: `u64` starts in 100 ns units + length-prefixed titles.
  - **Hard part:** QuickTime chapter track. Audio `trak`'s `tref/chap` points to a text track; each title is a sample located by combining `stts`, `stsz`, `stsc` and `stco`/`co64`. Common in Apple/Audible-derived `.m4b`s.
- **Smallest first step (an evening):** box walker + `chpl` reader that prints the tree for the real files, to see which chapter format they actually use.
- *Concepts:* `DataView`/`Buffer` (big-endian by default), `bigint` and the 2^53 limit of `number`, `fs.promises` `FileHandle.read` (≈ `pread`), safe parsing of untrusted binary input.

## Future idea: automatically generated subtitles (read-along)
Transcribe a book's audio locally and show the current sentence while it plays. Later extras: search the book's text, tap a line to jump to it. Prerequisites: milestones 4–6 (audio served, player UI, progress).
- **Must stay offline:** speech recognition runs on this machine. Candidates:
  - **whisper.cpp** (C++, CPU or GPU): run as a bundled CLI from main via `child_process`/`utilityProcess`, or as a native addon. Probably the best fit, and plays to the user's C++ background.
  - **transformers.js** (Whisper as ONNX, pure JS/WASM): no native build, but slower.
- **Model file:** 75 MB (tiny/base) to ~3 GB (large). Nothing may be downloaded at runtime, so either bundle a small model or let the user pick a model file from disk.
- **Audio input:** Whisper wants 16 kHz mono PCM. Decoding a 10+ hour AAC file needs a decoder (e.g. a bundled ffmpeg, or whisper.cpp built with ffmpeg support); avoid decoding the whole book into memory at once.
- **Cost:** a long book can take a long time (minutes to hours, depending on model and hardware). Run it in the background, process chapter by chapter, save partial results so it can resume, and show progress in the UI.
- **Output:** WebVTT/SRT (or JSON segments `{ start, end, text }`) cached in `userData`, keyed by book id. Display either via `<track kind="subtitles">` on the `<audio>` element or a custom panel synced to `timeupdate` (reuse the `getChapterAt`-style lookup for segments).
- **Security:** the transcriber is another parser of untrusted input running with main's privileges; pass it only paths already checked against the library folder.
- *Concepts:* child processes / `utilityProcess` / worker threads, streaming large data, IPC progress events (main → page push, not just `invoke`), native addons vs CLI tools, WebVTT.

## Verification (each milestone)
- `npx tsc --noEmit`, `npx tsc --noEmit -p src/page`, and `npm run lint` pass.
- Run with F5 ("Run App (dev)") or `npm run dev-start`; check the terminal (main) and DevTools (page) for errors.
- From milestone 3: test against real MP4 audiobooks, with and without chapters.
- From milestone 6: close and reopen; it resumes at the saved position.
- Milestone 8: `npx vitest run` passes; the installer installs and plays a book.
