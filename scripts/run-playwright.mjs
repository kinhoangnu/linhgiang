import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { createServer } from "vite";

const require = createRequire(import.meta.url);
const playwrightRoot = path.dirname(require.resolve("playwright/package.json"));
const playwrightCli = path.join(playwrightRoot, "cli.js");
const preferredPort = Number(process.env.PLAYWRIGHT_PORT || 5173);

if (process.env.PLAYWRIGHT_USE_FIREBASE !== "1") {
  process.env.VITE_FORCE_LOCAL_STARTER = "true";
}

const server = await createServer({
  logLevel: "error",
  server: {
    host: "127.0.0.1",
    port: preferredPort,
    strictPort: false
  }
});

await server.listen();

const baseURL =
  server.resolvedUrls?.local?.find((url) => url.startsWith("http://127.0.0.1")) ||
  server.resolvedUrls?.local?.[0] ||
  `http://127.0.0.1:${preferredPort}/`;

const exitCode = await new Promise((resolve) => {
  const child = spawn(
    process.execPath,
    [playwrightCli, "test", ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: baseURL
      }
    }
  );

  child.on("exit", (code) => resolve(code ?? 1));
  child.on("error", () => resolve(1));
});

await server.close();
process.exit(exitCode);
