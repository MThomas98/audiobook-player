import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { FolderContents } from "../shared/api";

let selectedFolder: FolderContents | null = null;

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
    ipcMain.handle("select-folder", async (): Promise<null | FolderContents> =>
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
    });

    console.log(process.version);
    createWindow();
});
