#!/usr/bin/env node
// Read-only Factory board for one repository: `node tools/factory-board/board.ts [repo] [--port N]`.
// Serves the dashboard.html next to this file plus the project's task store, Markdown files in
// ~/.agents/factory/<project>/, on 127.0.0.1. Built-ins only. The Factory skill copies board.ts and dashboard.html into each
// project (tools/factory-board/), so nothing outside the repository is needed to run it.
import { execFileSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { realpathSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { homedir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const skipped = new Set(["evidence", "worktree", "node_modules", ".git"]);

interface Entry {
  path: string;
  mtime: number;
}

// Markdown only, no symlinks, and none of the gitignored bulk directories.
async function listMarkdown(root: string, dir = "", out: Entry[] = []): Promise<Entry[]> {
  for (const entry of await readdir(join(root, dir), { withFileTypes: true })) {
    const path = dir ? `${dir}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (!skipped.has(entry.name)) await listMarkdown(root, path, out);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push({ path, mtime: (await stat(join(root, path))).mtimeMs });
    }
  }

  return out.sort((a, b) => a.path.localeCompare(b.path));
}

// A request path is served only if it is a relative .md path whose real location stays under root.
async function readMarkdown(root: string, requested: string): Promise<string | undefined> {
  if (!requested.endsWith(".md") || requested.includes("\0") || requested.startsWith("/")) return;

  try {
    const real = await realpath(resolve(root, requested));

    if (!real.startsWith(root + sep)) return;

    return await readFile(real, "utf8");
  } catch {
    return;
  }
}

// The task store every worktree of a checkout shares: <factory home>/<main checkout relative to home>.
// Agents compute the same path in shell (skills/factory/references/tasks.md); keep them identical.
function factoryStore(directory: string): string {
  let checkout = directory;

  try {
    checkout = dirname(
      execFileSync(
        "git",
        ["-C", directory, "rev-parse", "--path-format=absolute", "--git-common-dir"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ).trim(),
    );
  } catch {
    // Not a repository: the directory itself names the project.
  }

  const home = process.env.FACTORY_HOME ?? join(homedir(), ".agents", "factory");
  const prefix = `${homedir()}/`;

  return join(home, checkout.startsWith(prefix) ? checkout.slice(prefix.length) : checkout);
}

const allowedHosts = (port: number) =>
  new Set([`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`]);

function portOf(server: Server): number {
  // SAFETY: the server listens on a TCP host and port, so address() is an AddressInfo, not a pipe path.
  return (server.address() as AddressInfo).port;
}

export async function startDashboard(
  repo: string,
  port = 0,
): Promise<{ server: Server; url: string }> {
  const store = factoryStore(resolve(repo));

  const root = await realpath(store).catch(() => {
    throw new Error(`No Factory tasks at ${store}`);
  });

  const name = basename(root);
  const escaped = name.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

  const page = (await readFile(join(here, "dashboard.html")))
    .toString("utf8")
    .replace("<title>Factory dashboard</title>", () => `<title>Factory: ${escaped}</title>`);

  const server = createServer(async (req, res) => {
    const send = (status: number, body: string | Buffer, type = "text/plain; charset=utf-8") => {
      res.writeHead(status, {
        "content-type": type,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "referrer-policy": "no-referrer",
      });
      res.end(body);
    };

    // Reject foreign Host headers so a web page cannot reach this server through DNS rebinding.
    if (!allowedHosts(portOf(server)).has(req.headers.host ?? "")) {
      return send(403, "forbidden host");
    }

    if (req.method !== "GET" && req.method !== "HEAD") return send(405, "read-only");

    const url = new URL(req.url ?? "/", "http://localhost");

    if (url.pathname === "/") return send(200, page, "text/html; charset=utf-8");

    if (url.pathname === "/api/files") {
      const files = await listMarkdown(root).catch(() => []);

      return send(200, JSON.stringify({ name, files }), "application/json; charset=utf-8");
    }

    if (url.pathname === "/api/file") {
      const text = await readMarkdown(root, url.searchParams.get("p") ?? "");

      return text === undefined ? send(404, "not found") : send(200, text);
    }

    return send(404, "not found");
  });

  await new Promise<void>((done, fail) => {
    server.once("error", fail);
    server.listen(port, "127.0.0.1", done);
  });

  return { server, url: `http://127.0.0.1:${portOf(server)}/` };
}

// Run directly; stay silent when imported by tests.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const flag = args.indexOf("--port");
  const port = flag >= 0 ? Number(args.splice(flag, 2)[1]) : Number(process.env.PORT ?? 0);
  const repo = resolve(args[0] ?? ".");

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error("Usage: node board.ts [repo] [--port N]");
    process.exit(2);
  }

  startDashboard(repo, port).then(
    ({ url }) => console.log(`Factory board for ${repo}: ${url}`),
    (error: Error) => {
      console.error(error.message);
      process.exit(1);
    },
  );
}
