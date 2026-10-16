export type RangeResult =
    { kind: "full" } |
    { kind: "partial"; start: number; end: number } |
    { kind: "unsatisfiable" };

const RANGE_REGEX = /^bytes=(\d*)-(\d*)$/;

export function parseRange(rangeHeader: string | null, size: number): RangeResult
{
    // No header, give everything
    if (rangeHeader === null)
    {
        return { kind: "full" };
    }

    // Malformed header, give everything
    const match = RANGE_REGEX.exec(rangeHeader);
    if (match === null)
    {
        return { kind: "full" };
    }

    const [, startStr, endStr] = match;

    // "bytes=-" case: malformed, give everything
    if (startStr === "" && endStr === "")
    {
        return { kind: "full" };
    }

    // "bytes=-[end]" case: should start counting from end
    if (startStr === "")
    {
        // "bytes=-0" case: valid, but can't satisfy
        if (Number(endStr) === 0)
        {
            return { kind: "unsatisfiable" };
        }

        // edge case, if size is 0 then we have nothing to return, which is unsatisfiable
        if (size === 0)
        {
            return { kind: "unsatisfiable" };
        }

        const start = Math.max(0, size - Number(endStr));
        const end = size - 1;

        return { kind: "partial", start, end };
    }

    // "bytes=[start]-[end | ""]"" case: valid header
    const start = Math.max(0, Number(startStr));
    const end = endStr === "" ? size - 1 : Math.min(size - 1, Number(endStr));

    // Asking for start which is past the end, can't satisfy
    if (start > size - 1)
    {
        return { kind: "unsatisfiable" };
    }

    // Invalid range, ignore it and give everything
    if (end < start)
    {
        return { kind: "full" };
    }

    return { kind: "partial", start, end };
}
