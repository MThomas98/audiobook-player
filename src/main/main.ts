import { app, dialog, ipcMain } from "electron";
import { join } from "node:path";

import { expectString, expectProgress } from "./checkers";
import { addFileToLibrary, addFolderToLibrary, getLibrary, loadLibrarySources, saveLibrarySources } from "./library";
import { handleScheme, registerScheme } from "./protocol";
import { createWindow } from "./window";

import type { Progress, Library } from "../shared/types";
import type { Api } from "../shared/api";

function librarySavePath(): string
{
    return join(app.getPath("userData"), "library.json");
}

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

    await saveLibrarySources(librarySavePath())
        .catch(err => console.error(`Failed to save library: ${err}`));

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

    await saveLibrarySources(librarySavePath())
        .catch(err => console.error(`Failed to save library: ${err}`));

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

registerScheme();

app.whenReady().then(async () =>
{
    for (const [channel, handler] of Object.entries(handlers))
    {
        ipcMain.handle(channel, (_event, ...args: unknown[]) => handler(...args));
    }

    handleScheme();

    try
    {
        await loadLibrarySources(librarySavePath());
    }
    catch (err)
    {
        console.error(`Failed to load library: ${err}`);
    }

    await createWindow();
}).catch(err => console.error(`Error occurred when loading app: ${err}`));
