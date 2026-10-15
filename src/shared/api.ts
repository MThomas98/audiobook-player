import type { Library, Progress } from "./types";

export interface Api
{
    addFolderToLibrary(): Promise<Library>;
    addFileToLibrary(): Promise<Library>;
    getLibrary(): Promise<Library>;

    getProgress(bookId: string): Promise<Progress | null>;
    saveProgress(progress: Progress): Promise<void>;

}
