import { useState } from "react";

import { Library } from "../shared/types";

export function App()
{
    const [library, setLibrary] = useState<Library>([]);

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
            <h1>Morgiobooks</h1>
            <button onClick={handleChooseFolder}>Add folder to library</button>
            <button onClick={handleChooseFile}>Add file to library</button>
            <ul>
                {library.length != 0 ? <h2>Library: </h2> : ""}
                {library.map(book => (
                    <li key={book.id}>{`${book.title} (${book.author ?? "Unknown Authour"})`}</li>
                ))}
            </ul>

        </main>
    );
}
