import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { request, type IncomingHttpHeaders } from "node:http";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { test } from "node:test";
import { startDashboard } from "../skills/factory/assets/dashboard/board.ts";
import { renderMarkdown } from "../skills/factory/assets/dashboard/src/markdown.ts";
import {
  buildTasks,
  countDone,
  countTasks,
  findTask,
  parseBacklog,
  resolveRelative,
  trail,
} from "../skills/factory/assets/dashboard/src/model.ts";
import {
  folderSource,
  type DirectoryLike,
  type FileLike,
} from "../skills/factory/assets/dashboard/src/sources.ts";
import { buildDashboard, outputPath } from "./build-dashboard.ts";

function get(url: string, options: { method?: string; host?: string } = {}) {
  return new Promise<{ status: number; body: string; headers: IncomingHttpHeaders }>(
    (done, fail) => {
      const target = new URL(url);

      const req = request(
        {
          host: target.hostname,
          port: target.port,
          path: target.pathname + target.search,
          method: options.method ?? "GET",
          headers: options.host ? { host: options.host } : {},
        },
        (res) => {
          let body = "";

          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => done({ status: res.statusCode ?? 0, body, headers: res.headers }));
        },
      );

      req.on("error", fail);
      req.end();
    },
  );
}

async function withRepo(run: (url: string, repo: string) => Promise<void>) {
  const base = mkdtempSync(join(tmpdir(), "factory dashboard "));
  const repo = join(base, "repo");
  const home = join(base, "home");
  const factory = join(home, "repo");
  const restore = useFactoryEnv(base, home);

  mkdirSync(join(factory, "001-first", "evidence"), { recursive: true });
  mkdirSync(join(factory, "001-first", "worktree"), { recursive: true });
  writeFileSync(join(factory, "001-first", "TASK.md"), "---\ntitle: First\nstatus: done\n---\n");
  writeFileSync(join(factory, "001-first", "evidence", "raw.md"), "evidence");
  writeFileSync(join(factory, "001-first", "worktree", "x.md"), "worktree");
  writeFileSync(join(factory, "001-first", "notes.txt"), "not markdown");
  writeFileSync(join(home, "secret.md"), "outside the factory");
  symlinkSync(join(home, "secret.md"), join(factory, "link.md"));
  symlinkSync(home, join(factory, "linked-dir"));

  const { server, url } = await startDashboard(repo, 0);

  try {
    await run(url, repo);
  } finally {
    await new Promise((done) => server.close(done));
    restore();
    rmSync(base, { recursive: true, force: true });
  }
}

// Point the store at a temporary home; the key is a checkout's path relative to `home`.
function useFactoryEnv(home: string, factoryHome: string): () => void {
  const previous = { HOME: process.env.HOME, FACTORY_HOME: process.env.FACTORY_HOME };

  process.env.HOME = home;
  process.env.FACTORY_HOME = factoryHome;

  return () => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  };
}

test("lists only task markdown and serves it as plain text", () =>
  withRepo(async (url) => {
    const files = JSON.parse((await get(`${url}api/files`)).body);

    assert.deepEqual(
      files.files.map((f: { path: string }) => f.path),
      ["001-first/TASK.md"],
    );
    assert.equal(files.name, "repo");

    const file = await get(`${url}api/file?p=001-first/TASK.md`);

    assert.equal(file.status, 200);
    assert.match(String(file.headers["content-type"]), /^text\/plain/);
    assert.equal(file.headers["x-content-type-options"], "nosniff");
  }));

test("refuses traversal, symlink escapes, non-markdown files, other methods and foreign hosts", () =>
  withRepo(async (url) => {
    const probes = [
      "../secret.md",
      "..%2Fsecret.md",
      "%2e%2e/secret.md",
      "link.md",
      "linked-dir/secret.md",
      "001-first/notes.txt",
      "/etc/hosts.md",
      "001-first/TASK.md%00.txt",
      "",
    ];

    for (const probe of probes) {
      const response = await get(`${url}api/file?p=${probe}`);

      assert.equal(response.status, 404, `${probe} must not be served`);
      assert.doesNotMatch(response.body, /outside the factory/);
    }

    assert.equal((await get(`${url}api/files`, { method: "POST" })).status, 405);
    assert.equal((await get(`${url}api/files`, { host: "evil.example" })).status, 403);
    assert.equal((await get(`${url}nothing`)).status, 404);
  }));

