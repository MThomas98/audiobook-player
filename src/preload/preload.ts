import { contextBridge, ipcRenderer } from "electron";

import type { Api } from "../shared/api.js";

function invoker<C extends keyof Api>(channel: C): (...args: Parameters<Api[C]>) => ReturnType<Api[C]>
{
    return (...args) => ipcRenderer.invoke(channel, ...args) as ReturnType<Api[C]>;
}

const api: Api = {
    addFolderToLibrary: invoker("addFolderToLibrary"),
    addFileToLibrary: invoker("addFileToLibrary"),
    getLibrary: invoker("getLibrary"),

    getProgress: invoker("getProgress"),
    saveProgress: invoker("saveProgress"),
};

contextBridge.exposeInMainWorld("api", api);
