import { audiobookUrl } from "../shared/urls";
import { useAudioPlayer } from "./useAudioPlayer";

import type { BookID, Seconds } from "../shared/types";

export interface PlayerProps
{
    bookId: BookID | null;
}

export function Player({ bookId }: PlayerProps)
{
    const player = useAudioPlayer();

    function handlePlayPause()
    {
        player.togglePlay();
    }

    function handleSeekOffset(offset: Seconds)
    {
        player.seek(player.position + offset);
    }

    return (
        <div id="player">
            <audio autoPlay ref={player.audioRef} src={bookId === null ? undefined : audiobookUrl(bookId)} />
            <button className="player-button" onClick={() => handleSeekOffset(-30)}>-30s</button>
            <button className="player-button" onClick={() => handleSeekOffset(-10)}>-10s</button>
            <button className="player-button" onClick={handlePlayPause}>Play/Pause</button>
            <button className="player-button" onClick={() => handleSeekOffset(+10)}>+10s</button>
            <button className="player-button" onClick={() => handleSeekOffset(+30)}>+30s</button>
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
        </div>
    );
}
