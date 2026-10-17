import { coverUrl } from "../../shared/urls";
import defaultCover from "../assets/logo-no-text.png";

import type { Book } from "../../shared/types";

export interface BookCoverProps
{
    book: Book | undefined;
}

export function BookCover({ book }: BookCoverProps)
{
    return (
        <img className="book-cover" src={book !== undefined ? (book.hasCover ? coverUrl(book.id) : defaultCover) : defaultCover} alt="" />
    );
}
