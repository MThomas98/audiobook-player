import type { BookID } from "./types";

export const SCHEME = "morgiobooks";
export const AUDIOBOOK_HOST = "audiobook";
export const COVER_HOST = "covers";

export function audiobookUrl(bookId: BookID): string
{
    return `${SCHEME}://${AUDIOBOOK_HOST}/${encodeURIComponent(bookId)}`;
}

export function coverUrl(bookId: BookID): string
{
    return `${SCHEME}://${COVER_HOST}/${encodeURIComponent(bookId)}`;
}
