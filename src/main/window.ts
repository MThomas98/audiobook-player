import { app, BrowserWindow } from "electron";
import { join } from "node:path";

import { loadJson, saveJson } from "./jsonStore";

const WINDOW_PARAMS_FILE = "window.json";

interface WindowParams
{
    width: number;
    height: number;
    x?: number;
    y?: number;
}

const DEFAULT_WINDOW_PARAMS: WindowParams = {
    width: 600,
    height: 800,
    x: undefined,
    y: undefined,
};

function expectWindowParams(value: unknown): WindowParams
{
    if (typeof value !== "object" || value === null ||
        !("width" in value) || typeof value.width !== "number" ||
        !("height" in value) || typeof value.height !== "number" ||
        !("x" in value) || typeof value.x !== "number" ||
        !("y" in value) || typeof value.y !== "number")
    {
        throw new Error("WindowParams file not in expected format");
    }

    return {
        width: value.width,
        height: value.height,
        x: value.x,
        y: value.y,
    };
}

function windowParamsPath()
{
    return join(app.getPath("userData"), WINDOW_PARAMS_FILE);
}

async function saveBounds(window: BrowserWindow): Promise<void>
{
    const windowParams = window.getNormalBounds() as WindowParams;
    await saveJson(windowParamsPath(), windowParams);
}

export async function createWindow(): Promise<void>
{
    let windowParams = DEFAULT_WINDOW_PARAMS;
    try
    {
        const readParams = await loadJson(windowParamsPath(), expectWindowParams);
        if (readParams !== null)
        {
            windowParams = readParams;
        }
    }
    catch (err)
    {
        console.error(`Failed to read window params, falling back to default: ${err}`);
    }

    const window = new BrowserWindow({
        width: windowParams.width,
        height: windowParams.height,
        x: windowParams.x,
        y: windowParams.y,
        webPreferences: {
            preload: join(__dirname, "..", "preload", "preload.js"),
        },
    });

    window.on("resized", () =>
    {
        saveBounds(window).catch(err => console.error(`Failed to save resized window params: ${err}`));
    });
    window.on("moved", () =>
    {
        saveBounds(window).catch(err => console.error(`Failed to save moved window params: ${err}`));
    });

    const devServerUrl = process.env.ELECTRON_RENDERER_URL;
    if (devServerUrl)
    {
        window.loadURL(devServerUrl)
            .catch(err => console.error(`Failed to load URL ${devServerUrl}: ${err}`));
    }
    else
    {
        window.loadFile(join(__dirname, "..", "renderer", "index.html"))
            .catch(err => console.error(`Failed to load index.html: ${err}`));
    }
}
