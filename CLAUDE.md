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
- `npm test`: compiles `test/` (and the `src/` files it imports) with `tsc -p test` into `dist-test/` (gitignored), then runs `node --test` on the compiled `*.test.js`. Tests use `node:test` + `node:assert/strict`; this is temporary, milestone 8 switches to Vitest.
- VS Code F5: "Run App" (built) or "Run App (dev)" (Vite dev server, debugger attached to main). `.vscode/` is gitignored. React dev warnings (e.g. missing `key`) only appear in the dev variant.
- `npm run test-media [-- --long]`: generates test audiobooks into `test-media/` (gitignored) with ffmpeg (`scripts/make-test-media.mjs`): playable books with/without chapters, tags and cover, a nested folder, ALAC/AC-3 files and broken files that must be skipped. `--long` adds a 10-hour book.

## Layout and environments
- `src/main/`, `src/preload/` and `src/shared/`: Node environment, root `tsconfig.json`, compiled by `tsc` to `dist/` as CommonJS.
- `src/page/`: browser environment, `src/page/tsconfig.json` (`module: preserve`, DOM lib, `noEmit`), built by Vite to `dist/page/`.
  - `App.tsx` owns the page's state: `view` (`"library" | "player"`), `library`, `currentBookId`, and the `<audio>` element + `useAudioPlayer()`. They live in `App` so playback survives switching views (an unmounted component loses its state and its `<audio>` pauses). Views and components get the `AudioPlayer` object and data as props, and report changes through `onX` callbacks.
  - `views/` holds the full-page views (`LibraryView`, `PlayerView`); reusable components go in `components/`. `App.tsx`, `main.tsx` and hooks stay at the top of `src/page/`.
  - Don't read DOM state (e.g. `audio.src`) during render: derive from React state instead.
  - Overlays use a native `<dialog>` opened with `showModal()` via a ref (from event handlers only), with `closedby="any"` for Esc/backdrop dismissal. E.g. the chapter select in `PlayerView`.
- `src/shared/` is type-checked under **both** configs. It must only contain plain types and pure logic (no Node or DOM APIs).
- `src/shared/api.ts` holds the `Api` contract. The preload implements it (`const api: Api`), and `src/page/global.d.ts` types `window.api`.
- IPC channel names are the `Api` method names. Main registers a `handlers` object typed `{ [C in keyof Api]: (...args: unknown[]) => ReturnType<Api[C]> }` (a missing or wrongly typed handler is a compile error); the preload builds `api` with a typed `invoker(channel)`. Handler entries validate arguments with `expect*` functions from `src/main/checkers.ts`, then call typed `handleX` functions.
- `src/main/library.ts`: finding and parsing audiobooks (`music-metadata`), and main's book state: the library (`Map<BookID, Book>`, via `getLibrary`) and a main-only `Map<BookID, IPicture>` of covers (via `getCoverImage`). It imports only Node modules, not Electron, so it stays testable outside the app.
- Main owns the library; the page only displays what IPC calls return. A `BookID` is the file's normalized absolute path (`resolve` + lowercase + `/`). Cover bytes never go through IPC: `Book.hasCover` only says whether one exists.
- Audio and covers don't go through IPC. The page sets `<audio src>` to `audiobookUrl(bookId)` and `<img src>` to `coverUrl(bookId)` (`src/shared/urls.ts`: `morgiobooks://audiobook/<id>`, `morgiobooks://covers/<id>`). `src/main/protocol.ts` registers the scheme as privileged (before `app` is ready) and routes by host. Both handlers look the ID up in the library (unknown → 404).
  - Audio: `stat` for the size, `parseRange` (`src/main/range.ts`, pure) on the `Range` header, then `createReadStream` + `Readable.toWeb` as the body: 200 (whole file) / 206 (`Content-Range`) / 416 (`bytes */size`), always with `Accept-Ranges: bytes`. `stat` failure → 404 (`ENOENT`) or 500.
  - Covers: served from memory with their stored `format` as `Content-Type`. Only `image/jpeg`/`image/png` covers are stored (allowlist in `library.ts`).
- `src/shared/types.ts`: domain types (`Seconds`, `Chapter`, `Book`, `BookID`, `Library`, `Progress`). `src/shared/book.ts`: pure book logic (`getChapterAt`). `src/shared/time.ts`: `formatTime` (`h:mm:ss` / `m:ss`).
- `vite.config.mts` has a small CSP plugin: `default-src 'self'; img-src morgiobooks:; media-src morgiobooks:` (scheme name imported from `src/shared/urls.ts`); inline scripts/styles allowed only on the dev server.
- `test/`: unit tests (`*.test.ts`) with their own `test/tsconfig.json` (extends the root, `rootDir: ".."`, `outDir: "../dist-test"`), so tests are type-checked by their build and never end up in `dist/`.

