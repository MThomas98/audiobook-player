import { getChapterIndexAt } from "../../shared/book";

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

    return (
        <div className="player-controls">
            <input
                type="range"
                className="progress-bar"
                min={0}
                max={Number.isFinite(player.duration) ? player.duration : 0}
                step="any"
                value={player.position}
                disabled={!Number.isFinite(player.duration)}
                onChange={e => player.seek(e.currentTarget.valueAsNumber)}
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
