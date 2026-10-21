import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { addFileToLibrary, getLibrary } from "../src/main/library";
import { getProgress, loadProgresses, saveProgress } from "../src/main/progress";
import { hasFfmpeg, makeBook } from "./media";

import type { BookID, Progress } from "../src/shared/types";

// saveProgress only accepts books in the library, so these tests add a real book first.
// The saved progress is module state shared by every test in this file.

const UNKNOWN_BOOK: BookID = "c:/not/in/the/library.m4b";

describe("progress", { skip: !hasFfmpeg && "ffmpeg not on PATH" }, () =>
{
    let dir: string;
    let bookId: BookID;
    let otherBookId: BookID;

    before(async () =>
    {
        dir = await mkdtemp(join(tmpdir(), "morgiobooks-test-"));
        await addFileToLibrary(makeBook(dir, "book.m4b"));
        await addFileToLibrary(makeBook(dir, "other.m4b"));
        [bookId, otherBookId] = [...getLibrary().keys()];
    });

    after(async () =>
    {
        await rm(dir, { recursive: true, force: true });
    });

    async function readSaved(path: string): Promise<Progress[]>
    {
        return JSON.parse(await readFile(path, "utf8")) as Progress[];
    }

    describe("getProgress", () =>
    {
        it("returns undefined for a book with no saved progress", () =>
        {
            assert.equal(getProgress(UNKNOWN_BOOK), undefined);
        });
    });

    describe("saveProgress", () =>
    {
        it("stores progress that getProgress returns", async () =>
        {
            const progress: Progress = { bookId, position: 12 };
            await saveProgress(progress, join(dir, "stores.json"));

            assert.deepEqual(getProgress(bookId), progress);
        });

        it("writes the progress of every book to the file", async () =>
        {
            const path = join(dir, "everyBook.json");
            await saveProgress({ bookId, position: 1 }, path);
            await saveProgress({ bookId: otherBookId, position: 2 }, path);

            const saved = await readSaved(path);
            assert.deepEqual(saved.sort((a, b) => a.position - b.position), [
                { bookId, position: 1 },
                { bookId: otherBookId, position: 2 },
            ]);
        });

        it("replaces the earlier progress for the same book", async () =>
        {
            const path = join(dir, "replaces.json");
            await saveProgress({ bookId, position: 5 }, path);
            await saveProgress({ bookId, position: 6 }, path);

            assert.deepEqual(getProgress(bookId), { bookId, position: 6 });
            const saved = await readSaved(path);
            assert.deepEqual(saved.filter(progress => progress.bookId === bookId), [{ bookId, position: 6 }]);
        });

        it("rejects a book that isn't in the library, without storing or writing anything", async () =>
        {
            const root = join(dir, "unknown");
            await mkdir(root);

            await assert.rejects(saveProgress({ bookId: UNKNOWN_BOOK, position: 1 }, join(root, "progress.json")), /unknown book id/);
            assert.equal(getProgress(UNKNOWN_BOOK), undefined);
            assert.deepEqual(await readdir(root), []);
        });
    });

    describe("loadProgresses", () =>
    {
        it("does nothing for a missing file", async () =>
        {
            const previous = getProgress(bookId);
            await loadProgresses(join(dir, "missing.json"));

            assert.deepEqual(getProgress(bookId), previous);
        });

        it("restores saved progress", async () =>
        {
            const path = join(dir, "restores.json");
            await writeFile(path, JSON.stringify([{ bookId, position: 42 }, { bookId: otherBookId, position: 43 }]));
            await loadProgresses(path);

            assert.deepEqual(getProgress(bookId), { bookId, position: 42 });
            assert.deepEqual(getProgress(otherBookId), { bookId: otherBookId, position: 43 });
        });

        // E.g. a book on a drive that isn't plugged in: its progress must survive until the drive is back.
        it("keeps progress for a book that isn't in the library, also through later saves", async () =>
        {
            const unplugged: BookID = "e:/unplugged/book.m4b";
            const path = join(dir, "keeps.json");
            await writeFile(path, JSON.stringify([{ bookId: unplugged, position: 1 }, { bookId, position: 50 }]));
            await loadProgresses(path);

            assert.deepEqual(getProgress(unplugged), { bookId: unplugged, position: 1 });
            assert.deepEqual(getProgress(bookId), { bookId, position: 50 });

            await saveProgress({ bookId, position: 51 }, path);
            const saved = await readSaved(path);
            assert.deepEqual(saved.find(progress => progress.bookId === unplugged), { bookId: unplugged, position: 1 });
        });

        it("rejects the whole file if one entry is invalid, and moves it aside", async () =>
        {
            const root = join(dir, "invalid");
            await mkdir(root);
            const path = join(root, "progress.json");
            const previous = getProgress(bookId);
            await writeFile(path, JSON.stringify([{ bookId: otherBookId, position: 99 }, { bookId, position: -1 }]));

            await assert.rejects(loadProgresses(path));
            assert.deepEqual(await readdir(root), ["progress.json.corrupt"]);
            assert.deepEqual(getProgress(bookId), previous);
            assert.notDeepEqual(getProgress(otherBookId), { bookId: otherBookId, position: 99 });
        });
    });
});
