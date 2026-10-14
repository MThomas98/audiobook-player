import { contextBridge, ipcRenderer } from "electron";
import type { Api } from "../shared/api.js";

const api: Api = {
    selectFolder: (): Promise<string | null> => ipcRenderer.invoke("select-folder"),
};

contextBridge.exposeInMainWorld("api", api);
