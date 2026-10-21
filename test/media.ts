// Generates small audiobooks for tests with ffmpeg (like scripts/make-test-media.mjs, but tiny and into a given folder).
// Tests that need real MP4 files skip themselves when ffmpeg isn't on PATH.
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { Seconds } from "../src/shared/types";

export const BOOK_LENGTH: Seconds = 3;

export const CHAPTERS_METADATA = `;FFMETADATA1
title=Test Book
artist=Test Author

[CHAPTER]
TIMEBASE=1/1000
START=0
END=1000
title=Opening

[CHAPTER]
TIMEBASE=1/1000
START=1000
END=2000
title=Middle

[CHAPTER]
TIMEBASE=1/1000
START=2000
END=3000
title=Ending
`;

function checkFfmpeg(): boolean
{
    try
    {
        execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
        return true;
    }
    catch
    {
        return false;
    }
}

export const hasFfmpeg = checkFfmpeg();

function ffmpeg(dir: string, ...args: string[]): void
{
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { cwd: dir, stdio: "ignore" });
}

function sine(seconds: Seconds): string[]
{
    return ["-f", "lavfi", "-i", `sine=frequency=440:duration=${seconds}`];
}

// AAC with no tags and no chapters.
export function makeBook(dir: string, name: string): string
{
    ffmpeg(dir, ...sine(BOOK_LENGTH), "-c:a", "aac", name);
    return join(dir, name);
}

// AAC with a title, an artist and three chapters (CHAPTERS_METADATA).
export async function makeBookWithChapters(dir: string, name: string): Promise<string>
{
    await writeFile(join(dir, "chapters.txt"), CHAPTERS_METADATA);
    ffmpeg(dir, ...sine(BOOK_LENGTH), "-i", "chapters.txt", "-map_metadata", "1", "-map_chapters", "1", "-c:a", "aac", name);
    return join(dir, name);
}

// AAC with an attached JPEG cover.
export function makeBookWithCover(dir: string, name: string): string
{
    ffmpeg(dir, "-f", "lavfi", "-i", "testsrc=size=64x64", "-frames:v", "1", "cover.jpg");
    ffmpeg(dir, ...sine(BOOK_LENGTH), "-i", "cover.jpg", "-map", "0:a", "-map", "1:v",
        "-c:a", "aac", "-c:v", "copy", "-disposition:v", "attached_pic", name);
    return join(dir, name);
}

// AC-3 audio in an MP4: a valid file the player can't play.
export function makeUnplayableBook(dir: string, name: string): string
{
    ffmpeg(dir, ...sine(BOOK_LENGTH), "-c:a", "ac3", name);
    return join(dir, name);
}
