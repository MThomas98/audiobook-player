import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { addFileToLibrary, addFolderToLibrary, bookExists, findAudiobookFiles, getCoverImage, getLibrary, saveLibrarySources } from "../src/main/library";
import { BOOK_LENGTH, hasFfmpeg, makeBook, makeBookWithChapters, makeBookWithCover, makeUnplayableBook } from "./media";

import type { Book } from "../src/shared/types";

// The library is module state shared by every test in this file (each test file runs in its own process),
// so these tests only check the books they add. Loading a saved library is in libraryLoad.test.ts.

function findBook(filePath: string): Book | undefined
{
    return [...getLibrary().values()].find(book => book.filePath === resolve(filePath));
}

function assertAbout(actual: number, expected: number, tolerance: number = 0.1): void
{
    assert.ok(Math.abs(actual - expected) <= tolerance, `expected about ${expected}, got ${actual}`);
}

describe("library", () =>
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

    describe("findAudiobookFiles", () =>
    {
        it("finds MP4 files in the folder and its subfolders", async () =>
        {
            const root = join(dir, "find");
            await mkdir(join(root, "Nested"), { recursive: true });
            await mkdir(join(root, "folder.m4b"));
            for (const name of ["a.mp4", "b.m4a", "c.m4b", join("Nested", "d.m4b"), "notes.txt", "cover.jpg"])
            {
                await writeFile(join(root, name), "");
            }

            const files = await findAudiobookFiles(root);
            assert.deepEqual(files.sort(), [
                join(root, "Nested", "d.m4b"),
                join(root, "a.mp4"),
                join(root, "b.m4a"),
                join(root, "c.m4b"),
            ]);
        });

        it("matches extensions in any case", async () =>
        {
            const root = join(dir, "findCase");
            await mkdir(root);
            await writeFile(join(root, "LOUD.M4B"), "");

            assert.deepEqual(await findAudiobookFiles(root), [join(root, "LOUD.M4B")]);
        });

        it("returns nothing for an empty folder", async () =>
        {
            const root = join(dir, "findEmpty");
            await mkdir(root);

            assert.deepEqual(await findAudiobookFiles(root), []);
        });

        it("rejects for a missing folder", async () =>
        {
            await assert.rejects(findAudiobookFiles(join(dir, "noSuchFolder")), { code: "ENOENT" });
        });
    });

    describe("addFileToLibrary", () =>
    {
        it("rejects a file that isn't an MP4 and doesn't add it", async () =>
        {
            const path = join(dir, "not-audio.m4b");
            await writeFile(path, "This is not an MP4 file.\n");

            await assert.rejects(addFileToLibrary(path));
            assert.equal(findBook(path), undefined);
        });

        describe("with real books", { skip: !hasFfmpeg && "ffmpeg not on PATH" }, () =>
        {
            let books: string;

            before(async () =>
            {
                books = join(dir, "addFile");
                await mkdir(books);
            });

            it("reads the title, author, duration and chapters", async () =>
            {
                const path = await makeBookWithChapters(books, "with-chapters.m4b");
                await addFileToLibrary(path);

                const book = findBook(path);
                assert.ok(book);
                assert.equal(book.title, "Test Book");
                assert.equal(book.author, "Test Author");
                assertAbout(book.duration, BOOK_LENGTH);

                assert.deepEqual(book.chapters.map(chapter => chapter.title), ["Opening", "Middle", "Ending"]);
                assertAbout(book.chapters[0].start, 0);
                assertAbout(book.chapters[1].start, 1);
                assertAbout(book.chapters[2].start, 2);
                // Each chapter ends where the next one starts, and the last one at the end of the book.
                assert.equal(book.chapters[0].end, book.chapters[1].start);
                assert.equal(book.chapters[1].end, book.chapters[2].start);
                assert.equal(book.chapters[2].end, book.duration);
            });

            it("names a book without tags after its file, with one chapter for the whole book", async () =>
            {
                const path = makeBook(books, "No Tags.m4a");
                await addFileToLibrary(path);

                const book = findBook(path);
                assert.ok(book);
                assert.equal(book.title, "No Tags");
                assert.equal(book.author, undefined);
                assert.deepEqual(book.chapters, [{ title: "No Tags", start: 0, end: book.duration }]);
            });

            it("gives the book a normalized ID that bookExists knows", async () =>
            {
                const path = makeBook(books, "Mixed Case.m4b");
                const library = await addFileToLibrary(path);

                const book = findBook(path);
                assert.ok(book);
                assert.equal(book.id, book.id.toLowerCase());
                assert.ok(!book.id.includes("\\"));
                assert.equal(library.get(book.id), book);
                assert.ok(bookExists(book.id));
            });

            it("returns the whole library", async () =>
            {
                const path = makeBook(books, "returned.m4b");
                const library = await addFileToLibrary(path);

                assert.equal(library, getLibrary());
            });

            it("doesn't add the same file twice", async () =>
            {
                const path = makeBook(books, "twice.m4b");
                await addFileToLibrary(path);
                const size = getLibrary().size;

                await addFileToLibrary(path);
                assert.equal(getLibrary().size, size);
            });

            it("keeps a JPEG cover", async () =>
            {
                const path = makeBookWithCover(books, "with-cover.m4b");
                await addFileToLibrary(path);

                const book = findBook(path);
                assert.ok(book);
                assert.equal(book.hasCover, true);
                assert.equal(getCoverImage(book.id)?.format, "image/jpeg");
            });

            it("has no cover for a book without one", async () =>
            {
                const path = makeBook(books, "no-cover.m4b");
                await addFileToLibrary(path);

                const book = findBook(path);
                assert.ok(book);
                assert.equal(book.hasCover, false);
                assert.equal(getCoverImage(book.id), undefined);
            });

            it("rejects a book with a codec that can't be played", async () =>
            {
                const path = makeUnplayableBook(books, "unplayable.mp4");

                await assert.rejects(addFileToLibrary(path), /unsupported codec/);
                assert.equal(findBook(path), undefined);
            });
        });
    });

    describe("addFolderToLibrary", { skip: !hasFfmpeg && "ffmpeg not on PATH" }, () =>
    {
        it("adds the playable books in the folder and its subfolders, skipping the rest", async (t) =>
        {
            const shelf = join(dir, "addFolder");
            await mkdir(join(shelf, "Nested"), { recursive: true });
            const one = makeBook(shelf, "one.m4b");
            const two = makeBook(join(shelf, "Nested"), "two.mp4");
            const unplayable = makeUnplayableBook(shelf, "unplayable.mp4");
            const broken = join(shelf, "broken.m4b");
            await writeFile(broken, "This is not an MP4 file.\n");

            // Skipped files are logged; keep that out of the test output.
            const consoleError = t.mock.method(console, "error", () => {});

            await addFolderToLibrary(shelf);

            assert.ok(findBook(one));
            assert.ok(findBook(two));
            assert.equal(findBook(unplayable), undefined);
            assert.equal(findBook(broken), undefined);
            assert.equal(consoleError.mock.callCount(), 2);
        });
    });

    describe("saveLibrarySources", { skip: !hasFfmpeg && "ffmpeg not on PATH" }, () =>
    {
        let sources: string[];
        let shelf: string;
        let inShelf: string;
        let single: string;
        let notASource: string;

        before(async () =>
        {
            const root = join(dir, "sources");
            shelf = join(root, "shelf");
            await mkdir(shelf, { recursive: true });
            inShelf = makeBook(shelf, "in-shelf.m4b");
            single = makeBook(root, "single.m4b");
            notASource = makeBook(root, "not-a-source.m4b");

            await addFolderToLibrary(shelf);
            await addFileToLibrary(inShelf);
            await addFileToLibrary(single);
            await addFileToLibrary(notASource, false);

            const path = join(root, "library.json");
            await saveLibrarySources(path);
            sources = JSON.parse(await readFile(path, "utf8")) as string[];
        });

        it("saves added folders and files as absolute paths", () =>
        {
            assert.ok(sources.includes(resolve(shelf)));
            assert.ok(sources.includes(resolve(single)));
        });

        it("doesn't save a file that was already added through a folder", () =>
        {
            assert.ok(!sources.includes(resolve(inShelf)));
        });

        it("doesn't save a file added with addSource = false", () =>
        {
            assert.ok(!sources.includes(resolve(notASource)));
        });
    });
});