test("serves a self-contained dashboard page with a restrictive content security policy", () =>
  withRepo(async (url) => {
    const page = await get(url);

    assert.equal(page.status, 200);
    assert.match(String(page.headers["content-type"]), /^text\/html/);
    assert.match(page.body, /Content-Security-Policy[^>]*default-src 'none'/);
    assert.doesNotMatch(page.body, /<script[^>]+src=|<link[^>]+href=|https?:\/\/cdn/i);
  }));

test("fails clearly when the project has no task store", async () => {
  const base = mkdtempSync(join(tmpdir(), "factory dashboard "));
  const restore = useFactoryEnv(base, join(base, "home"));

  try {
    await assert.rejects(startDashboard(base, 0), /No Factory tasks at/);
  } finally {
    restore();
    rmSync(base, { recursive: true, force: true });
  }
});

test("the main checkout and its worktrees all read the same task store", async () => {
  const base = realpathSync(mkdtempSync(join(tmpdir(), "factory dashboard ")));
  const main = join(base, "my-project");
  const worktree = join(main, ".worktrees", "feat-x");
  const store = join(base, "home", "my-project");
  const restore = useFactoryEnv(base, join(base, "home"));

  const git = (...args: string[]) =>
    execFileSync("git", ["-C", main, ...args], { stdio: "ignore" });

  mkdirSync(main);
  mkdirSync(join(store, "001-live"), { recursive: true });
  git("init", "-q");
  git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "base");
  git("worktree", "add", "-q", "-b", "feat-x", worktree);

  try {
    for (const directory of [main, worktree, join(worktree, "tools")]) {
      mkdirSync(directory, { recursive: true });

      const { server, url } = await startDashboard(directory, 0);

      try {
        writeFileSync(
          join(store, "001-live", "TASK.md"),
          "---\ntitle: Live\nstatus: inprogress\n---\n",
        );

        const listing = JSON.parse((await get(`${url}api/files`)).body);

        assert.equal(listing.name, "my-project");
        assert.deepEqual(
          listing.files.map((f: { path: string }) => f.path),
          ["001-live/TASK.md"],
        );
      } finally {
        await new Promise((done) => server.close(done));
      }
    }
  } finally {
    restore();
    rmSync(base, { recursive: true, force: true });
  }
});

test("two checkouts with the same directory name keep separate stores", async () => {
  const base = mkdtempSync(join(tmpdir(), "factory dashboard "));
  const restore = useFactoryEnv(base, join(base, "home"));

  mkdirSync(join(base, "home", "work", "app", "001-work"), { recursive: true });
  mkdirSync(join(base, "home", "play", "app", "001-play"), { recursive: true });
  writeFileSync(join(base, "home", "work", "app", "001-work", "TASK.md"), "---\ntitle: W\n---\n");
  writeFileSync(join(base, "home", "play", "app", "001-play", "TASK.md"), "---\ntitle: P\n---\n");

  try {
    const { server, url } = await startDashboard(join(base, "work", "app"), 0);

    try {
      const listing = JSON.parse((await get(`${url}api/files`)).body);

      assert.deepEqual(
        listing.files.map((f: { path: string }) => f.path),
        ["001-work/TASK.md"],
      );
    } finally {
      await new Promise((done) => server.close(done));
    }
  } finally {
    restore();
    rmSync(base, { recursive: true, force: true });
  }
});

test("the committed dashboard.html is exactly what the sources build to", async () => {
  assert.equal(
    readFileSync(outputPath, "utf8"),
    await buildDashboard(),
    "run `npm run build:dashboard` and commit the result",
  );
});

