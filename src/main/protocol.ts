import { protocol } from "electron";
import assert from "node:assert";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { stat } from "node:fs/promises";

import { SCHEME, AUDIOBOOK_HOST, COVER_HOST } from "../shared/urls";
import { parseRange } from "./range";
import { getCoverImage, getLibrary } from "./library";

import type { Library } from "../shared/types";

export function registerScheme(): void
{
    protocol.registerSchemesAsPrivileged([{
        scheme: SCHEME,
        privileges: { standard: true, secure: true, stream: true },
    }]);
}

export function handleScheme(): void
{
    const library = getLibrary();
    protocol.handle(SCHEME, async (request) =>
    {
        const url = new URL(request.url);
        if (url.hostname === AUDIOBOOK_HOST)
        {
            return handleAudiobookRequest(url, request, library);
        }
        if (url.hostname === COVER_HOST)
        {
            return handleCoverRequest(url, library);
        }

        return new Response("Not found", { status: 404 });
    });
}

function streamFile(filePath: string, size: number, start?: number, end?: number): Response
{
    const stream = createReadStream(filePath, { start, end });
    const body = Readable.toWeb(stream) as ReadableStream;

    if (start !== undefined && end !== undefined)
    {
        return new Response(body, {
            status: 206,
            headers: {
                "Content-Type": "audio/mp4",
                "Content-Length": String(end - start + 1),
                "Content-Range": `bytes ${start}-${end}/${size}`,
                "Accept-Ranges": "bytes",
            },
        });
    }

    return new Response(body, {
        status: 200,
        headers: {
            "Content-Type": "audio/mp4",
            "Content-Length": String(size),
            "Accept-Ranges": "bytes",
        },
    });
}

async function handleAudiobookRequest(url: URL, request: Request, library: Library): Promise<Response>
{
    assert(url.hostname === AUDIOBOOK_HOST, "Tried handling an audiobook request from a non-audiobook URI");

    const book = library.get(decodeURIComponent(url.pathname.slice(1)));
    if (book === undefined)
    {
        return new Response("Not found", { status: 404 });
    }

    let size: number;
    try
    {
        size = (await stat(book.filePath)).size;
    }
    catch (err)
    {
        console.error(`Unable to stat file "${book.filePath}": ${err}`);
        const missing = err instanceof Error && "code" in err && err.code === "ENOENT";
        return new Response(missing ? "Not found" : "System error", { status: missing ? 404 : 500 });
    }

    const rangeResult = parseRange(request.headers.get("Range"), size);
    switch (rangeResult.kind)
    {
        case "full":
            return streamFile(book.filePath, size);
        case "unsatisfiable":
            return new Response(null, {
                status: 416,
                headers: { "Content-Range": `bytes */${size}` },
            });
        case "partial":
            return streamFile(book.filePath, size, rangeResult.start, rangeResult.end);
        default:
        {
            const unreachable: never = rangeResult;
            throw new Error(`Unknown range result: ${JSON.stringify(unreachable)}`);
        }
    }
}

async function handleCoverRequest(url: URL, library: Library): Promise<Response>
{
    assert(url.hostname === COVER_HOST, "Tried handling a cover request from a non-cover URI");

    const book = library.get(decodeURIComponent(url.pathname.slice(1)));
    if (book === undefined)
    {
        return new Response("Not found", { status: 404 });
    }

    const cover = getCoverImage(book.id);
    if (cover === undefined)
    {
        return new Response("Not found", { status: 404 });
    }

    return new Response(cover.data as Uint8Array<ArrayBuffer>, {
        headers: {
            "Content-Type": cover.format,
            "Content-Length": String(cover.data.byteLength),
        },
    });
}
