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
