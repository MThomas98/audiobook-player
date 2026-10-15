import type { Chapter, Seconds } from "./types";

export function getChapterAt(chapters: readonly Chapter[], position: Seconds): Chapter | undefined
{
    return chapters.find((chapter: Chapter) => position >= chapter.start && position < chapter.end);
}
