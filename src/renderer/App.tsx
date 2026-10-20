import { useEffect, useState } from "react";

import { LibraryView } from "./views/LibraryView";
import { useAudioPlayer } from "./useAudioPlayer";
import { audiobookUrl } from "../shared/urls";
import { PlayerView } from "./views/PlayerView";

import type { BookID, Library } from "../shared/types";

type View = "library" | "player";

export function App()
{
    const [view, setView] = useState<View>("library");

    const [library, setLibrary] = useState<Library>(new Map());
    const [currentBookId, setCurrentBookId] = useState<BookID | null>(null);

    useEffect(() =>
    {
        window.api.getLibrary()
            .then(setLibrary)
            .catch(err => console.error(`Failed to get saved library: ${err}`));
    }, []);

    const currentBook = currentBookId === null ? undefined : library.get(currentBookId);

    const player = useAudioPlayer();

    function handleSelectBook(bookId: BookID)
    {
        setCurrentBookId(bookId);
        setView("player");
    }

    function getView()
    {
        switch (view)
        {
            case "library":
                return (
                    <LibraryView
                        library={library}
                        currentBook={currentBook}
                        player={player}
                        onLibraryChange={setLibrary}
                        onSelectBook={handleSelectBook}
                        onGoToPlayer={() => setView("player")}
                    />
                );
            case "player":
                return (
                    <PlayerView
                        book={currentBook}
                        player={player}
                        onBack={() => setView("library")}
                    />
                );
            default:
            {
                const unreachable: never = view;
                throw new Error(`Unknown view: ${unreachable}`);
            }
        }
    }

    return (
        <main>
            <audio autoPlay ref={player.audioRef} src={currentBookId === null ? undefined : audiobookUrl(currentBookId)} />
            {getView()}
        </main>
    );
}
