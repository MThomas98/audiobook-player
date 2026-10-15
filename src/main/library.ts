import { readdir } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { type IPicture, parseFile, selectCover, type IChapter } from "music-metadata";

import type { Book, BookID, Chapter, Seconds } from "../shared/types";

const AUDIOBOOK_EXT: ReadonlySet<string> = new Set([".mp4", ".m4a", ".m4b"]);
const PLAYABLE_CODECS: ReadonlySet<string> = new Set(["MPEG-4/AAC", "MPEG-1 layer 3"]);

function createBookID(filePath: string): BookID
{
    return resolve(filePath).toLowerCase().replaceAll("\\", "/");
}

function createChapters(rawChapters: readonly IChapter[] | undefined, duration: Seconds, bookTitle: string): Chapter[]
{
    if (rawChapters === undefined || rawChapters.length === 0 ||
        rawChapters.some(chapter => !chapter.timeScale))
    {
        return [{
            title: bookTitle,
            start: 0,
            end: duration,
        }];
    }

    // timescale shouldn't be undefined, as that's checked above
    // divide by 1 shouldn't be reached, just there to stop TypeScript complaining
    const starts = rawChapters.map(chapter => chapter.start / (chapter.timeScale ?? 1));

    return rawChapters.map((rawChapter, index) => ({
        title: rawChapter.title || `Chapter ${index + 1}`,
        start: starts[index],
        end: starts[index + 1] ?? duration,
    }));
}

function createCoverDataUrl(rawPicture: IPicture[] | undefined): string | undefined
{
    const cover = selectCover(rawPicture);
    if (cover === null)
    {
        return undefined;
    }

    return `data:${cover.format};base64,${Buffer.from(cover.data).toString("base64")}`;
}

function checkPlayable(codecs: string | undefined): boolean
{
    const codecArray = codecs?.split("+") ?? [];
    return codecArray.some(codec => PLAYABLE_CODECS.has(codec));
}

export async function findAudiobookFiles(rootFolder: string): Promise<string[]>
{
    const entries = await readdir(rootFolder, { recursive: true, withFileTypes: true });

    return entries
        .filter(entry => entry.isFile() && AUDIOBOOK_EXT.has(extname(entry.name).toLowerCase()))
        .map(entry => join(entry.parentPath, entry.name));
}

export async function constructBookFromFile(filePath: string): Promise<[BookID, Book]>
{
    const metadata = await parseFile(filePath, { includeChapters: true });

    if (!checkPlayable(metadata.format.codec))
    {
        throw new Error(`Audiobook "${filePath}" has unsupported codec "${metadata.format.codec}"`);
    }

    const bookId = createBookID(filePath);
    const book: Book = {
        id: bookId,
        filePath: resolve(filePath),
        title: metadata.common.title ?? basename(filePath, extname(filePath)),
        duration: metadata.format.duration ?? 0,
        author: metadata.common.artist,
        chapters: [],
        coverDataUrl: createCoverDataUrl(metadata.common.picture),
    };
    book.chapters = createChapters(metadata.format.chapters, book.duration, book.title);

    return [bookId, book];
}

export async function constructBooksFromFolder(rootFolder: string): Promise<[BookID, Book][]>
{
    const books: [BookID, Book][] = [];

    const files = await findAudiobookFiles(rootFolder);
    for (const file of files)
    {
        try
        {
            books.push(await constructBookFromFile(file));
        }
        catch (err)
        {
            console.error(`Failed to read audiobook at "${file}": ${err}`);
        }
    }

    return books;
}
