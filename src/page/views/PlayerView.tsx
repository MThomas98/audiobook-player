import { useRef } from "react";

import { PlayerControls } from "../components/PlayerControls";
import { BookCover } from "../components/BookCover";
import logo from "../assets/logo-small.png";
import { ChapterSelect } from "../components/ChapterSelect";
import { getChapterAt } from "../../shared/chapterUtils";

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
    const chapterSelectDialogRef = useRef<HTMLDialogElement>(null);

    // getChapterAt returns undefined at exactly the end of the book: show the last chapter there.
    const chapters = book?.chapters ?? [];
    const currentChapter = getChapterAt(chapters, player.position) ?? chapters.at(-1);

    return (
        <div className="player-view">
            <img src={logo} width={64} alt="" />
            <div className="player-view-info">
                <hgroup>
                    <h1>{book !== undefined ? book.title : "Unknown Book"}</h1>
                    <p className="author">{book?.author ?? "Unknown Author"}</p>
                </hgroup>
                <BookCover book={book} />
                <p className="current-chapter">{currentChapter?.title ?? "Unknown Chapter"}</p>
            </div>
            <PlayerControls player={player} chapters={book?.chapters ?? []} />
            <br />
            <button onClick={() => chapterSelectDialogRef.current?.showModal()}>Chapters</button>
            <dialog ref={chapterSelectDialogRef} className="chapter-dialog" closedby="any">
                <ChapterSelect
                    chapters={chapters}
                    position={player.position}
                    onSelectChapter={(chapter) =>
                    {
                        player.seek(chapter.start);
                        chapterSelectDialogRef.current?.close();
                    }}
                />
                <button className="chapter-dialog-close" onClick={() => chapterSelectDialogRef.current?.close()}>
                    Close
                </button>
            </dialog>
            <br />
            <button onClick={onBack}>Back to Library</button>
        </div>
    );
}
