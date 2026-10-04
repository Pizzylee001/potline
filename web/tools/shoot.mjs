/**
 * Screenshot and overflow probe driven straight over the Chrome DevTools
 * Protocol. Node 24 ships global fetch and WebSocket, so this needs no npm
 * dependency. Writes one PNG per route per width and reports
 * document.scrollWidth against document.documentElement.clientWidth.
 *
 * Usage: node tools/shoot.mjs <baseUrl> <outDir> <name:path> ...
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const [, , baseUrl, outDir, ...routeArgs] = process.argv;

if (!baseUrl || !outDir || routeArgs.length === 0) {
  console.error("usage: node tools/shoot.mjs <baseUrl> <outDir> <name:path> ...");
  process.exit(2);
}

const routes = routeArgs.map((arg) => {
  const index = arg.indexOf(":");
  return { name: arg.slice(0, index), path: arg.slice(index + 1) };
});

const WIDTHS = [375, 1440];
const HEIGHT = 900;
const PORT = 9333;
const profileDir = "C:\\Users\\Administrator\\potline\\web\\.chrome-probe";

await mkdir(outDir, { recursive: true });

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--hide-scrollbars",
    "--disable-extensions",
    "--force-device-scale-factor=1",
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function waitForChrome() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return;
    } catch {
      // Not listening yet.
    }
    await sleep(500);
  }
  throw new Error("Chrome did not open the debugging port");
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`${method} timed out`));
        }
      }, 60000);
    });
  }
}
const results = [];
let exitCode = 0;

try {
  await waitForChrome();

  for (const width of WIDTHS) {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, {
      method: "PUT",
    });
    const target = await res.json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });

    const cdp = new Cdp(ws);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Log.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height: HEIGHT,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });

    for (const route of routes) {
      const url = `${baseUrl}${route.path}`;
      cdp.events.length = 0;

      await cdp.send("Page.navigate", { url });
      // Give the client bundle time to hydrate and fire its chain reads.
      await sleep(9000);

      const metrics = await cdp.send("Runtime.evaluate", {
        expression: `JSON.stringify({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          bodyScrollWidth: document.body.scrollWidth,
          title: document.title,
          h1: (document.querySelector('h1') || {}).textContent || null
        })`,
        returnByValue: true,
      });

      const data = JSON.parse(metrics.result.value);
      const overflow = data.scrollWidth - data.clientWidth;

      const shot = await cdp.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
      });

      const file = `${outDir}/${route.name}-${width}.png`;
      await writeFile(file, Buffer.from(shot.data, "base64"));

      const consoleErrors = cdp.events
        .filter(
          (e) =>
            e.method === "Log.entryAdded" && e.params.entry.level === "error",
        )
        .map((e) => e.params.entry.text)
        .concat(
          cdp.events
            .filter(
              (e) =>
                e.method === "Runtime.exceptionThrown" &&
                e.params.exceptionDetails,
            )
            .map(
              (e) =>
                e.params.exceptionDetails.exception?.description ??
                e.params.exceptionDetails.text,
            ),
        );

      results.push({ route: route.path, width, ...data, overflow, consoleErrors, file });

      if (overflow > 0) exitCode = 1;
      if (consoleErrors.length > 0) exitCode = 1;
    }

    ws.close();
  }
} catch (error) {
  console.error("probe failed:", error.message);
  exitCode = 2;
} finally {
  chrome.kill();
  await rm(profileDir, { recursive: true, force: true }).catch(() => {});
}

console.log("");
console.log("route            width  scrollWidth  clientWidth  overflow  consoleErrors");
console.log("-----------------------------------------------------------------------------");
for (const r of results) {
  console.log(
    `${r.route.padEnd(16)} ${String(r.width).padEnd(6)} ${String(r.scrollWidth).padEnd(12)} ${String(r.clientWidth).padEnd(11)} ${String(r.overflow).padEnd(9)} ${r.consoleErrors.length}`,
  );
  if (r.consoleErrors.length > 0) {
    for (const message of r.consoleErrors) console.log(`    ! ${message}`);
  }
}
console.log("");
console.log(`PROBE_EXIT=${exitCode}`);
process.exit(exitCode);