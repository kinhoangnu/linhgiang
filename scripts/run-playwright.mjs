import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { createServer } from "vite";

const require = createRequire(import.meta.url);
const playwrightRoot = path.dirname(require.resolve("playwright/package.json"));
const playwrightCli = path.join(playwrightRoot, "cli.js");

const server = await createServer({
  logLevel: "error",
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true
  }
});

await server.listen();

const exitCode = await new Promise((resolve) => {
  const child = spawn(
    process.execPath,
    [playwrightCli, "test", ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: process.env
    }
  );

  child.on("exit", (code) => resolve(code ?? 1));
  child.on("error", () => resolve(1));
});

await server.close();
process.exit(exitCode);
