// Generates test audiobooks into test-media/ (gitignored). Requires ffmpeg on PATH.
// Usage: npm run test-media [-- --long]   (--long also makes a 10-hour book, ~140 MB)
import process from "node:process";
import console from "node:console";
import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const outDir = join(import.meta.dirname, "..", "test-media");
const includeLong = process.argv.includes("--long");

const chapters = `;FFMETADATA1
title=Test Book
artist=Test Author

[CHAPTER]
TIMEBASE=1/1000
START=0
END=60000
title=Opening

[CHAPTER]
TIMEBASE=1/1000
START=60000
END=180000
title=Middle

[CHAPTER]
TIMEBASE=1/1000
START=180000
END=300000
title=Ending
`;

function ffmpeg(...args)
{
    const result = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { cwd: outDir, stdio: "inherit" });
    if (result.error || result.status !== 0)
    {
        console.error(`ffmpeg failed: ffmpeg ${args.join(" ")}`);
        process.exit(1);
    }
}

function sine(seconds)
{
    return ["-f", "lavfi", "-i", `sine=frequency=440:duration=${seconds}`];
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, "Nested Author"), { recursive: true });
writeFileSync(join(outDir, "chapters.txt"), chapters);

// Cover image, generated so no binary needs committing.
ffmpeg("-f", "lavfi", "-i", "testsrc=size=600x600", "-frames:v", "1", "cover.jpg");

// Playable books
ffmpeg(...sine(300), "-i", "chapters.txt", "-map_metadata", "1", "-map_chapters", "1", "-c:a", "aac", "with-chapters.m4b");
ffmpeg(...sine(300), "-i", "chapters.txt", "-i", "cover.jpg", "-map", "0:a", "-map", "2:v", "-map_metadata", "1", "-map_chapters", "1",
    "-c:a", "aac", "-c:v", "copy", "-disposition:v", "attached_pic", "with-cover.m4b");
ffmpeg(...sine(120), "-c:a", "aac", "no-tags-no-chapters.m4a");
ffmpeg(...sine(60), "-c:a", "aac", "Dr. Dotted Name.m4a");
ffmpeg(...sine(60), "-c:a", "aac", join("Nested Author", "nested-book.mp4"));

// Unplayable codecs: should be skipped
ffmpeg(...sine(60), "-c:a", "alac", "unplayable-alac.m4a");
ffmpeg(...sine(60), "-c:a", "ac3", "unplayable-ac3.mp4");

// Broken files: should be skipped
writeFileSync(join(outDir, "not-audio.m4b"), "This is not an MP4 file.\n");
const full = readFileSync(join(outDir, "with-chapters.m4b"));
writeFileSync(join(outDir, "truncated.m4b"), full.subarray(0, Math.floor(full.length / 2)));
writeFileSync(join(outDir, "._with-chapters.m4b"), Buffer.alloc(4096));

// Ignored by extension
writeFileSync(join(outDir, "notes.txt"), "Not an audiobook.\n");

if (includeLong)
{
    ffmpeg(...sine(36000), "-c:a", "aac", "-b:a", "32k", "ten-hours.m4b");
}

console.log(`Test media written to ${outDir}`);
