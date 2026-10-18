import { formatTime } from "../../shared/time";
import { getChapterProgress } from "../../shared/chapter";

import type { Chapter, Seconds } from "../../shared/types";

export interface ChapterSelectProps
{
    chapters: readonly Chapter[];
    position: Seconds;

    onSelectChapter: (chapter: Chapter) => void;
}

export function ChapterSelect({ chapters, position, onSelectChapter }: ChapterSelectProps)
{
    return (
        <ul className="chapter-select">
            {chapters.map((chapter) =>
            {
                const fill = getChapterProgress(chapter, position) * 100;
                return (
                    <li key={chapter.start}>
                        <button onClick={() => onSelectChapter(chapter)} style={{ "--fill": `${fill}%` }}>
                            <span className="chapter-title">{chapter.title}</span>
                            <span className="chapter-time">{formatTime(chapter.start)}</span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
