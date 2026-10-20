import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { loadJson, saveJson } from "../src/main/jsonStore";

interface Point
{
    x: number;
    y: number;
}

function expectPoint(value: unknown): Point
{
    if (typeof value !== "object" || value === null ||
        !("x" in value) || typeof value.x !== "number" ||
        !("y" in value) || typeof value.y !== "number")
    {
        throw new Error("Not a Point");
    }

    return { x: value.x, y: value.y };
}

describe("jsonStore", () =>
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

    describe("saveJson", () =>
    {
        it("writes data that loadJson reads back", async () =>
        {
            const path = join(dir, "roundTrip.json");
            await saveJson(path, { x: 1, y: 2 });
            assert.deepEqual(await loadJson(path, expectPoint), { x: 1, y: 2 });
        });

        it("replaces an existing file", async () =>
        {
            const path = join(dir, "replace.json");
            await saveJson(path, { x: 1, y: 2 });
            await saveJson(path, { x: 3, y: 4 });
            assert.deepEqual(await loadJson(path, expectPoint), { x: 3, y: 4 });
        });

        it("leaves no temp file behind", async () =>
        {
            const subDir = join(dir, "noTemp");
            await mkdir(subDir);
            await saveJson(join(subDir, "data.json"), { x: 1, y: 2 });
            assert.deepEqual(await readdir(subDir), ["data.json"]);
        });

        it("writes plain JSON", async () =>
        {
            const path = join(dir, "plain.json");
            await saveJson(path, [1, "two", null]);
            assert.deepEqual(JSON.parse(await readFile(path, "utf8")), [1, "two", null]);
        });

        it("runs overlapping saves to one file in call order", async () =>
        {
            const subDir = join(dir, "overlapping");
            await mkdir(subDir);
            const path = join(subDir, "data.json");

            const finished: number[] = [];
            const saves = [1, 2, 3].map(async (x) =>
            {
                await saveJson(path, { x, y: 0 });
                finished.push(x);
            });
            await Promise.all(saves);

            assert.deepEqual(finished, [1, 2, 3]);
            assert.deepEqual(await loadJson(path, expectPoint), { x: 3, y: 0 });
            assert.deepEqual(await readdir(subDir), ["data.json"]);
        });

        it("rejects when the write fails", async () =>
        {
            const path = join(dir, "noSuchFolder", "data.json");
            await assert.rejects(saveJson(path, { x: 1, y: 2 }), { code: "ENOENT" });
        });

        it("keeps saving to a file after a failed save", async () =>
        {
            const subDir = join(dir, "recovers");
            const path = join(subDir, "data.json");

            // Fails because the folder doesn't exist yet.
            await saveJson(path, { x: 1, y: 2 }).catch(() => {});

            await mkdir(subDir);
            await saveJson(path, { x: 3, y: 4 });
            assert.deepEqual(await loadJson(path, expectPoint), { x: 3, y: 4 });
        });
    });

    describe("loadJson", () =>
    {
        it("returns null for a missing file without calling decode", async () =>
        {
            let decodeCalled = false;
            const result = await loadJson(join(dir, "missing.json"), (value) =>
            {
                decodeCalled = true;
                return value;
            });
            assert.equal(result, null);
            assert.equal(decodeCalled, false);
        });

        it("returns what decode returns", async () =>
        {
            const path = join(dir, "decoded.json");
            await writeFile(path, JSON.stringify({ x: 1, y: 2, extra: "dropped" }));
            assert.deepEqual(await loadJson(path, expectPoint), { x: 1, y: 2 });
        });

        it("throws on invalid JSON", async () =>
        {
            const path = join(dir, "invalid.json");
            await writeFile(path, "{ not json");
            await assert.rejects(loadJson(path, expectPoint), SyntaxError);
        });

        it("throws on an empty file", async () =>
        {
            const path = join(dir, "empty.json");
            await writeFile(path, "");
            await assert.rejects(loadJson(path, expectPoint), SyntaxError);
        });

        it("passes on decode's error for the wrong shape", async () =>
        {
            const path = join(dir, "wrongShape.json");
            await writeFile(path, JSON.stringify({ x: "1", y: 2 }));
            await assert.rejects(loadJson(path, expectPoint), { message: "Not a Point" });
        });

        it("rethrows read errors other than a missing file", async () =>
        {
            const subDir = join(dir, "isADirectory");
            await mkdir(subDir);
            await assert.rejects(loadJson(subDir, expectPoint), { code: "EISDIR" });
        });

        it("moves a file with invalid JSON aside to <path>.corrupt", async () =>
        {
            const subDir = join(dir, "corruptJson");
            await mkdir(subDir);
            const path = join(subDir, "data.json");
            await writeFile(path, "{ not json");

            await assert.rejects(loadJson(path, expectPoint), SyntaxError);
            assert.deepEqual(await readdir(subDir), ["data.json.corrupt"]);
            assert.equal(await readFile(`${path}.corrupt`, "utf8"), "{ not json");
        });

        it("moves a file decode rejects aside to <path>.corrupt", async () =>
        {
            const subDir = join(dir, "corruptShape");
            await mkdir(subDir);
            const path = join(subDir, "data.json");
            const contents = JSON.stringify({ x: "1", y: 2 });
            await writeFile(path, contents);

            await assert.rejects(loadJson(path, expectPoint), { message: "Not a Point" });
            assert.deepEqual(await readdir(subDir), ["data.json.corrupt"]);
            assert.equal(await readFile(`${path}.corrupt`, "utf8"), contents);
        });

        it("keeps the corrupt file when a later save starts a fresh one", async () =>
        {
            const subDir = join(dir, "freshAfterCorrupt");
            await mkdir(subDir);
            const path = join(subDir, "data.json");
            await writeFile(path, "{ not json");

            await assert.rejects(loadJson(path, expectPoint), SyntaxError);
            await saveJson(path, { x: 1, y: 2 });

            assert.deepEqual(await loadJson(path, expectPoint), { x: 1, y: 2 });
            assert.deepEqual((await readdir(subDir)).sort(), ["data.json", "data.json.corrupt"]);
            assert.equal(await readFile(`${path}.corrupt`, "utf8"), "{ not json");
        });

        it("doesn't move a file it couldn't read", async () =>
        {
            const subDir = join(dir, "unreadable");
            await mkdir(subDir);
            // A folder named like the file: reading it fails with EISDIR, so its contents are never parsed.
            await mkdir(join(subDir, "data.json"));

            await assert.rejects(loadJson(join(subDir, "data.json"), expectPoint), { code: "EISDIR" });
            assert.deepEqual(await readdir(subDir), ["data.json"]);
        });

        it("creates no .corrupt file for a missing file", async () =>
        {
            const subDir = join(dir, "missingNoCorrupt");
            await mkdir(subDir);

            assert.equal(await loadJson(join(subDir, "data.json"), expectPoint), null);
            assert.deepEqual(await readdir(subDir), []);
        });
    });
});
