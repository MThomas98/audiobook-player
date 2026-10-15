import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const AUDIOBOOK_EXT: ReadonlySet<string> = new Set([".mp4", ".m4a", ".m4b"]);

export async function findAudiobookFiles(rootFolder: string): Promise<string[]>
{
    const entries = await readdir(rootFolder, { recursive: true, withFileTypes: true });

    return entries
        .filter(entry => entry.isFile() && AUDIOBOOK_EXT.has(extname(entry.name).toLowerCase()))
        .map(entry => join(entry.parentPath, entry.name));
}
