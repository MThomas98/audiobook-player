import process from "node:process";
import { spawn } from "node:child_process";
import { createServer } from "vite";
import electronPath from "electron";

const server = await createServer();
await server.listen();
server.printUrls();

const env = { ...process.env, DEV_SERVER_URL: server.resolvedUrls?.local[0] };
delete env.ELECTRON_RUN_AS_NODE;

const electron = spawn(electronPath, ["."], { stdio: "inherit", env });
electron.on("exit", () => server.close());
