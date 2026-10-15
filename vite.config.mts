import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

import { SCHEME } from "./src/shared/urls";

const DEV_POLICY = `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src ${SCHEME}:`;
const STRICT_POLICY = `default-src 'self'; img-src 'self' data:; media-src ${SCHEME}:`;

function contentSecurityPolicy(): Plugin
{
    return {
        name: "content-security-policy",
        transformIndexHtml(_html, context)
        {
            const policy = context.server ? DEV_POLICY : STRICT_POLICY;
            return [{
                tag: "meta",
                attrs: { "http-equiv": "Content-Security-Policy", "content": policy },
                injectTo: "head-prepend",
            }];
        },
    };
}

export default defineConfig({
    root: "src/page",
    base: "./",
    plugins: [react(), contentSecurityPolicy()],
    build: {
        outDir: "../../dist/page",
        emptyOutDir: true,
    },
});
