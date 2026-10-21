import type { BookID, Library, Progress } from "./types";

export interface Api
{
    addFolderToLibrary(): Promise<Library>;
    addFileToLibrary(): Promise<Library>;
    getLibrary(): Promise<Library>;

    getProgress(bookId: BookID): Promise<Progress | undefined>;
    saveProgress(progress: Progress): Promise<void>;
}
