import { BookCard } from "./BookCard";

import type { BookID, Library } from "../shared/types";

interface LibraryGridProps
{
    library: Library;
    onSelect: (bookId: BookID) => void;
}

export function LibraryGrid({ library, onSelect }: LibraryGridProps)
{
    return (
        <div className="library-grid">
            {[...library].map(([bookId, book]) => (
                <BookCard key={bookId} book={book} onSelect={onSelect} />
            ))}
        </div>
    );
}