const files = [
  "001-alpha/TASK.md",
  "001-alpha/INTENT.md",
  "001-alpha/PLAN.md",
  "001-alpha/design/notes.md",
  "001-alpha/subtasks/001-part/TASK.md",
  "001-alpha/subtasks/001-part/PLAN.md",
  "001-alpha/subtasks/001-part/subtasks/001-leaf/TASK.md",
  "002-beta/TASK.md",
  "003-bare/DEBRIEF.md",
  "backlog.md",
].map((path) => ({ path, mtime: 1 }));

const texts = new Map([
  ["001-alpha/TASK.md", '---\ntitle: "Alpha"\nstatus: inprogress\nstage: build\n---\n'],
  ["001-alpha/subtasks/001-part/TASK.md", "---\ntitle: Part\nstatus: done\n---\n"],
  ["001-alpha/subtasks/001-part/subtasks/001-leaf/TASK.md", "---\ntitle: Leaf\n---\n"],
  [
    "002-beta/TASK.md",
    "---\ntitle: Beta\nstatus: blocked\n---\n\n## Blocker\n\nWaiting on keys.\n\n## Outcome\n\nNone\n",
  ],
]);

test("builds the task tree with defaults, subtasks and blockers", () => {
  const tasks = buildTasks(files, texts);

  assert.deepEqual(
    tasks.map((t) => [t.id, t.status]),
    [
      ["001-alpha", "inprogress"],
      ["002-beta", "blocked"],
      ["003-bare", "backlog"],
    ],
  );
  assert.equal(tasks[0]?.title, "Alpha");
  assert.deepEqual(tasks[0]?.files, ["TASK.md", "INTENT.md", "PLAN.md", "design/notes.md"]);
  assert.deepEqual(
    tasks[0]?.subtasks.map((t) => [t.id, t.status, t.files.join()]),
    [["001-part", "done", "TASK.md,PLAN.md"]],
  );
  assert.equal(tasks[1]?.blocker, "Waiting on keys.");
  assert.equal(tasks[2]?.title, "bare");
  assert.equal(countTasks(tasks[0]?.subtasks ?? []), 2);
  assert.equal(countDone(tasks[0]?.subtasks ?? []), 1);
});

test("finds a task at any depth and returns the breadcrumb trail from the root", () => {
  const tasks = buildTasks(files, texts);
  const leaf = "001-alpha/subtasks/001-part/subtasks/001-leaf";

  assert.equal(findTask(tasks, leaf)?.title, "Leaf");
  assert.deepEqual(
    trail(tasks, leaf).map((t) => t.id),
    ["001-alpha", "001-part", "001-leaf"],
  );
  assert.deepEqual(
    trail(tasks, "002-beta").map((t) => t.id),
    ["002-beta"],
  );
  assert.deepEqual(trail(tasks, "999-missing"), []);
  assert.equal(findTask(tasks, "999-missing"), undefined);
});

test("parses the backlog queue with taken items and context", () => {
  assert.deepEqual(
    parseBacklog("# Backlog\n\n- [ ] Rate limit\n  per IP\n- [x] Dark mode → 004-dark-mode\n"),
    [
      { taken: false, text: "Rate limit", task: "", context: "per IP" },
      { taken: true, text: "Dark mode", task: "004-dark-mode", context: "" },
    ],
  );
});

test("renders markdown with raw HTML shown as text and only safe links kept", () => {
  const html = renderMarkdown(
    "---\ntitle: x\n---\n# Hi <img src=x onerror=alert(1)>\n\n<script>boom()</script>\n\n[bad](javascript:alert(1)) [ok](https://example.com) [doc](PLAN.md)\n\n- [x] done\n\n```\n<script>boom()</script>\n```\n",
  );

  assert.doesNotMatch(html, /<img|<script|javascript:/);
  assert.match(html, /&lt;img/);
  assert.match(html, /href="https:\/\/example\.com"/);
  assert.match(html, /data-rel="PLAN\.md"/);
  assert.match(html, /<input[^>]*checked/);
  assert.equal(resolveRelative("001-a/PLAN.md", "design/x.md#top"), "001-a/design/x.md");
  assert.equal(resolveRelative("001-a/design/x.md", "../PLAN.md"), "001-a/PLAN.md");
});

