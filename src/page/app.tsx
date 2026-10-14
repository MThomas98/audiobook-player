import { useState } from "react";
import { FolderContents } from "../shared/api";

export function App()
{
    const [folder, setFolder] = useState<FolderContents | null>(null);

    async function handleChooseFolder()
    {
        const chosenFolder = await window.api.selectFolder();
        if (chosenFolder)
        {
            setFolder(chosenFolder);
        }
    }

    return (
        <main>
            <h1>Morgiobooks</h1>
            <button onClick={handleChooseFolder}>Choose folder</button>
            <p>{folder ? folder.folderPath : "No folder chosen"}</p>
            <ul>
                {folder?.files.map(file => (
                    <li key={file}>{file}</li>
                ))}
            </ul>

        </main>
    );
}
