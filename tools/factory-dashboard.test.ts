import assert from "node:assert/strict";
import { request, type IncomingHttpHeaders } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { startDashboard } from "../skills/factory/assets/dashboard/server.ts";

const assets = join(
  resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  "skills",
  "factory",
  "assets",
  "dashboard",
);

interface Task {
  id: string;
  status: string;
  title: string;
  blocker: string;
  files: string[];
  subtasks: Task[];
}

interface Model {
  parseFrontmatter(text: string): { data: Record<string, string>; body: string };
  buildTasks(files: { path: string }[], texts: Record<string, string>): Task[];
  parseBacklog(text: string): { taken: boolean; text: string; task: string; context: string }[];
  markdown(src: string): string;
  resolveRelative(from: string, href: string): string;
  folderSource(picked: FakeDirectory): Promise<{
    list(): Promise<{ name: string; files: { path: string; mtime: number }[] }>;
    read(path: string): Promise<string>;
  }>;
}

// The slice of the File System Access API the dashboard uses, backed by an in-memory tree.
interface DirNode {
  kind: "directory";
  children: Record<string, Node>;
}

interface FileNode {
  kind: "file";
  text: string;
}

type Node = DirNode | FileNode;

interface FakeDirectory {
  kind: "directory";
  name: string;
  entries(): AsyncGenerator<[string, FakeDirectory | FakeFile]>;
  getDirectoryHandle(name: string): Promise<FakeDirectory>;
  getFileHandle(name: string): Promise<FakeFile>;
}

interface FakeFile {
  kind: "file";
  getFile(): Promise<{ lastModified: number; text(): Promise<string> }>;
}

const dir = (children: Record<string, Node>): DirNode => ({ kind: "directory", children });
const file = (text: string): FileNode => ({ kind: "file", text });

