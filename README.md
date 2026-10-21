# Morgiobooks

A simple audiobook player for Windows, made because I couldn't find a good one. It plays local MP4 audiobooks (`.m4b`, `.m4a`, `.mp4`) and reads their chapters, title, author and cover art. One file is one book, and everything stays on your computer: nothing is fetched from the internet.

Built with Electron, React and TypeScript, partly as a project to learn those tools.

## Status

Early development. You can add folders or individual files to the library, browse it as a grid of covers, and open a book on its own player page. There you can play/pause, skip 10 seconds back or forward, and move to the previous or next chapter. A progress bar and the elapsed time show where you are in the current chapter. A chapter list shows how much of each chapter you've played and jumps to any of them. Playback carries on while you browse the library, with small controls for the current book at the top.

The library is remembered between runs, and each book picks up where you left off. The window also remembers its size and position.

Planned:
- Playback speed
- Reopening the last book when the app starts
- Media keys and the Windows media overlay, a sleep timer, keyboard shortcuts, a settings menu
- A Windows installer

Supported audio: AAC and MP3 in an MP4 file, which covers most audiobooks. Files using ALAC or AC-3 audio, and unreadable files, are skipped.

## Running it

You need [Node.js](https://nodejs.org/) (which includes npm).

```sh
npm install
npm start          # build and run the app
npm run dev-start  # development mode: the app reloads or restarts automatically when you save
```

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Type-checks, then builds main, preload and the page with [electron-vite](https://electron-vite.org/) into `out/` |
| `npm run typecheck` | Type-checks all the code with `tsc`, without building |
| `npm run lint` | Checks the code with ESLint |
| `npm run format` | Fixes the style issues ESLint can fix |
| `npm test` | Compiles and runs the unit tests in `test/` |
| `npm run test-media` | Generates test audiobooks into `test-media/` (needs [ffmpeg](https://ffmpeg.org/) on your `PATH`). Add `-- --long` for a 10-hour book |

VS Code sets `ELECTRON_RUN_AS_NODE=1` in its terminals, which stops Electron from starting as an app. `npm start` and `npm run dev-start` remove it for you. If you run `electron .` yourself, clear it first (in PowerShell: `Remove-Item Env:ELECTRON_RUN_AS_NODE`).

## How it's put together

```
src/
  main/      Electron main process: library scanning, file dialogs, IPC handlers, audio streaming, saved state
  preload/   Exposes a small, typed API to the page
  renderer/  React user interface
  shared/    Types and pure logic used by both sides
test/        Unit tests
scripts/     Test-media generator
docs/        Project plan
```

The user interface has no access to Node or the file system. It asks the main process for things through a typed API (`src/shared/api.ts`) and refers to books by ID, never by file path. Audio and cover art reach the page through a custom `morgiobooks://` URL scheme, which only serves books that are already in the library. Audio is streamed with support for HTTP range requests, so seeking jumps straight to the right part of the file.

The app saves its state as JSON files in `%APPDATA%\Morgiobooks`: the folders and files you added (`library.json`), your position in each book (`progress.json`) and the window's size and position (`window.json`). Delete a file to reset that part. A file that can't be read is renamed to `<name>.corrupt` and the app starts without it.

The milestones and design decisions are in [docs/plan.md](docs/plan.md).
