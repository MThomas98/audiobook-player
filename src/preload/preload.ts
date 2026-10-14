import { contextBridge, ipcRenderer } from "electron";
import type { Api, FolderContents } from "../shared/api.js";

const api: Api = {
    selectFolder: (): Promise<FolderContents | null> => ipcRenderer.invoke("select-folder"),
};

contextBridge.exposeInMainWorld("api", api);
