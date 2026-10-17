import type { Chapter, Seconds } from "./types";

export function getChapterAt(chapters: readonly Chapter[], position: Seconds): Chapter | undefined
{
    const chapterIndex = getChapterIndexAt(chapters, position);
    return chapterIndex !== -1 ? chapters[chapterIndex] : undefined;
}

export function getChapterIndexAt(chapters: readonly Chapter[], position: Seconds): number
{
    return chapters.findIndex((chapter: Chapter) => position >= chapter.start && position < chapter.end);
}

// How much of the chapter has been played at this position: 0 before it, 1 after it, a fraction inside it.
export function getChapterProgress(chapter: Chapter, position: Seconds): number
{
    const length = chapter.end - chapter.start;
    if (length <= 0)
    {
        // A zero-length chapter would divide 0 by 0 (NaN).
        return position >= chapter.start ? 1 : 0;
    }

    return Math.min(Math.max((position - chapter.start) / length, 0), 1);
}
