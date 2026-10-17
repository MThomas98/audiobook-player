import type { AudioPlayer } from "../useAudioPlayer";
import type { Seconds } from "../../shared/types";

export interface PlayerControlsProps
{
    player: AudioPlayer;
}

export function PlayerControls({ player }: PlayerControlsProps)
{
    function handlePlayPause()
    {
        player.togglePlay();
    }

    function handleSeekOffset(offset: Seconds)
    {
        player.seek(player.position + offset);
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
                <button className="player-button" onClick={() => handleSeekOffset(-30)}>-30s</button>
                <button className="player-button" onClick={() => handleSeekOffset(-10)}>-10s</button>
                <button className="player-button" onClick={handlePlayPause}>Play/Pause</button>
                <button className="player-button" onClick={() => handleSeekOffset(+10)}>+10s</button>
                <button className="player-button" onClick={() => handleSeekOffset(+30)}>+30s</button>
            </div>
        </div>
    );
}
