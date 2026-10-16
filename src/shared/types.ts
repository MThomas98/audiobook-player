export type Seconds = number;

export interface Chapter
{
    title: string;
    start: Seconds;
    end: Seconds;
}

export type BookID = string;

export interface Book
{
    id: BookID;
    filePath: string;
    title: string;
    author?: string;
    duration: Seconds;
    chapters: readonly Chapter[];
    hasCover: boolean;
}

export type Library = Map<BookID, Book>;

export interface Progress
{
    bookId: string;
    position: Seconds;
    updatedAt: number;
}
