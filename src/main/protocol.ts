import { net, protocol } from "electron";
import { pathToFileURL } from "node:url";

import { SCHEME, AUDIOBOOK_HOST } from "../shared/urls";

import type { Library } from "../shared/types";

export function registerScheme(): void
{
    protocol.registerSchemesAsPrivileged([{
        scheme: SCHEME,
        privileges: { standard: true, secure: true, stream: true },
    }]);
}

export function handleScheme(library: Library): void
{
    protocol.handle(SCHEME, async (request) =>
    {
        const url = new URL(request.url);
        const book = url.hostname === AUDIOBOOK_HOST ? library.get(decodeURIComponent(url.pathname.slice(1))) : undefined;
        if (book === undefined)
        {
            return new Response("Not found", { status: 404 });
        }

        return net.fetch(pathToFileURL(book.filePath).toString(), { headers: request.headers });
    });
}
