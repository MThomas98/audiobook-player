import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { getChapterAt, getChapterIndexAt, getChapterPosition, getChapterProgress, getCurrentChapter } from "../src/shared/chapter";

import type { Chapter, Seconds } from "../src/shared/types";

// A 300-second book with three chapters of different lengths.
const chapters: readonly Chapter[] = [
    { title: "One", start: 0, end: 60 },
    { title: "Two", start: 60, end: 150 },
    { title: "Three", start: 150, end: 300 },
];

// Position and the index of the chapter it falls in (-1 for none).
const cases: [Seconds, number][] = [
    // Inside a chapter
    [0, 0],
    [30, 0],
    [100, 1],
    [200, 2],

    // A chapter's start belongs to it, its end belongs to the next one
    [59.999, 0],
    [60, 1],
    [149.999, 1],
    [150, 2],
    [299.999, 2],

    // Outside the book: exactly at the end counts as no chapter
    [300, -1],
    [1000, -1],
    [-1, -1],
];

describe("getChapterIndexAt", () =>
{
    for (const [position, expected] of cases)
    {
        it(`finds index ${expected} at ${position}`, () =>
        {
            assert.equal(getChapterIndexAt(chapters, position), expected);
        });
    }

    it("returns -1 for a book without chapters", () =>
    {
        assert.equal(getChapterIndexAt([], 0), -1);
    });
});

describe("getChapterAt", () =>
{
    for (const [position, expected] of cases)
    {
        const title = expected !== -1 ? chapters[expected].title : "undefined";
        it(`finds ${title} at ${position}`, () =>
        {
            // Strict equal on objects compares identity: it must be the chapter from the array, not a copy.
            assert.equal(getChapterAt(chapters, position), expected !== -1 ? chapters[expected] : undefined);
        });
    }

    it("returns undefined for a book without chapters", () =>
    {
        assert.equal(getChapterAt([], 0), undefined);
    });
});

describe("getCurrentChapter", () =>
{
    it("finds the chapter inside the book", () =>
    {
        assert.equal(getCurrentChapter(chapters, 100), chapters[1]);
    });

    it("gives the last chapter at exactly the end of the book", () =>
    {
        assert.equal(getCurrentChapter(chapters, 300), chapters[2]);
    });

    it("gives the last chapter after the end of the book", () =>
    {
        assert.equal(getCurrentChapter(chapters, 1000), chapters[2]);
    });

    it("returns undefined before the first chapter", () =>
    {
        assert.equal(getCurrentChapter(chapters, -1), undefined);
    });

    it("returns undefined for a book without chapters", () =>
    {
        assert.equal(getCurrentChapter([], 0), undefined);
    });
});

// Progress through chapter "Two" (60-150, 90 seconds long).
const progressCases: [Seconds, number][] = [
    // Before the chapter: nothing played
    [0, 0],
    [59.999, 0],

    // Inside the chapter
    [60, 0],
    [105, 0.5],
    [87, 0.3],

    // At or after its end: fully played
    [150, 1],
    [1000, 1],
];

describe("getChapterProgress", () =>
{
    for (const [position, expected] of progressCases)
    {
        it(`is ${expected} at ${position}`, () =>
        {
            assert.equal(getChapterProgress(chapters[1], position), expected);
        });
    }

    // Two chapters starting at the same time leave one with no length.
    describe("zero-length chapter", () =>
    {
        const empty: Chapter = { title: "Empty", start: 60, end: 60 };

        it("is 0 before it", () =>
        {
            assert.equal(getChapterProgress(empty, 59), 0);
        });

        it("is 1 at its start", () =>
        {
            assert.equal(getChapterProgress(empty, 60), 1);
        });

        it("is 1 after it", () =>
        {
            assert.equal(getChapterProgress(empty, 61), 1);
        });
    });
});

// Time into chapter "Two" (60-150, 90 seconds long).
const positionCases: [Seconds, Seconds][] = [
    // Inside the chapter
    [60, 0],
    [87, 27],
    [149.5, 89.5],

    // At or after its end: clamped to the chapter's length
    [150, 90],
    [1000, 90],
];

describe("getChapterPosition", () =>
{
    for (const [position, expected] of positionCases)
    {
        it(`is ${expected} at ${position}`, () =>
        {
            assert.equal(getChapterPosition(chapters[1], position), expected);
        });
    }

    it("is 0 for a zero-length chapter", () =>
    {
        assert.equal(getChapterPosition({ title: "Empty", start: 60, end: 60 }, 60), 0);
    });
});