## Conventions
- Style is enforced by ESLint Stylistic: Allman braces, 4-space indent, double quotes, semicolons, binary operators at the end of a line.
- Import order (`import-x/order`): external and Node imports, blank line, project imports, blank line, `import type` lines.
- File names: camelCase for modules (e.g. `bookList.ts`), PascalCase for React components (`App.tsx`).
- `interface` for object shapes, `type` for unions and aliases. String-literal unions, not `enum`.
- Named exports for project code. Use `import type` for type-only imports.
- IPC (structured clone, and `contextBridge`) may carry `Map`: the `Library` type is a `Map` (decision by the user; verified working). No classes (the prototype and methods are lost, but TS still thinks they exist) or functions across IPC.
- Anything saved as JSON must be plain data: convert `Map`s to arrays when saving (`JSON.stringify` turns a `Map` into `{}` silently).
- Times are stored in seconds (`Seconds`); convert external units (e.g. MP4 ticks / `timeScale`) at the boundary.

## Security rules
- The page never gets `ipcRenderer` or Node. It only gets what the preload exposes via `contextBridge`.
- IPC handlers in main treat arguments as `unknown` and validate them.
- The page must not be able to name arbitrary paths. The library can hold several folders and individually added files, so the allowlist is the set of books in main's library: the page refers to books by `BookID`, and main looks the ID up in the library map and rejects unknown IDs. Never treat a `BookID` from the page as a path (it looks like one). Where folder containment matters, use `realpath` + `path.relative` (never `startsWith`).
- Book files are untrusted input parsed in privileged main: skip unreadable files per file, and only accept known-playable codecs (allowlist).
- Keep the CSP strict. Only loosen it for a specific need (e.g. `img-src`/`media-src morgiobooks:` for covers and audio). The page must not be able to `fetch` from the scheme (`connect-src` stays at `default-src 'self'`).
- Values read from book files are untrusted, including metadata that ends up in response headers (e.g. a cover's `format` → `Content-Type`): allowlist them.

## Gotchas
- **VS Code sets `ELECTRON_RUN_AS_NODE=1`** in its terminals, which makes Electron run as plain Node (`require('electron')` is undefined). `dev.mjs` and the launch configs remove it; for a manual run use `Remove-Item Env:ELECTRON_RUN_AS_NODE`.
- **TypeScript is pinned to `~6.0`**, because typescript-eslint doesn't support TS 7 yet.
- **`@types/node` must match Electron's Node major version** (Electron 44 → Node 24). Recheck it when upgrading Electron.
- `tsc` never deletes stale output files in `dist/`; delete them by hand after moving or renaming files.
- Electron's types describe one `electron` module containing both main and renderer APIs, so `tsc` won't flag e.g. `ipcRenderer` used in main. In plain Node scripts (`dev.mjs`), `require("electron")` is the path to `electron.exe`, not the API.
- `music-metadata` is ESM-only and main is CommonJS; it loads fine through Node 24's `require(esm)` (verified). It is a runtime `dependency`, not a `devDependency`.
- **Codec support (verified with `canPlayType` in Electron 44):** AAC, Opus and FLAC in MP4 play; ALAC, AC-3 and E-AC-3 don't. `music-metadata`'s `format.codec` only names AAC/MP3/ALAC/AC-3 (joined with `+` across tracks; unknown codecs are omitted), so Opus/FLAC-in-MP4 are rejected by the allowlist.
- **Case-only renames on Windows:** git ignores them by default. Use two `git mv` steps (`app.tsx` → `tmp.tsx` → `App.tsx`), or imports break on case-sensitive systems.
- Setting `"lib": ["es2025"]` in the root tsconfig breaks `electron.d.ts` (it references DOM types). Use `skipLibCheck` if DOM types should ever be kept out of main.
- **Typed lint rules** (`no-floating-promises`) use `projectService`, so `eslint.config.mjs` applies them only to `src/**` and `test/**` (files in a tsconfig); `.mjs` scripts and `vite.config.mts` aren't. `node:test`'s `describe`/`it` are allowlisted (the runner awaits them). Handle promises with `await`, `.catch(...)` or `void`.
- ESLint has no Node globals configured for `.mjs` scripts: import `process`, `console`, `Buffer` from `node:` modules explicitly.
- **`net.fetch` on a `file:` URL ignores `Range`** (always 200 + whole file, no `Accept-Ranges`), so `<audio>` couldn't seek. That's why `protocol.ts` answers Range requests by hand.
- **Node can't run this project's `.ts` files directly** (type stripping): the package is `"type": "commonjs"`, and stripping keeps `import`/`export`. Hence tests are compiled with `tsc` first. Vite warns for the same reason (its future `configLoader: 'native'` can't load `vite.config.mts` importing `src/shared/urls.ts`); harmless for now, revisit with the Vitest switch in milestone 8.
- **Styling a `<dialog>`:** put `display: flex` (or any `display`) on `dialog[open]`, not on the dialog itself, or it overrides the UA's `display: none` and the closed dialog stays visible.
- `Uint8Array` is generic since TS 5.7: `music-metadata` gives `Uint8Array<ArrayBufferLike>`, but a `Response` body needs `Uint8Array<ArrayBuffer>`. Cast or copy (`new Uint8Array(x)`). The error message names an unrelated `BodyInit` union member (e.g. `URLSearchParams`).
