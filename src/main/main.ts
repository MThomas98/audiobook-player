import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { join } from "node:path";

import { expectString, expectProgress } from "./checkers";
import { addFileToLibrary, addFolderToLibrary, getLibrary } from "./library";
import { handleScheme, registerScheme } from "./protocol";

import type { Progress, Library } from "../shared/types";
import type { Api } from "../shared/api";

// ==== IPC Handlers ==== ///

async function handleAddFolderToLibrary(): Promise<Library>
{
    const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    if (!result.canceled)
    {
        const folderPath = result.filePaths[0];
        try
        {
            await addFolderToLibrary(folderPath);
        }
        catch (err)
        {
            console.error(`Failed to read audiobooks in "${folderPath}": ${err}`);
        }
    }

    return getLibrary();
}

async function handleAddFileToLibrary(): Promise<Library>
{
    const result = await dialog.showOpenDialog({ properties: ["openFile"] });
    if (!result.canceled)
    {
        const filePath = result.filePaths[0];
        try
        {
            await addFileToLibrary(filePath);
        }
        catch (err)
        {
            console.error(`Failed to read audiobook at "${filePath}": ${err}`);
        }
    }

    return getLibrary();
}

async function handleGetLibrary(): Promise<Library>
{
    return getLibrary();
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
        window.loadURL(devServerUrl)
            .catch(err => console.error(`Failed to load URL ${devServerUrl}: ${err}`));
    }
    else
    {
        window.loadFile(join(__dirname, "..", "page", "index.html"))
            .catch(err => console.error(`Failed to load index.html: ${err}`));
    }
}

registerScheme();

app.whenReady().then(() =>
{
    for (const [channel, handler] of Object.entries(handlers))
    {
        ipcMain.handle(channel, (_event, ...args: unknown[]) => handler(...args));
    }

    handleScheme();

    createWindow();
}).catch(err => console.error(`Error occurred when loading app: ${err}`));
