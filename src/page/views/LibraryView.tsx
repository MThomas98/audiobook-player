import logo from "../assets/logo-short.png";
import { LibraryGrid } from "../components/LibraryGrid";
import { PlayerControls } from "../components/PlayerControls";

import type { AudioPlayer } from "../useAudioPlayer";
import type { Book, BookID, Library } from "../../shared/types";

interface LibraryViewProps
{
    library: Library;
    currentBook: Book | undefined;
    player: AudioPlayer;

    onLibraryChange: (library: Library) => void;
    onSelectBook: (bookId: BookID) => void;
    onGoToPlayer: () => void;
}

export function LibraryView({ library, currentBook, player, onLibraryChange, onSelectBook, onGoToPlayer }: LibraryViewProps)
{
    async function handleChooseFolder()
    {
        const newLibrary = await window.api.addFolderToLibrary();
        onLibraryChange(newLibrary);
    }

    async function handleChooseFile()
    {
        const newLibrary = await window.api.addFileToLibrary();
        onLibraryChange(newLibrary);
    }

    return (
        <div className="library-view">
            <img src={logo} width={256} alt="" />
            {
                currentBook !== undefined && (
                    <>
                        <b>{currentBook.title}</b>
                        <PlayerControls player={player} chapters={currentBook?.chapters ?? []} />
                        <br />
                        <button onClick={onGoToPlayer}>Back to Player</button>
                        <br />
                    </>
                )
            }
            <div className="button-row">
                <button onClick={handleChooseFolder}>Add folder to library</button>
                <button onClick={handleChooseFile}>Add file to library</button>
            </div>
            <br />
            <LibraryGrid library={library} onSelect={onSelectBook} />
        </div>
    );
}
