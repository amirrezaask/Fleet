import type { AddressInfo } from "node:net";
import { execFile, type ChildProcess } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { constants, watch, type FSWatcher } from "node:fs";
import { lstat, mkdir, open, readdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomBytes } from "node:crypto";
import { Effect, Option, Schema } from "effect";
import { build } from "esbuild";
import { compile } from "tailwindcss";
import { createRequire } from "node:module";
import { Scanner } from "@tailwindcss/oxide";
import matter from "gray-matter";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const assetsDir = dirname(fileURLToPath(import.meta.url));

const NonEmptyTrimmed = Schema.String.check(Schema.isTrimmed(), Schema.isNonEmpty());

async function projectName(project: string): Promise<string> {
  try {
    const value = JSON.parse(await readFile(join(project, "package.json"), "utf8"));

    const info = Schema.decodeUnknownSync(
      Schema.Struct({
        displayName: Schema.optional(NonEmptyTrimmed),
        name: Schema.optional(NonEmptyTrimmed),
      }),
    )(value);

    return info.displayName ?? info.name ?? basename(project);
  } catch {
    return basename(project);
  }
}

// Watched projects live in one registry file so every board session shows the same set.
const registryFile = join(process.env.FACTORY_HOME ?? join(homedir(), ".factory"), "projects.json");

const registered: string[] = await readFile(registryFile, "utf8").then(
  (text) => Schema.decodeUnknownSync(Schema.Array(Schema.String))(JSON.parse(text)).slice(),
  () => [],
);

const projectId = (path: string) => createHash("sha1").update(path).digest("hex").slice(0, 10);

// Tasks live in <project>/.factory/.
const tasksOf = (project: string) => join(project, ".factory");

async function saveRegistry(): Promise<void> {
  await mkdir(dirname(registryFile), { recursive: true });
  await writeFile(registryFile, JSON.stringify(registered, null, 2) + "\n");
}

async function addProject(input: string): Promise<string> {
  const path = resolve(input);

  if (!(await realDirectory(path))) throw new BoardError("Project must be an existing directory.");

  if (!registered.includes(path)) {
    registered.push(path);
    await saveRegistry();
    watchProject(path);
  }

  return path;
}

async function removeProject(id: string): Promise<void> {
  const path = registered.find((entry) => projectId(entry) === id);

  if (!path) throw new BoardError("Project not found.", 404);
  registered.splice(registered.indexOf(path), 1);
  watchers.get(path)?.close();
  watchers.delete(path);
  await saveRegistry();
}

// Requests name a project by id; without one the first registered project is used.
function projectPath(id: string | null | undefined): string {
  const path = id ? registered.find((entry) => projectId(entry) === id) : registered[0];

  if (!path) throw new BoardError("Add a project to start watching its tasks.", 404);

  return path;
}

async function listProjects() {
  return Promise.all(
    registered.map(async (path) => ({
      id: projectId(path),
      name: await projectName(path),
      path,
    })),
  );
}

type Picked = { path: string } | { cancelled: true } | { unsupported: true };

let picking: ChildProcess | undefined;

// Browsers never expose absolute paths, so the host's own folder chooser runs on this machine.
function chooser(command: string, args: string[]): Promise<Picked | "missing"> {
  return new Promise((done) => {
    picking = execFile(command, args, { timeout: 300000 }, (error, stdout, stderr) => {
      picking = undefined;

      if (!error) {
        const path = stdout.trim().replace(/(.)\/+$/, "$1");

        return done(path ? { path } : { cancelled: true });
      }

      if ("code" in error && error.code === "ENOENT") return done("missing");

      // osascript reports Cancel as error -128 and a denied Automation prompt as -1743.
      if (error.killed || /-128|User canceled/.test(stderr) || (error.code === 1 && !stderr))
        return done({ cancelled: true });
      done({ unsupported: true });
    });
  });
}

async function pickFolder(): Promise<Picked> {
  if (process.platform === "darwin") {
    const result = await chooser("osascript", [
      "-e",
      "tell me to activate",
      "-e",
      'POSIX path of (choose folder with prompt "Choose a project folder")',
    ]);

    return result === "missing" ? { unsupported: true } : result;
  }

  if (process.platform !== "linux" || !(process.env.DISPLAY || process.env.WAYLAND_DISPLAY))
    return { unsupported: true };
  const zenity = await chooser("zenity", ["--file-selection", "--directory"]);

  if (zenity !== "missing") return zenity;
  const kdialog = await chooser("kdialog", ["--getexistingdirectory", homedir()]);

  return kdialog === "missing" ? { unsupported: true } : kdialog;
}

