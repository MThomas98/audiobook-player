import { useState } from "react";
import { Book, FolderContents } from "../shared/types";

export function App()
{
    const [folder, setFolder] = useState<FolderContents | null>(null);
    const [books, setBooks] = useState<Book[]>([]);

    async function handleChooseFolder()
    {
        const chosenFolder = await window.api.selectFolder();
        if (chosenFolder)
        {
            setFolder(chosenFolder);
            setBooks(await window.api.scanFolder());
        }
    }

    return (
        <main>
            <h1>Morgiobooks</h1>
            <button onClick={handleChooseFolder}>Choose folder</button>
            <p>{folder ? folder.folderPath : "No folder chosen"}</p>
            <ul>
                {books.length != 0 ? <h2>Books: </h2> : ""}
                {books.map(book => (
                    <li key={book.id}>{book.title}</li>
                ))}
            </ul>

        </main>
    );
}
