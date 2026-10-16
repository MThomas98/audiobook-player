import { coverUrl } from "../shared/urls";
import defaultCover from "./assets/logo-no-text.png";

import type { BookID, Book } from "../shared/types";

interface BookCardProps
{
    book: Book;
    onSelect: (bookId: BookID) => void;
}

export function BookCard({ book, onSelect }: BookCardProps)
{
    return (
        <button className="book-card" onClick={() => onSelect(book.id)}>
            <b>{book.title}</b>
            <br />
            {book.author ?? "Unknown Author"}
            <br />
            <img className="book-cover" src={book.hasCover ? coverUrl(book.id) : defaultCover} alt="" />
        </button>
    );
}
