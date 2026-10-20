import { readFile, writeFile, rename } from "node:fs/promises";

const lastWrites = new Map<string, Promise<void>>();

export function saveJson(path: string, data: unknown): Promise<void>
{
    const jsonData = JSON.stringify(data, null, 4);
    const writeJson = async () =>
    {
        const tempPath = `${path}.tmp`;
        await writeFile(tempPath, jsonData, "utf8");
        await rename(tempPath, path);
    };

    const previous = lastWrites.get(path) ?? Promise.resolve();
    const next = previous.then(writeJson);

    // Add a caught version of the promise to the queue so that a failed write doesn't block subsequent writes
    lastWrites.set(path, next.catch(() => {}));

    return next;
}

export async function loadJson<T>(path: string, decode: (value: unknown) => T): Promise<T | null>
{
    let contents: string;
    try
    {
        contents = await readFile(path, "utf8");
    }
    catch (err)
    {
        if (err instanceof Error && "code" in err && err.code === "ENOENT")
        {
            return null;
        }

        throw err;
    }

    const value: unknown = JSON.parse(contents);
    return decode(value);
}
