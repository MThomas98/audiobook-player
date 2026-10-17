import { coverUrl } from "../../shared/urls";
import defaultCover from "../assets/logo-no-text.png";

import type { Book } from "../../shared/types";

export interface BookCoverProps
{
    book: Book;
}

export function BookCover({ book }: BookCoverProps)
{
    return (
        <img className="book-cover" src={book.hasCover ? coverUrl(book.id) : defaultCover} alt="" />
    );
}
