import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseFile } from "music-metadata";

import { expectString, expectProgress } from "./typeCheckers";
import { findAudiobookFiles } from "./library";

import type { FolderContents, Progress, Book } from "../shared/types";
import type { Api } from "../shared/api";

let selectedFolder: FolderContents | null = null;

// ==== IPC Handlers ==== ///

async function handleSelectFolder(): Promise<FolderContents | null>
{
    const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    if (result.canceled)
    {
        return null;
    }

    const folderPath = result.filePaths[0];
    const files = await readdir(folderPath);
    selectedFolder = { folderPath, files };

    return selectedFolder;
}

async function handleGetProgress(bookId: string): Promise<Progress | null>
{
    // TODO
    return null;
}

async function handleSaveProgress(progress: Progress): Promise<void>
{
    // TODO
}

async function handleScanFolder(): Promise<Book[]>
{
    if (selectedFolder === null)
    {
        throw new Error("Cannot scan folder as no folder is selected - call window.api.selectFolder() first.");
    }

    const bookFiles = await findAudiobookFiles(selectedFolder.folderPath);

    const books: Book[] = [];
    for (const bookIndex in bookFiles)
    {
        const filePath = bookFiles[bookIndex];
        const metadata = await parseFile(filePath, { includeChapters: true });

        books.push({
            id: bookIndex,
            filePath: filePath,
            title: metadata.common.title ?? basename(filePath),
            chapters: [], // TODO
            duration: metadata.format.duration ?? 0,
            author: metadata.common.artist,
        });
    }

    return books;
}

type Handlers = { [C in keyof Api]: (...args: unknown[]) => ReturnType<Api[C]> };

const handlers: Handlers = {
    selectFolder: handleSelectFolder,
    getProgress: async bookId => handleGetProgress(expectString(bookId, "bookId")),
    saveProgress: async progress => handleSaveProgress(expectProgress(progress, "progress")),
    scanFolder: handleScanFolder,
};

// ======== //

function createWindow(): void
{
    const window = new BrowserWindow({
        width: 600,
        height: 800,
        webPreferences: {
            preload: join(__dirname, "..", "preload", "preload.js"),
        },
    });

    const devServerUrl = process.env.DEV_SERVER_URL;
    if (devServerUrl)
    {
        window.loadURL(devServerUrl);
    }
    else
    {
        window.loadFile(join(__dirname, "..", "page", "index.html"));
    }
}

app.whenReady().then(() =>
{
    for (const [channel, handler] of Object.entries(handlers))
    {
        ipcMain.handle(channel, (_event, ...args: unknown[]) => handler(...args));
    }

    createWindow();
});
