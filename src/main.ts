import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { join } from "node:path";

function createWindow(): void {
    const window = new BrowserWindow({
        width: 600,
        height: 800,
        webPreferences: {
            preload: join(__dirname, "preload.js"),
        },
    });

    window.loadFile(join(__dirname, "..", "index.html"));
}

app.whenReady().then(() => {
    ipcMain.handle("select-folder", async () => {
        const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
        return result.canceled ? null : result.filePaths[0];
    });

    console.log(process.version);
    createWindow();
});
