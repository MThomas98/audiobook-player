import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const DEV_POLICY = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";
const STRICT_POLICY = "default-src 'self'";

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
