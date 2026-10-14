import { contextBridge, ipcRenderer } from "electron";

const api = {
    selectFolder: (): Promise<string | null> => ipcRenderer.invoke("select-folder"),
};

export type Api = typeof api;

contextBridge.exposeInMainWorld("api", api);
