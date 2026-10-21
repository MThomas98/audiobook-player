// import { saveJson } from "./jsonStore";

import { bookExists } from "./library";

import type { BookID, Progress } from "../shared/types";

const savedProgresses = new Map<BookID, Progress>();

export async function saveProgress(progress: Progress, path: string): Promise<void>
{
    if (!bookExists(progress.bookId))
    {
        throw new Error(`Unable to save book, unknown id ${progress.bookId}`);
    }

    savedProgresses.set(progress.bookId, progress);
    // saveJson(path, [...savedProgresses]);
}

export async function loadProgresses(path: string): Promise<void>
{
    // TODO
}

export function getProgress(bookId: BookID): Progress | undefined
{
    return savedProgresses.get(bookId);
}