const statuses = ["backlog", "inprogress", "blocked", "done"] as const;

const stages = ["intent", "design", "plan", "build", "test", "done"] as const;

const metadata = Schema.Struct({
  title: NonEmptyTrimmed,
  created: Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/)),
  updated: Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/)),
});

const stageField = Schema.Struct({ stage: Schema.Literals(stages) });

const statusField = Schema.Struct({ status: Schema.Literals(statuses) });

// The pipeline stage is optional; an absent or unknown value shows no stage on the board.
function stageOf(fields: { stage?: string }): { stage?: (typeof stages)[number] } {
  return Option.getOrElse(Schema.decodeUnknownOption(stageField)(fields), () => ({}));
}

// Port 0 asks the OS for any free port; the real port is known once the server is listening.
const requestedPort = Number(process.env.PORT ?? 0);
let port = requestedPort;
const token = randomBytes(32).toString("hex");
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

class BoardError extends Error {
  code: number;

  constructor(message: string, code = 400) {
    super(message);
    this.code = code;
  }
}

async function realDirectory(path: string): Promise<boolean> {
  try {
    const info = await lstat(path);

    return info.isDirectory() && !info.isSymbolicLink();
  } catch {
    return false;
  }
}

async function exists(path: string): Promise<boolean> {
  return lstat(path).then(
    () => true,
    () => false,
  );
}

// Tasks live at .factory/<name>/ and subtasks at <task>/subtasks/<name>/. Names never change;
// the status is a field of TASK.html (or TASK.md frontmatter), so a move edits one file.
type Location = { directory: string };

async function find(parent: string, name: string): Promise<Location> {
  const directory = join(parent, name);

  if (!(await exists(directory))) throw new BoardError("Task not found.", 404);

  if (!(await realDirectory(directory)))
    throw new BoardError("Task directory must be a real directory.");

  return { directory };
}

// An id is a slash-separated path of task names, one per nesting level.
async function locate(root: string, id: string): Promise<Location> {
  const [top, ...nested] = id.split("/");

  if (!top || !slug.test(top) || !nested.every((name) => slug.test(name)))
    throw new BoardError("Invalid task name.");

  if (!(await realDirectory(root))) throw new BoardError("Task not found.", 404);
  let current = await find(root, top);

  for (const name of nested) current = await find(join(current.directory, "subtasks"), name);

  return current;
}

