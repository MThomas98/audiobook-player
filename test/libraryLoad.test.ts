import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it, mock } from "node:test";
import assert from "node:assert/strict";

import { getLibrary, loadLibrarySources, saveLibrarySources } from "../src/main/library";
import { hasFfmpeg, makeBook } from "./media";

// In its own file (so its own process) to start with an empty library.

describe("loadLibrarySources", () =>
{
    let dir: string;

    before(async () =>
    {
        dir = await mkdtemp(join(tmpdir(), "morgiobooks-test-"));
    });

    after(async () =>
    {
        await rm(dir, { recursive: true, force: true });
    });

    it("does nothing for a missing file", async () =>
    {
        await loadLibrarySources(join(dir, "missing.json"));
        assert.equal(getLibrary().size, 0);
    });

    it("rejects a file that isn't a list of paths and moves it aside", async () =>
    {
        const root = join(dir, "corrupt");
        await mkdir(root);
        const path = join(root, "library.json");
        await writeFile(path, JSON.stringify([1, 2]));

        await assert.rejects(loadLibrarySources(path));
        assert.deepEqual(await readdir(root), ["library.json.corrupt"]);
        assert.equal(getLibrary().size, 0);
    });

    describe("with saved sources", { skip: !hasFfmpeg && "ffmpeg not on PATH" }, () =>
    {
        let shelf: string;
        let inShelf: string;
        let nested: string;
        let single: string;
        let missing: string;
        let consoleError: ReturnType<typeof mock.method>;

        before(async () =>
        {
            const root = join(dir, "saved");
            shelf = join(root, "shelf");
            await mkdir(join(shelf, "Nested"), { recursive: true });
            inShelf = makeBook(shelf, "in-shelf.m4b");
            nested = makeBook(join(shelf, "Nested"), "nested.mp4");
            single = makeBook(root, "single.m4a");
            missing = join(root, "unplugged", "gone.m4b");

            const path = join(root, "library.json");
            await writeFile(path, JSON.stringify([shelf, single, missing]));

            // The missing source is logged; keep that out of the test output.
            consoleError = mock.method(console, "error", () => {});
            try
            {
                await loadLibrarySources(path);
            }
            finally
            {
                consoleError.mock.restore();
            }
        });

        it("adds the books from saved folders and files", () =>
        {
            const filePaths = [...getLibrary().values()].map(book => book.filePath).sort();
            assert.deepEqual(filePaths, [inShelf, nested, single].map(path => resolve(path)).sort());
        });

        it("logs a source it can't read", () =>
        {
            assert.equal(consoleError.mock.callCount(), 1);
            assert.match(String(consoleError.mock.calls[0].arguments[0]), /gone\.m4b/);
        });

        it("keeps every saved source, including one it can't read", async () =>
        {
            const path = join(dir, "saved", "resaved.json");
            await saveLibrarySources(path);

            const sources = JSON.parse(await readFile(path, "utf8")) as string[];
            assert.deepEqual(sources, [shelf, single, missing]);
        });
    });
});
