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

export function getChapterPosition(chapter: Chapter, position: Seconds): number
{
    return Math.min(position - chapter.start, chapter.end - chapter.start);
}

export function getCurrentChapter(chapters: readonly Chapter[], position: Seconds): Chapter | undefined
{
    const lastChapter = chapters.at(-1);
    if (lastChapter !== undefined && position >= lastChapter.end)
    {
        return lastChapter;
    }

    return getChapterAt(chapters, position);
}
