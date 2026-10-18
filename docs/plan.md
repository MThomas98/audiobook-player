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
  shared/chapter.ts    Pure chapter logic: getChapterAt, getChapterIndexAt, getCurrentChapter, getChapterProgress, getChapterPosition
  shared/time.ts       Pure time formatting: formatTime (h:mm:ss / m:ss)
  shared/urls.ts       Scheme name and URL builders: audiobookUrl, coverUrl
  page/                React app: index.html, main.tsx, global.d.ts, tsconfig.json, styles.css
  page/App.tsx         Root: view state, library, current book, the <audio> element + useAudioPlayer
  page/useAudioPlayer.ts  Hook wrapping <audio>: isPlaying/position/duration state, togglePlay, seek
  page/views/          LibraryView (now-playing section, add buttons, grid), PlayerView (now playing)
  page/components/     Reusable components: LibraryGrid, BookCard, BookCover, PlayerControls, ChapterSelect
test/                  Unit tests (node:test: range, time, chapter), own tsconfig, compiled to dist-test/
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
(`Book` originally had `coverDataUrl?: string`; replaced by `hasCover` in milestone 4.) A file with no chapters is treated as one chapter covering the whole book. Implemented as `getChapterAt(chapters, position): Chapter | undefined` in `src/shared/book.ts`, since renamed `chapterUtils.ts`, then `chapter.ts` (`start <= position < end`; returns `undefined` at exactly the end of the book, which the player UI must handle), on top of `getChapterIndexAt` (same rule, `-1` for none).
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

**5. Library and player UI — IN PROGRESS.** `LibraryGrid` → `BookCard`, `PlayerControls`, `ChapterSelect`. `useAudioPlayer` hook wraps `<audio>`: play/pause, seek, ±10s/±30s, speed 0.75–2×, chapter navigation (seeking within the one file; no track switching).
- **Done:** library grid of `BookCard`s (#4); `useAudioPlayer` with play/pause, seek and skip, `PlayerControls` (progress slider + buttons).
- **Player page — done** (#20): one window, view switched in `App` state (`type View = "library" | "player"`, rendered by a `switch` with a `never` exhaustiveness check); no router. Choosing a book opens `PlayerView` (cover, title/author, controls, Back button). Playback continues across views because `<audio>` and `useAudioPlayer()` live in `App`, which never unmounts; the `AudioPlayer` object (`ReturnType<typeof useAudioPlayer>`) is passed down as a prop. `App` derives `currentBook` from `currentBookId` + the library and passes it to both views; `LibraryView` shows a mini bar (title, controls, "Back to Player") while a book is loaded. `library` state also lives in `App` (both views need it). `BookCover` holds the `hasCover ? coverUrl : default logo` fallback; its size is set by CSS per context (`.book-card .book-cover`, `.player-view .book-cover`).
- **Chapter select — done** (part of #6): a "Chapters" button in `PlayerView` opens a modal `<dialog>` (`showModal()`/`close()` through a `useRef<HTMLDialogElement>`, called only from click handlers; `closedby="any"` closes it on Esc or a backdrop click; Close button). Inside, `ChapterSelect` lists each chapter as a button (title left, start time right; `key` = `chapter.start`, since titles can repeat); choosing one seeks to its start and closes the dialog. Only the list scrolls, so Close stays visible. Each chapter button is filled by how much of it has been played (`ChapterSelect` takes `position`; fill = `(position - start) / (end - start)` clamped to 0–1, so finished chapters are full, the current one partly, later ones empty), computed by `getChapterProgress` in `chapter.ts` (a zero-length chapter is 0 before its start and 1 from it, avoiding `0 / 0`), passed to CSS as a `--fill` custom property and drawn with a hard-stop `linear-gradient` between `--chapter-done` and `--chapter-todo` (`:root`). `global.d.ts` augments React's `CSSProperties` with `` [key: `--${string}`] `` so `style={{ "--fill": ... }}` type-checks. `formatTime` (`src/shared/time.ts`, floors to whole seconds) is unit-tested in `test/time.test.ts`.
- **Current chapter and previous/next — done** (part of #6): `PlayerView` shows the current chapter's title under the cover (title and author in an `<hgroup>`; `getCurrentChapter` gives the last chapter at the exact end of the book; it replaced a `getChapterAt(...) ?? chapters.at(-1)` that was repeated in each view). `PlayerControls` takes a `chapters` prop (passed by both views) and has Previous/Next Chapter buttons in place of ±30s. Previous restarts the current chapter when more than `RESTART_CHAPTER_THRESHOLD` (5 s) into it, otherwise goes to the previous chapter; at the exact end of the book it goes to the last chapter's start. Next does nothing on the last chapter. `getChapterAt`/`getChapterIndexAt`/`getCurrentChapter`/`getChapterPosition` are unit-tested in `test/chapter.test.ts`.
- **Chapter progress bar — done** (#22): the `PlayerControls` range covers the current chapter instead of the whole file (`max` = chapter length, `value` = `getChapterPosition`, seeking adds the chapter's `start`), so it applies in both views. Without chapters it falls back to the whole file. Seeking is clamped to 10 ms before the chapter's `end`: `end` is the next chapter's start, so dragging past the right edge used to skip one chapter per mouse move (the bar switched chapters mid-drag). Locking the chapter for the duration of a drag (pointer events + state) would be the cleaner fix. `LibraryView` shows the current book in a `<section className="now-playing" aria-label="Now playing">`: title (`<h2>`), current chapter, controls and "Back to Player", spaced with flex `gap`. Above the bar, `PlayerControls` shows the time as `elapsed / length` (`formatTime`) for the current chapter, or for the whole file without chapters; it is empty while `duration` is still `NaN` (before metadata loads). The same string is the slider's `aria-valuetext`, so screen readers announce a time instead of raw seconds; the slider has `aria-label="Chapter Position"`. The text is a `<span>`: `<output>` would be a live region, announced on every `timeupdate`.
- **Remaining:** mark the current chapter in `ChapterSelect` for screen readers with `aria-current` (last part of #6; the fill only shows it visually); optionally move the previous/next logic into `chapter.ts` as pure, tested functions; playback speed (`playbackRate` + `defaultPlaybackRate`, `ratechange`).
- Layout: column flexboxes with `align-items: center`. Gotchas met: flex items shrink to content width (use `align-self: stretch`), `<hr>` has UA `margin-inline: auto` which beats `align-self`, inline elements become rows in a flex column (wrap them in a `.button-row`), `align-items: center` centres a box but not the wrapped lines inside it (`text-align: center`), `display: flex` on a `<dialog>` overrides the UA's `display: none` for a closed dialog (put it on `dialog[open]`).
*Concepts:* typed props, `useRef<HTMLAudioElement>`, typed event handlers, function-typed props (`onX`), lifting state up (keeping state alive across views), conditional rendering, `typeof` in type positions, `never` exhaustiveness, `useEffect` vs code in the render body, `key` in lists, `<dialog>` and the top layer, flexbox scrolling regions, CSS custom properties set from React, module augmentation, template literal index signatures.

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