// Direct subtasks of a task directory: the child directories of its subtasks/ folder.
async function childTasks(directory: string): Promise<Array<{ name: string; directory: string }>> {
  const parent = join(directory, "subtasks");

  if (!(await realDirectory(parent))) return [];

  return (await readdir(parent, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink() && slug.test(entry.name))
    .map((entry) => ({ name: entry.name, directory: join(parent, entry.name) }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function taskFile(root: string, id: string, name: string): Promise<string> {
  const { directory } = await locate(root, id);
  const path = join(directory, name);
  const file = await lstat(path);

  if (!file.isFile() || file.isSymbolicLink())
    throw new BoardError("Task documents must be regular files.");

  return path;
}

async function readDocument(root: string, id: string, name: string): Promise<string> {
  const path = await taskFile(root, id, name);
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);

  try {
    return await handle.readFile("utf8");
  } finally {
    await handle.close();
  }
}

// New documents are HTML; older Markdown documents stay readable. HTML wins when both exist.
// Earlier bases are preferred, so a legacy name can follow its replacement as a fallback.
async function existingDocument(
  root: string,
  id: string,
  ...bases: string[]
): Promise<string | undefined> {
  const { directory } = await locate(root, id);

  for (const base of bases) {
    for (const extension of [".html", ".md"]) {
      if (await exists(join(directory, base + extension))) return base + extension;
    }
  }

  return undefined;
}

async function documentName(root: string, id: string, base: string): Promise<string> {
  return (await existingDocument(root, id, base)) ?? `${base}.html`;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&");
}

const htmlMeta = (name: string) =>
  new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"\\s*/?>`, "i");

// A task with no readable status is a backlog task.
function statusOf(fields: { status?: string }): { status: (typeof statuses)[number] } {
  return Option.getOrElse(Schema.decodeUnknownOption(statusField)(fields), () => ({
    status: "backlog" as const,
  }));
}

function decodeTask(text: string, name = "TASK.md") {
  try {
    if (name.endsWith(".html")) {
      const data = Schema.decodeUnknownSync(metadata)({
        title: decodeEntities(/<title>([\s\S]*?)<\/title>/i.exec(text)?.[1] ?? "").trim(),
        created: htmlMeta("created").exec(text)?.[1],
        updated: htmlMeta("updated").exec(text)?.[1],
      });

      return {
        data: {
          ...data,
          ...statusOf({ status: htmlMeta("status").exec(text)?.[1] }),
          ...stageOf({ stage: htmlMeta("stage").exec(text)?.[1] }),
        },
        content: text,
      };
    }

    const parsed = matter(text);
    const data = Schema.decodeUnknownSync(metadata)(parsed.data);

    return {
      data: { ...data, ...statusOf(parsed.data), ...stageOf(parsed.data) },
      content: parsed.content,
    };
  } catch {
    throw new BoardError(
      "TASK.html requires a title and created/updated dates (TASK.md: title and quoted created/updated dates).",
    );
  }
}

async function readTask(root: string, id: string) {
  const name = await documentName(root, id, "TASK");

  return { name, ...decodeTask(await readDocument(root, id, name), name) };
}

// The task document path relative to the project, e.g. .factory/<name>/TASK.html.
const projectFile = (root: string, directory: string, name: string) =>
  join(".factory", relative(root, join(directory, name)));

// The status of the task in `directory`; an unreadable TASK file counts as backlog.
async function childStatus(directory: string): Promise<(typeof statuses)[number]> {
  for (const name of ["TASK.html", "TASK.md"]) {
    try {
      return decodeTask(await readFile(join(directory, name), "utf8"), name).data.status;
    } catch {
      continue;
    }
  }

  return "backlog";
}

async function countSubtasks(directory: string): Promise<{ total: number; done: number }> {
  const count = { total: 0, done: 0 };

  for (const child of await childTasks(directory)) {
    const nested = await countSubtasks(child.directory);
    count.total += 1 + nested.total;
    count.done += nested.done + ((await childStatus(child.directory)) === "done" ? 1 : 0);
  }

  return count;
}

async function summary(root: string, id: string): Promise<TaskSummary> {
  const { directory } = await locate(root, id);
  const { name, data } = await readTask(root, id);

  return {
    id,
    file: projectFile(root, directory, name),
    subtasks: await countSubtasks(directory),
    ...data,
  };
}

async function listSubtasks(root: string, id: string) {
  const { directory } = await locate(root, id);
  const subtasks: TaskSummary[] = [];

  for (const child of await childTasks(directory)) {
    const childId = `${id}/${child.name}`;

    try {
      subtasks.push(await summary(root, childId));
    } catch {
      subtasks.push({
        id: childId,
        status: "backlog",
        file: projectFile(root, child.directory, "TASK.html"),
        subtasks: { total: 0, done: 0 },
        title: child.name,
        created: "",
        updated: "",
      });
    }
  }

  return subtasks;
}

async function listTasks(root: string) {
  const tasks: TaskSummary[] = [];
  const errors: string[] = [];

  if (!(await realDirectory(root)))
    return { tasks, errors: ["No .factory directory in this project yet."] };

  for (const entry of (await readdir(root, { withFileTypes: true })).sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

    if (!slug.test(entry.name)) {
      errors.push(
        `${entry.name}: task directories are named with lowercase letters, numbers and single hyphens.`,
      );
      continue;
    }

    try {
      tasks.push(await summary(root, entry.name));
    } catch {
      errors.push(
        `${entry.name}: unable to load task; check TASK metadata and regular document paths.`,
      );
    }
  }

  return { tasks, errors };
}

function htmlBody(text: string): string {
  const inner =
    /<main[^>]*>([\s\S]*)<\/main>/i.exec(text)?.[1] ??
    /<body[^>]*>([\s\S]*)<\/body>/i.exec(text)?.[1] ??
    text;

  return inner.replace(/<h1[\s\S]*?<\/h1>/i, "");
}

// The first base names the document; later bases are legacy names read in its place.
// Optional documents that were never written render a short note instead of an error.
async function renderDocument(
  root: string,
  id: string,
  bases: string[],
  optional = false,
): Promise<string> {
  const found = await existingDocument(root, id, ...bases);

  if (!found && optional) return `<p class="notice">Not written yet.</p>`;
  const name = found ?? `${bases[0]}.html`;

  try {
    const text = await readDocument(root, id, name);

    const body = name.endsWith(".html") ? htmlBody(text) : await marked.parse(matter(text).content);

    return sanitizeHtml(body, {
      allowedTags: sanitizeHtml.defaults.allowedTags,
      allowedAttributes: { a: ["href", "title"], code: ["class"] },
      allowedSchemes: ["http", "https", "mailto"],
      allowProtocolRelative: false,
    });
  } catch {
    return `<p class="notice">${name} is unavailable. Check that it exists as a regular HTML or Markdown file.</p>`;
  }
}

type TaskSummary = {
  id: string;
  status: string;
  file: string;
  subtasks: { total: number; done: number };
  title: string;
  created: string;
  updated: string;
  stage?: string;
};

async function formFields(request: IncomingMessage, address: string): Promise<URLSearchParams> {
  if (request.headers.origin !== `http://${address}`)
    throw new BoardError("Changes must originate from this board.", 403);

  if (request.headers["content-type"]?.split(";")[0] !== "application/x-www-form-urlencoded")
    throw new BoardError("Use the board's form operations.", 415);
  let body = "";

  for await (const chunk of request) {
    body += chunk;

    if (Buffer.byteLength(body) > 8192) throw new BoardError("Form is too large.", 413);
  }

  const fields = new URLSearchParams(body);

  if (fields.get("token") !== token)
    throw new BoardError("Refresh the board before making changes.", 403);

  return fields;
}

// Moving writes the status into the task's TASK file (and bumps updated); the directory stays put.
async function move(fields: URLSearchParams): Promise<TaskSummary> {
  const root = tasksOf(projectPath(fields.get("project")));
  const id = fields.get("task") ?? "";
  const status = fields.get("status") ?? "";

  if (!Schema.is(statusField.fields.status)(status)) throw new BoardError("Unknown task status.");
  const current = await locate(root, id);
  const name = await documentName(root, id, "TASK");
  const path = await taskFile(root, id, name);
  const file = await open(path, constants.O_RDWR | constants.O_NOFOLLOW);

  try {
    const original = await file.readFile("utf8");
    decodeTask(original, name);
    const html = name.endsWith(".html");
    const frontmatter = /^(---\r?\n)([\s\S]*?)(\r?\n---)(?=\r?\n|$)/.exec(original);

    if (
      html
        ? !htmlMeta("updated").test(original)
        : !frontmatter || !/^updated:[^\r\n]*\r?$/m.test(frontmatter[2])
    )
      throw new BoardError(
        html ? "Use a plain updated meta tag." : "Use a plain updated frontmatter key.",
      );

    const today = new Date().toISOString().slice(0, 10);
    const updatedTag = `<meta name="updated" content="${today}">`;

    const statusTag = `<meta name="status" content="${status}">`;

    const text =
      html || !frontmatter
        ? original.replace(htmlMeta("updated"), updatedTag).replace(htmlMeta("status"), statusTag)
        : frontmatter[1] +
          frontmatter[2]
            .replace(/^updated:[^\r\n]*/m, `updated: "${today}"`)
            .replace(/^status:[^\r\n]*/m, `status: ${status}`) +
          (/^status:/m.test(frontmatter[2])
            ? ""
            : `${frontmatter[2].includes("\r\n") ? "\r\n" : "\n"}status: ${status}`) +
          frontmatter[3] +
          original.slice(frontmatter[0].length);

    // A TASK.html written before statuses moved into metadata gets the tag after updated.
    const written =
      html && !htmlMeta("status").test(text)
        ? text.replace(htmlMeta("updated"), `${updatedTag}\n  ${statusTag}`)
        : text;

    decodeTask(written, name);
    await file.write(written, 0, "utf8");
    await file.truncate(Buffer.byteLength(written));

    return {
      id,
      file: projectFile(root, current.directory, name),
      subtasks: await countSubtasks(current.directory),
      ...decodeTask(written, name).data,
    };
  } finally {
    await file.close();
  }
}

async function buildUI() {
  const source = await readFile(join(assetsDir, "index.html"), "utf8");
  const script = /<script type="text\/tsx">([\s\S]*?)<\/script>/.exec(source);
  const style = /<style type="text\/tailwindcss">([\s\S]*?)<\/style>/.exec(source);

  if (!script || !style)
    throw new Error("index.html requires its TSX script and Tailwind style blocks.");

  const result = await build({
    stdin: {
      contents: script[1],
      loader: "tsx",
      resolveDir: assetsDir,
      sourcefile: "index.html.tsx",
    },
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    minify: true,
  });

  const require = createRequire(import.meta.url);

  const compiler = await compile(style[1], {
    base: assetsDir,
    loadStylesheet: async (id, base) => {
      const path = id.startsWith(".")
        ? resolve(base, id)
        : require.resolve(id === "tailwindcss" ? "tailwindcss/index.css" : id, { paths: [base] });

      return { path, base: dirname(path), content: await readFile(path, "utf8") };
    },
  });

  const scanner = new Scanner({
    sources: [{ base: assetsDir, pattern: "index.html", negated: false }],
  });

  const javascript = result.outputFiles[0]?.text;

  if (!javascript) throw new Error("Unable to prepare the React application.");

  return {
    html: source.replace(script[0], "").replace(style[0], ""),
    javascript,
    css: compiler.build(scanner.scan()),
  };
}

const assets = await buildUI();

function json<T>(response: ServerResponse, value: T): void {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(value));
}

const listeners = new Set<ServerResponse>();
const watchers = new Map<string, FSWatcher>();
const notifyTimers = new Map<string, NodeJS.Timeout>();

// Task files change in bursts (editor saves, git checkouts), so coalesce them into one event.
function notifyChange(project: string) {
  clearTimeout(notifyTimers.get(project));

  notifyTimers.set(
    project,
    setTimeout(() => {
      const data = JSON.stringify({ project: projectId(project) });

      for (const listener of listeners) listener.write(`event: change\ndata: ${data}\n\n`);
    }, 150),
  );
}

// Recursive watching is supported on macOS and Windows; elsewhere the board falls back to reloads.
function watchProject(project: string) {
  if (watchers.has(project)) return;

  try {
    const watcher = watch(tasksOf(project), { recursive: true }, () => notifyChange(project));
    watcher.on("error", () => undefined);
    watchers.set(project, watcher);
  } catch {
    console.warn(`Not watching ${project}; reload the board to see task changes.`);
  }
}

function openEvents(request: IncomingMessage, response: ServerResponse) {
  response.writeHead(200, { "Content-Type": "text/event-stream", Connection: "keep-alive" });
  response.write(": connected\n\n");
  listeners.add(response);
  const heartbeat = setInterval(() => response.write(": ping\n\n"), 25000);

  request.on("close", () => {
    clearInterval(heartbeat);
    listeners.delete(response);
  });
}

async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const address = `127.0.0.1:${port}`;
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  );
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cache-Control", "no-store");

  if (request.headers.host !== address)
    throw new BoardError("Use the board's 127.0.0.1 address.", 403);
  const url = new URL(request.url ?? "/", `http://${address}`);

  if (request.method === "GET" && url.pathname === "/app.js") {
    response.setHeader("Content-Type", "text/javascript; charset=utf-8");
    response.end(assets.javascript);
  } else if (request.method === "GET" && url.pathname === "/theme.js") {
    // Runs before first paint so a remembered theme never flashes; inline scripts are blocked by CSP.
    response.setHeader("Content-Type", "text/javascript; charset=utf-8");

    response.end(
      'try{const t=localStorage.getItem("factory-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch{}',
    );
  } else if (request.method === "GET" && url.pathname === "/app.css") {
    response.setHeader("Content-Type", "text/css; charset=utf-8");
    response.end(assets.css);
  } else if (
    request.method === "GET" &&
    ["/fonts/anthropic-serif.woff2", "/fonts/anthropic-sans.woff2"].includes(url.pathname)
  ) {
    response.setHeader("Content-Type", "font/woff2");
    response.end(await readFile(join(assetsDir, basename(url.pathname))));
  } else if (request.method === "GET" && url.pathname === "/") {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(assets.html);
  } else if (request.method === "GET" && url.pathname === "/api/events") {
    openEvents(request, response);
  } else if (request.method === "GET" && url.pathname === "/api/board") {
    if (registered.length === 0)
      return json(response, {
        project: "",
        projectId: "",
        projects: [],
        token,
        tasks: [],
        errors: ["Add a project directory to start watching its tasks."],
      });
    const project = projectPath(url.searchParams.get("project"));

    json(response, {
      project: await projectName(project),
      projectId: projectId(project),
      projects: await listProjects(),
      token,
      ...(await listTasks(tasksOf(project))),
    });
  } else if (request.method === "GET" && url.pathname === "/api/projects") {
    json(response, { projects: await listProjects() });
  } else if (request.method === "POST" && url.pathname.startsWith("/api/projects/")) {
    const fields = await formFields(request, address);
    const action = url.pathname.slice("/api/projects/".length);

    if (action === "pick") {
      if (picking) throw new BoardError("A folder dialog is already open.", 409);
      // A closed tab must not leave a dialog open on the host.
      response.on("close", () => {
        if (!response.writableFinished) picking?.kill();
      });

      const picked = await pickFolder();

      if ("path" in picked) {
        const path = await addProject(picked.path);
        json(response, { id: projectId(path), projects: await listProjects() });
      } else json(response, picked);
    } else if (action === "add") {
      const path = await addProject(fields.get("path") ?? "");
      json(response, { id: projectId(path), projects: await listProjects() });
    } else if (action === "remove") {
      await removeProject(fields.get("id") ?? "");
      json(response, { projects: await listProjects() });
    } else throw new BoardError("Page not found.", 404);
  } else if (request.method === "GET" && url.pathname.startsWith("/api/tasks/")) {
    const id = url.pathname
      .slice("/api/tasks/".length)
      .split("/")
      .map(decodeURIComponent)
      .join("/");

    const root = tasksOf(projectPath(url.searchParams.get("project")));
    await readTask(root, id);

    const [intent, design, plan, debrief, subtasks] = await Promise.all([
      renderDocument(root, id, ["INTENT", "BRIEF"]),
      renderDocument(root, id, ["DESIGN"], true),
      renderDocument(root, id, ["PLAN"]),
      renderDocument(root, id, ["DEBRIEF"], true),
      listSubtasks(root, id),
    ]);

    json(response, { intent, design, plan, debrief, subtasks });
  } else if (request.method === "POST" && ["/api/status", "/status"].includes(url.pathname)) {
    const updated = await move(await formFields(request, address));

    if (url.pathname === "/api/status") json(response, updated);
    else {
      response.writeHead(303, { Location: "/" });
      response.end();
    }
  } else throw new BoardError("Page not found.", 404);
}

