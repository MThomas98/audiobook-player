import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { parseRange, type RangeResult } from "../src/main/range";

// All cases use a file size of 1000 bytes (valid positions 0-999).
const cases: [string | null, RangeResult][] = [
    // No usable header: send the whole file
    [null, { kind: "full" }],
    ["", { kind: "full" }],
    ["items=0-5", { kind: "full" }],
    ["bytes=0-1,5-9", { kind: "full" }],
    ["bytes=-", { kind: "full" }],
    ["bytes=600-500", { kind: "full" }],

    // Start and optional end
    ["bytes=0-", { kind: "partial", start: 0, end: 999 }],
    ["bytes=0-0", { kind: "partial", start: 0, end: 0 }],
    ["bytes=500-599", { kind: "partial", start: 500, end: 599 }],
    ["bytes=500-", { kind: "partial", start: 500, end: 999 }],
    ["bytes=999-", { kind: "partial", start: 999, end: 999 }],
    ["bytes=900-5000", { kind: "partial", start: 900, end: 999 }],

    // Suffix: the last N bytes
    ["bytes=-100", { kind: "partial", start: 900, end: 999 }],
    ["bytes=-1", { kind: "partial", start: 999, end: 999 }],
    ["bytes=-5000", { kind: "partial", start: 0, end: 999 }],

    // Well-formed but outside the file
    ["bytes=1000-", { kind: "unsatisfiable" }],
    ["bytes=5000-6000", { kind: "unsatisfiable" }],
    ["bytes=-0", { kind: "unsatisfiable" }],
    ["bytes=-00", { kind: "unsatisfiable" }],
];

// An empty file has no valid positions, so no range can be satisfied.
const emptyFileCases: [string | null, RangeResult][] = [
    [null, { kind: "full" }],
    ["bytes=0-", { kind: "unsatisfiable" }],
    ["bytes=-100", { kind: "unsatisfiable" }],
];

describe("parseRange", () =>
{
    describe("1000-byte file", () =>
    {
        for (const [header, expected] of cases)
        {
            it(`parses ${JSON.stringify(header)}`, () =>
            {
                assert.deepEqual(parseRange(header, 1000), expected);
            });
        }
    });

    describe("empty file", () =>
    {
        for (const [header, expected] of emptyFileCases)
        {
            it(`parses ${JSON.stringify(header)}`, () =>
            {
                assert.deepEqual(parseRange(header, 0), expected);
            });
        }
    });
});
