import { useState } from "react";

import { BookID, Library } from "../shared/types";
import { audiobookUrl, coverUrl } from "../shared/urls";
import defaultCover from "./assets/default-cover.png";

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
            <h1>Morgiobooks</h1>
            <button onClick={handleChooseFolder}>Add folder to library</button>
            <button onClick={handleChooseFile}>Add file to library</button>
            <br />
            {currentBookId !== null && <audio controls autoPlay src={audiobookUrl(currentBookId)} />}
            <ul>
                {library.size > 0 && <h2>Library: </h2>}
                {[...library].map(([bookId, book]) => (
                    <li key={bookId} onClick={() => setCurrentBookId(bookId)}>
                        <b>{`${book.title} (${book.author ?? "Unknown Authour"})`}</b>
                        <br />
                        <img src={book.hasCover ? coverUrl(bookId) : defaultCover} alt="" width={256} />
                        <br />
                        Chapters:
                        <ul>
                            {book.chapters.slice(0, 5).map((chapter, index) => <li key={index}>{chapter.title}</li>)}
                            {book.chapters.length > 5 && <li>...</li>}
                        </ul>
                    </li>
                ))}
            </ul>

        </main>
    );
}
