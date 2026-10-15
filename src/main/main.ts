import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { join } from "node:path";

import { expectString, expectProgress } from "./typeCheckers";
import { constructBookFromFile, constructBooksFromFolder } from "./library";

import type { Progress, Library } from "../shared/types";
import type { Api } from "../shared/api";

const library: Library = new Map();

// ==== IPC Handlers ==== ///

async function handleAddFolderToLibrary(): Promise<Library>
{
    const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    if (result.canceled)
    {
        return library;
    }

    const folderPath = result.filePaths[0];
    try
    {
        for (const [bookId, book] of await constructBooksFromFolder(folderPath))
        {
            library.set(bookId, book);
        }
    }
    catch (err)
    {
        console.error(`Failed to read audiobooks in "${folderPath}": ${err}`);
    }

    return library;
}

async function handleAddFileToLibrary(): Promise<Library>
{
    const result = await dialog.showOpenDialog({ properties: ["openFile"] });
    if (result.canceled)
    {
        return library;
    }

    const filePath = result.filePaths[0];
    try
    {
        const [bookId, book] = await constructBookFromFile(filePath);
        library.set(bookId, book);
    }
    catch (err)
    {
        console.error(`Failed to read audiobook at "${filePath}": ${err}`);
    }

    return library;
}

async function handleGetLibrary(): Promise<Library>
{
    return library;
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

type Handlers = { [C in keyof Api]: (...args: unknown[]) => ReturnType<Api[C]> };

const handlers: Handlers = {
    addFolderToLibrary: handleAddFolderToLibrary,
    addFileToLibrary: handleAddFileToLibrary,
    getLibrary: handleGetLibrary,

    getProgress: async bookId => handleGetProgress(expectString(bookId, "bookId")),
    saveProgress: async progress => handleSaveProgress(expectProgress(progress, "progress")),
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
