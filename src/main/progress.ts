import { bookExists } from "./library";
import { loadJson, saveJson } from "./jsonStore";
import { expectProgressArray } from "./checkers";

import type { BookID, Progress } from "../shared/types";

const savedProgresses = new Map<BookID, Progress>();

export async function saveProgress(progress: Progress, path: string): Promise<void>
{
    if (!bookExists(progress.bookId))
    {
        throw new Error(`Unable to save progress, unknown book id ${progress.bookId}`);
    }

    savedProgresses.set(progress.bookId, progress);
    await saveJson(path, [...savedProgresses.values()]);
}

export async function loadProgresses(path: string): Promise<void>
{
    const progresses = await loadJson(path, expectProgressArray) ?? [];

    for (const progress of progresses)
    {
        if (!bookExists(progress.bookId))
        {
            console.error(`Found progress for book id ${progress.bookId}, but it isn't loaded`);
            continue;
        }

        savedProgresses.set(progress.bookId, progress);
    }
}

export function getProgress(bookId: BookID): Progress | undefined
{
    return savedProgresses.get(bookId);
}
