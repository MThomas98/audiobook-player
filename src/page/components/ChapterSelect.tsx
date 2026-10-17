import { formatTime } from "../../shared/time";

import type { Chapter } from "../../shared/types";

export interface ChapterSelectProps
{
    chapters: readonly Chapter[];

    onSelectChapter: (chapter: Chapter) => void;
}

export function ChapterSelect({ chapters, onSelectChapter }: ChapterSelectProps)
{
    return (
        <ul className="chapter-select">
            {chapters.map(chapter => (
                <li key={chapter.start}>
                    <button onClick={() => onSelectChapter(chapter)}>
                        <span className="chapter-title">{chapter.title}</span>
                        <span className="chapter-time">{formatTime(chapter.start)}</span>
                    </button>
                </li>
            ))}
        </ul>
    );
}
