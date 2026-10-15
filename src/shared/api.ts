import type { Book, Progress, FolderContents } from "./types";

export interface Api
{
    selectFolder(): Promise<FolderContents | null>;
    scanFolder(): Promise<Book[]>;
    getProgress(bookId: string): Promise<Progress | null>;
    saveProgress(progress: Progress): Promise<void>;
}
