import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { formatTime } from "../src/shared/time";

import type { Seconds } from "../src/shared/types";

const cases: [Seconds, string][] = [
    // Under a minute
    [0, "0:00"],
    [5, "0:05"],
    [59, "0:59"],

    // Fractions are floored, never rounded up
    [0.4, "0:00"],
    [59.999, "0:59"],
    [65.9, "1:05"],

    // Minutes, without hours
    [60, "1:00"],
    [599, "9:59"],
    [600, "10:00"],
    [3599, "59:59"],

    // Hours, with minutes padded to two digits
    [3600, "1:00:00"],
    [3725, "1:02:05"],
    [36000, "10:00:00"],
];

describe("formatTime", () =>
{
    for (const [seconds, expected] of cases)
    {
        it(`formats ${seconds}`, () =>
        {
            assert.equal(formatTime(seconds), expected);
        });
    }
});