// The slice of the File System Access API the dashboard uses, backed by an in-memory tree.
interface DirNode {
  readonly kind: "directory";
  readonly children: Record<string, Node>;
}

interface FileNode {
  readonly kind: "file";
  readonly text: string;
}

type Node = DirNode | FileNode;

const dir = (children: Record<string, Node>): DirNode => ({ kind: "directory", children });
const file = (text: string): FileNode => ({ kind: "file", text });

function fakeDirectory(name: string, node: DirNode): DirectoryLike {
  const lookup = (key: string): Node => {
    const child = node.children[key];

    if (child === undefined) throw new Error(`NotFoundError: ${key}`);

    return child;
  };

  const asFile = (child: FileNode): FileLike => ({
    kind: "file",
    getFile: async () => ({ lastModified: 7, text: async () => child.text }),
  });

  const asHandle = (key: string, child: Node) =>
    child.kind === "file" ? asFile(child) : fakeDirectory(key, child);

  return {
    kind: "directory",
    name,
    async *entries() {
      for (const [key, child] of Object.entries(node.children)) yield [key, asHandle(key, child)];
    },
    async getDirectoryHandle(key) {
      const child = lookup(key);

      if (child.kind !== "directory") throw new Error(`TypeMismatchError: ${key}`);

      return fakeDirectory(key, child);
    },
    async getFileHandle(key) {
      const child = lookup(key);

      if (child.kind !== "file") throw new Error(`TypeMismatchError: ${key}`);

      return asFile(child);
    },
  };
}

test("a picked task store lists only task markdown and reads files", async () => {
  const factory = dir({
    "001-a": dir({
      "TASK.md": file("task"),
      evidence: dir({ "raw.md": file("skip") }),
      worktree: dir({ "x.md": file("skip") }),
    }),
    "backlog.md": file("- [ ] item"),
    "notes.txt": file("skip"),
    ".git": dir({ "HEAD.md": file("skip") }),
  });

  const source = await folderSource(fakeDirectory("my-project", factory));
  const listing = await source.list();

  assert.deepEqual(
    listing.files.map((f) => f.path),
    ["001-a/TASK.md", "backlog.md"],
  );
  assert.equal(listing.name, "my-project");
  assert.equal(await source.read("001-a/TASK.md"), "task");
});

test("a project copy of board.ts and dashboard.html runs on its own with plain node", async () => {
  const project = mkdtempSync(join(tmpdir(), "factory project "));
  const copy = join(project, "tools", "factory-board");
  const asset = join(import.meta.dirname, "..", "skills", "factory", "assets", "dashboard");

  mkdirSync(copy, { recursive: true });
  const home = join(project, "home");
  const store = join(home, basename(project));

  mkdirSync(join(store, "001-x"), { recursive: true });
  writeFileSync(join(store, "001-x", "TASK.md"), "---\ntitle: X\n---\n");
  copyFileSync(join(asset, "board.ts"), join(copy, "board.ts"));
  copyFileSync(join(asset, "dashboard.html"), join(copy, "dashboard.html"));

  const child = spawn(process.execPath, [join(copy, "board.ts"), project], {
    cwd: project,
    env: { ...process.env, HOME: dirname(project), FACTORY_HOME: home },
    stdio: ["ignore", "pipe", "inherit"],
  });

  try {
    const line = await new Promise<string>((done, fail) => {
      child.stdout.once("data", (chunk) => done(String(chunk)));
      child.once("error", fail);
      child.once("exit", (code) => fail(new Error(`board exited early with ${code}`)));
    });

    const url = /http:\/\/\S+/.exec(line)?.[0] ?? "";
    const listing = JSON.parse((await get(`${url}api/files`)).body);

    assert.equal((await get(url)).status, 200);
    assert.deepEqual(
      listing.files.map((f: { path: string }) => f.path),
      ["001-x/TASK.md"],
    );
  } finally {
    child.kill();
    rmSync(project, { recursive: true, force: true });
  }
});
