import { readdir } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { parseFile } from "music-metadata";
import { fileURLToPath } from "node:url";

import { Book } from "../shared/types";

const AUDIOBOOK_EXT: ReadonlySet<string> = new Set([".mp4", ".m4a", ".m4b"]);

function createBookID(filePath: string): string
{
    return resolve(filePath).toLowerCase().replaceAll("\\", "/");
}

export async function findAudiobookFiles(rootFolder: string): Promise<string[]>
{
    const entries = await readdir(rootFolder, { recursive: true, withFileTypes: true });

    return entries
        .filter(entry => entry.isFile() && AUDIOBOOK_EXT.has(extname(entry.name).toLowerCase()))
        .map(entry => join(entry.parentPath, entry.name));
}

export async function constructBookFromFile(filePath: string): Promise<Book>
{
    const metadata = await parseFile(filePath, { includeChapters: true });

    return {
        id: createBookID(filePath),
        filePath: resolve(filePath),
        title: metadata.common.title ?? basename(filePath),
        chapters: [], // TODO
        duration: metadata.format.duration ?? 0,
        author: metadata.common.artist,
    };
}

export async function constructBooksFromFolder(rootFolder: string): Promise<Book[]>
{
    const books: Book[] = [];

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
