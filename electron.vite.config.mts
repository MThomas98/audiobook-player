import process from "node:process";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";

import { SCHEME } from "./src/shared/urls";

import type { Plugin } from "vite";

// VS Code terminals set this, which would make the spawned Electron run as plain Node
delete process.env.ELECTRON_RUN_AS_NODE;

const DEV_POLICY = `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' ${SCHEME}:; media-src ${SCHEME}:`;
const STRICT_POLICY = `default-src 'self'; img-src 'self' ${SCHEME}:; media-src ${SCHEME}:`;

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
    main: {},
    preload: {},
    renderer: {
        plugins: [react(), contentSecurityPolicy()],
    },
});