function fakeDirectory(name: string, node: DirNode): FakeDirectory {
  const lookup = (key: string): Node => {
    const child = node.children[key];

    if (child === undefined) throw new Error(`NotFoundError: ${key}`);

    return child;
  };

  const asFile = (child: FileNode): FakeFile => ({
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

function loadModel(): Model {
  const html = readFileSync(join(assets, "dashboard.html"), "utf8");
  const script = /<script>([\s\S]*)<\/script>/.exec(html)?.[1] ?? "";
  const context = vm.createContext({});

  vm.runInContext(script, context);

  // SAFETY: with no `document`, the page script assigns the Model functions to globalThis.factoryModel.
  const model = vm.runInContext("factoryModel", context) as Model;
  // Values from the vm context have another realm's prototypes; round-trip them for deepEqual.
  const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

  return {
    ...model,
    buildTasks: (files, texts) => plain(model.buildTasks(files, texts)),
    parseBacklog: (text) => plain(model.parseBacklog(text)),
    folderSource: async (picked) => {
      const source = await model.folderSource(picked);

      return { ...source, list: async () => plain(await source.list()) };
    },
  };
}

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
  const factory = join(repo, ".factory");

  mkdirSync(join(factory, "001-first", "evidence"), { recursive: true });
  mkdirSync(join(factory, "001-first", "worktree"), { recursive: true });
  writeFileSync(join(factory, "001-first", "TASK.md"), "---\ntitle: First\nstatus: done\n---\n");
  writeFileSync(join(factory, "001-first", "evidence", "raw.md"), "evidence");
  writeFileSync(join(factory, "001-first", "worktree", "x.md"), "worktree");
  writeFileSync(join(factory, "001-first", "notes.txt"), "not markdown");
  writeFileSync(join(base, "secret.md"), "outside the factory");
  symlinkSync(join(base, "secret.md"), join(factory, "link.md"));
  symlinkSync(base, join(factory, "linked-dir"));

  const { server, url } = await startDashboard(repo, 0);

  try {
    await run(url, repo);
  } finally {
    await new Promise((done) => server.close(done));
    rmSync(base, { recursive: true, force: true });
  }
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

test("serves the dashboard page with a restrictive content security policy", () =>
  withRepo(async (url) => {
    const page = await get(url);

    assert.equal(page.status, 200);
    assert.match(String(page.headers["content-type"]), /^text\/html/);
    assert.match(page.body, /Content-Security-Policy[^>]*default-src 'none'/);
  }));

test("fails clearly when the repository has no .factory directory", async () => {
  const base = mkdtempSync(join(tmpdir(), "factory dashboard "));

  try {
    await assert.rejects(startDashboard(base, 0), /No \.factory directory/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("builds the task tree with defaults, subtasks and blockers", () => {
  const { buildTasks } = loadModel();

  const files = [
    "001-alpha/TASK.md",
    "001-alpha/INTENT.md",
    "001-alpha/PLAN.md",
    "001-alpha/design/notes.md",
    "001-alpha/subtasks/001-part/TASK.md",
    "001-alpha/subtasks/001-part/PLAN.md",
    "002-beta/TASK.md",
    "003-bare/DEBRIEF.md",
    "backlog.md",
  ].map((path) => ({ path }));

  const tasks = buildTasks(files, {
    "001-alpha/TASK.md": '---\ntitle: "Alpha"\nstatus: inprogress\nstage: build\n---\n',
    "001-alpha/subtasks/001-part/TASK.md": "---\ntitle: Part\nstatus: done\n---\n",
    "002-beta/TASK.md":
      "---\ntitle: Beta\nstatus: blocked\n---\n\n## Blocker\n\nWaiting on keys.\n\n## Outcome\n\nNone\n",
  });

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
});

test("parses the backlog queue with taken items and context", () => {
  const { parseBacklog } = loadModel();

  const items = parseBacklog(
    "# Backlog\n\n- [ ] Rate limit\n  per IP\n- [x] Dark mode → 004-dark-mode\n",
  );

  assert.deepEqual(items, [
    { taken: false, text: "Rate limit", task: "", context: "per IP" },
    { taken: true, text: "Dark mode", task: "004-dark-mode", context: "" },
  ]);
});

test("renders markdown with every character escaped and no script or javascript links", () => {
  const { markdown, resolveRelative } = loadModel();

  const html = markdown(
    "---\ntitle: x\n---\n# Hi <img src=x onerror=alert(1)>\n\n[bad](javascript:alert(1)) [ok](https://example.com) [doc](PLAN.md)\n\n- [x] done\n\n```\n<script>boom()</script>\n```\n",
  );

  assert.doesNotMatch(html, /<img|<script|javascript:/);
  assert.match(html, /&lt;img/);
  assert.match(html, /href="https:\/\/example\.com"/);
  assert.match(html, /data-rel="PLAN\.md"/);
  assert.match(html, /<li class="task done">/);
  assert.equal(resolveRelative("001-a/PLAN.md", "design/x.md#top"), "001-a/design/x.md");
  assert.equal(resolveRelative("001-a/design/x.md", "../PLAN.md"), "001-a/PLAN.md");
});

test("a picked folder lists only task markdown, finds .factory below the repository root and reads files", async () => {
  const { folderSource } = loadModel();

  const factory = dir({
    "001-a": dir({
      "TASK.md": file("task"),
      evidence: dir({ "raw.md": file("skip") }),
      worktree: dir({ "x.md": file("skip") }),
    }),
    "backlog.md": file("- [ ] item"),
    "notes.txt": file("skip"),
  });

  for (const picked of [
    fakeDirectory("repo", dir({ ".factory": factory, "README.md": file("outside") })),
    fakeDirectory(".factory", factory),
  ]) {
    const source = await folderSource(picked);
    const { name, files } = await source.list();

    assert.deepEqual(
      files.map((f) => f.path),
      ["001-a/TASK.md", "backlog.md"],
    );
    assert.equal(name, picked.name === ".factory" ? "" : "repo");
    assert.equal(await source.read("001-a/TASK.md"), "task");
  }
});
