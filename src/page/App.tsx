import { useState } from "react";

import { audiobookUrl } from "../shared/urls";
import logo from "./assets/logo.png";
import { LibraryGrid } from "./LibraryGrid";
import { useAudioPlayer } from "./useAudioPlayer";

import type { BookID, Library } from "../shared/types";

export function App()
{
    const [library, setLibrary] = useState<Library>(new Map());
    const [currentBookId, setCurrentBookId] = useState<BookID | null>(null);

    const player = useAudioPlayer();

    async function handleChooseFolder()
    {
        const newLibrary = await window.api.addFolderToLibrary();
        setLibrary(newLibrary);
    }

    async function handleChooseFile()
    {
        const newLibrary = await window.api.addFileToLibrary();
        setLibrary(newLibrary);
    }

    return (
        <main>
            <img src={logo} width={256} />
            <br />
            <button onClick={handleChooseFolder}>Add folder to library</button>
            <button onClick={handleChooseFile}>Add file to library</button>
            <button onClick={() => { player.seek(10); }}>Test</button>
            <br />
            <audio controls autoPlay ref={player.audioRef} src={currentBookId === null ? "" : audiobookUrl(currentBookId)} />
            <br />
            <LibraryGrid library={library} onSelect={setCurrentBookId} />
        </main>
    );
}
