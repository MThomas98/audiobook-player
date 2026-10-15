export type Seconds = number;

export interface Chapter
{
    title: string;
    start: Seconds;
    end: Seconds;
}

export interface Book
{
    id: string;
    filePath: string;
    title: string;
    author?: string;
    duration: Seconds;
    chapters: readonly Chapter[];
    coverDataUrl?: string;
}

export interface Progress
{
    bookId: string;
    position: Seconds;
    updatedAt: number;
}

export interface FolderContents
{
    folderPath: string;
    files: string[];
}
