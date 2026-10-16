import { useState } from "react";

import { audiobookUrl } from "../shared/urls";
import logo from "./assets/logo.png";
import { LibraryGrid } from "./LibraryGrid";

import type { BookID, Library } from "../shared/types";

export function App()
{
    const [library, setLibrary] = useState<Library>(new Map());
    const [currentBookId, setCurrentBookId] = useState<BookID | null>(null);

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
            <br />
            {currentBookId !== null && <audio controls autoPlay src={audiobookUrl(currentBookId)} />}
            <br />
            <LibraryGrid library={library} onSelect={setCurrentBookId} />
        </main>
    );
}
