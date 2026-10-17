import { PlayerControls } from "../components/PlayerControls";
import { BookCover } from "../components/BookCover";

import type { Book } from "../../shared/types";
import type { AudioPlayer } from "../useAudioPlayer";

export interface PlayerViewProps
{
    book: Book | undefined;
    player: AudioPlayer;

    onBack: () => void;
}

export function PlayerView({ book, player, onBack }: PlayerViewProps)
{
    return (
        <div className="player-view">
            {book !== undefined && (
                <div className="player-view-info">
                    <h1>{book.title}</h1>
                    <h2>{book.author ?? "Unknown Author" }</h2>
                    <BookCover book={book} />
                </div>
            )}
            <PlayerControls player={player} />
            <br />
            <button onClick={onBack}>Back to Library</button>
        </div>
    );
}
