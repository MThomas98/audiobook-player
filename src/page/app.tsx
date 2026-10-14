import { useState } from "react";

export function App()
{
    const [folder, setFolder] = useState<string | null>(null);

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
            <p>{folder ?? "No folder chosen"}</p>
        </main>
    );
}
