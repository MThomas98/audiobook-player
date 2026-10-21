import type { Progress } from "../shared/types";

export function expectString(value: unknown, name: string): string
{
    if (typeof value !== "string")
    {
        throw new Error(`Parameter ${name} must be a string`);
    }

    return value;
}

export function expectStringArray(value: unknown): string[]
{
    if (!Array.isArray(value) || !value.every(item => typeof item === "string"))
    {
        throw new Error("string array is not in the expected format");
    }

    return value;
}

export function expectProgress(value: unknown, name: string): Progress
{
    if (typeof value !== "object" || value === null ||
        !("bookId" in value) || typeof value.bookId !== "string" ||
        !("position" in value) || typeof value.position !== "number" || !Number.isFinite(value.position) || value.position < 0)
    {
        throw new Error(`Parameter ${name} must be a Progress object`);
    }

    return { bookId: value.bookId, position: value.position };
}
