import { getChapterIndexAt, getChapterPosition, getCurrentChapter } from "../../shared/chapter";
import { formatTime } from "../../shared/time";

import type { ChangeEvent } from "react";
import type { AudioPlayer } from "../useAudioPlayer";
import type { Seconds, Chapter } from "../../shared/types";

const RESTART_CHAPTER_THRESHOLD: Seconds = 5;

export interface PlayerControlsProps
{
    player: AudioPlayer;
    chapters: readonly Chapter[];
}

export function PlayerControls({ player, chapters }: PlayerControlsProps)
{
    function handlePlayPause()
    {
        player.togglePlay();
    }

    function handleSeekOffset(offset: Seconds)
    {
        player.seek(player.position + offset);
    }

    function handleNextChapter()
    {
        if (chapters.length === 0) return;

        const currentChapterIndex = getChapterIndexAt(chapters, player.position);
        if (currentChapterIndex === -1 || currentChapterIndex + 1 > chapters.length - 1)
        {
            return;
        }

        player.seek(chapters[currentChapterIndex + 1].start);
    }

    function handlePreviousChapter()
    {
        if (chapters.length === 0) return;

        const currentChapterIndex = getChapterIndexAt(chapters, player.position);
        if (currentChapterIndex === -1)
        {
            player.seek(chapters[chapters.length - 1].start);
            return;
        }

        // If you're past the beginning, just go back to the start of this chapter
        // Most audiobook readers do that and my muscle memory expected it
        if (player.position - chapters[currentChapterIndex].start > RESTART_CHAPTER_THRESHOLD)
        {
            player.seek(chapters[currentChapterIndex].start);
            return;
        }

        const prevChapterIndex = Math.max(currentChapterIndex - 1, 0);
        player.seek(chapters[prevChapterIndex].start);
    }

    function getProgressBarMax()
    {
        const currentChapter = getCurrentChapter(chapters, player.position);
        if (currentChapter === undefined)
        {
            return player.duration;
        }

        return currentChapter.end - currentChapter.start;
    }

    function getProgressBarValue()
    {
        const currentChapter = getCurrentChapter(chapters, player.position);
        if (currentChapter === undefined)
        {
            return player.position;
        }

        return getChapterPosition(currentChapter, player.position);
    }

    function handleSeek(event: ChangeEvent<HTMLInputElement>)
    {
        const currentChapter = getCurrentChapter(chapters, player.position);
        if (currentChapter === undefined)
        {
            player.seek(event.currentTarget.valueAsNumber);
            return;
        }

        // Chapter.end is the start of the next chapter, so only allow it to seek to 10ms before end to stop it going to next chapter
        player.seek(Math.min(currentChapter.start + event.currentTarget.valueAsNumber, currentChapter.end - 0.01));
    }

    function getProgressTime(): string
    {
        // player.duration is NaN before metadata has loaded, need to handle that
        if (!Number.isFinite(player.duration))
        {
            return "";
        }

        const currentChapter = getCurrentChapter(chapters, player.position);
        if (currentChapter === undefined)
        {
            return `${formatTime(player.position)} / ${formatTime(player.duration)}`;
        }

        const elapsed = player.position - currentChapter.start;
        const chapterDuration = currentChapter.end - currentChapter.start;
        return `${formatTime(elapsed)} / ${formatTime(chapterDuration)}`;
    }

    return (
        <div className="player-controls">
            <span>{getProgressTime()}</span>
            <input
                type="range"
                aria-label="Chapter Position"
                aria-valuetext={getProgressTime()}
                className="progress-bar"
                min={0}
                max={getProgressBarMax()}
                step="any"
                value={getProgressBarValue()}
                disabled={!Number.isFinite(player.duration)}
                onChange={event => handleSeek(event)}
            />
            <div className="button-row">
                <button className="player-button" onClick={handlePreviousChapter}>Previous Chapter</button>
                <button className="player-button" onClick={() => handleSeekOffset(-10)}>-10s</button>
                <button className="player-button" onClick={handlePlayPause}>Play/Pause</button>
                <button className="player-button" onClick={() => handleSeekOffset(+10)}>+10s</button>
                <button className="player-button" onClick={handleNextChapter}>Next Chapter</button>
            </div>
        </div>
    );
}