if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535)
  throw new BoardError("PORT must be between 0 and 65535.");

const server = createServer((request, response) => {
  void Effect.runPromise(
    Effect.tryPromise(() => handle(request, response)).pipe(
      Effect.match({
        onFailure: (error) => {
          const cause = error.cause;
          response.statusCode = cause instanceof BoardError ? cause.code : 500;
          response.setHeader("Content-Type", "text/plain; charset=utf-8");
          response.end(
            cause instanceof BoardError
              ? cause.message
              : "Unable to access task files. Check the task directory and try again.",
          );
        },
        onSuccess: () => undefined,
      }),
    ),
  );
});

server.requestTimeout = 10000;

// `amirreza-factory [dir...]` registers the given projects; an empty registry adopts the cwd.
const requested = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));

for (const dir of requested) await addProject(dir);

if (registered.length === 0 && (await realDirectory(tasksOf(process.cwd()))))
  await addProject(process.cwd());

for (const project of registered) watchProject(project);

server.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});

server.listen(requestedPort, "127.0.0.1", () => {
  // SAFETY: a server listening on a TCP host and port reports an AddressInfo, never a pipe path.
  const bound = server.address() as AddressInfo;

  port = bound.port;
  console.log(`Factory board: http://127.0.0.1:${port}`);
});
