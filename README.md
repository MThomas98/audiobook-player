# Morgiobooks

A simple audiobook player for Windows, made because I couldn't find a good one. It plays local MP4 audiobooks (`.m4b`, `.m4a`, `.mp4`) and reads their chapters, title, author and cover art. One file is one book, and everything stays on your computer: nothing is fetched from the internet.

Built with Electron, React and TypeScript, partly as a project to learn those tools.

## Status

Early development. You can add folders or individual files to the library, see each book's cover and chapters, and play a book (including seeking).

Planned:
- A proper player: chapter navigation, skip back and forward, playback speed
- Remembering the library and resuming where you left off
- Media keys and the Windows media overlay, a sleep timer, keyboard shortcuts
- A Windows installer

Supported audio: AAC and MP3 in an MP4 file, which covers most audiobooks. Files using ALAC or AC-3 audio, and unreadable files, are skipped.

## Running it

You need [Node.js](https://nodejs.org/) (which includes npm).

```sh
npm install
npm start          # build and run the app
npm run dev-start  # development mode: page changes reload automatically
```

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Compiles main and preload with `tsc`, and the page with Vite, into `dist/` |
| `npm run lint` | Checks the code with ESLint |
| `npm run format` | Fixes the style issues ESLint can fix |
| `npm test` | Compiles and runs the unit tests in `test/` |
| `npm run test-media` | Generates test audiobooks into `test-media/` (needs [ffmpeg](https://ffmpeg.org/) on your `PATH`). Add `-- --long` for a 10-hour book |

If you run Electron from a VS Code terminal, note that VS Code sets `ELECTRON_RUN_AS_NODE=1`, which stops Electron from starting as an app. `npm run dev-start` removes it for you; before `npm start`, clear it yourself (in PowerShell: `Remove-Item Env:ELECTRON_RUN_AS_NODE`).

## How it's put together

```
src/
  main/      Electron main process: library scanning, file dialogs, IPC handlers, audio streaming
  preload/   Exposes a small, typed API to the page
  page/      React user interface
  shared/    Types and pure logic used by both sides
test/        Unit tests
scripts/     Development launcher and test-media generator
docs/        Project plan
```

The user interface has no access to Node or the file system. It asks the main process for things through a typed API (`src/shared/api.ts`) and refers to books by ID, never by file path. Audio and cover art reach the page through a custom `morgiobooks://` URL scheme, which only serves books that are already in the library. Audio is streamed with support for HTTP range requests, so seeking jumps straight to the right part of the file.

The milestones and design decisions are in [docs/plan.md](docs/plan.md).
