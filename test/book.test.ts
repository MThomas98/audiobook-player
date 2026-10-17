import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { getChapterAt, getChapterIndexAt } from "../src/shared/book";

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
