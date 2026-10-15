import { BookID } from "./types";

export const SCHEME = "morgiobooks";
export const AUDIOBOOK_HOST = "audiobook";

export function audiobookUrl(bookId: BookID): string
{
    return `${SCHEME}://${AUDIOBOOK_HOST}/${encodeURIComponent(bookId)}`;
}
