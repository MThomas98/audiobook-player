import { useState } from "react";

import { Library } from "../shared/types";

export function App()
{
    const [library, setLibrary] = useState<Library>(new Map());

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
                {library.size > 0 && <h2>Library: </h2>}
                {[...library].map(([bookId, book]) => (
                    <li key={bookId}>
                        {`${book.title} (${book.author ?? "Unknown Authour"})`}
                        <br />
                        Chapters:
                        <ul>
                            {book.chapters.map(chapter => (<li>{chapter.title}</li>))}
                        </ul>
                    </li>
                ))}
            </ul>

        </main>
    );
}
