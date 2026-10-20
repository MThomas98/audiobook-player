import { BookCover } from "./BookCover";

import type { BookID, Book } from "../../shared/types";

interface BookCardProps
{
    book: Book;
    onSelect: (bookId: BookID) => void;
}

export function BookCard({ book, onSelect }: BookCardProps)
{
    const author = book.author ?? "Unknown Author";

    return (
        <button className="book-card" onClick={() => onSelect(book.id)}>
            <span className="book-card-text book-card-title" title={book.title}>{book.title}</span>
            <span className="book-card-text" title={author}>{author}</span>
            <BookCover book={book} />
        </button>
    );
}
