// Pure model of a project's task store. No DOM, so tests import it directly.
export const STATUSES = ["backlog", "inprogress", "blocked", "done"] as const;

export type Status = (typeof STATUSES)[number];

export interface FileEntry {
  readonly path: string;
  readonly mtime: number;
}

export interface Task {
  readonly dir: string;
  readonly id: string;
  readonly parent: string | null;
  readonly title: string;
  readonly status: Status;
  readonly stage: string;
  readonly updated: string;
  readonly blocker: string;
  readonly files: readonly string[];
  readonly subtasks: Task[];
}

export interface BacklogItem {
  readonly taken: boolean;
  readonly text: string;
  readonly task: string;
  readonly context: string;
}

const DOC_ORDER = ["TASK.md", "INTENT.md", "DESIGN.md", "PLAN.md", "DEBRIEF.md", "REVIEW.md"];

const isStatus = (value: string | undefined): value is Status =>
  STATUSES.some((status) => status === value);

export interface Frontmatter {
  readonly data: Map<string, string>;
  readonly body: string;
}

export function parseFrontmatter(text: string): Frontmatter {
  const data = new Map<string, string>();
  const block = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);

  if (!block) return { data, body: text };

  for (const line of (block[1] ?? "").split(/\r?\n/)) {
    const pair = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);

    if (pair?.[1]) data.set(pair[1], (pair[2] ?? "").trim().replace(/^(["'])(.*)\1$/, "$2"));
  }

  return { data, body: text.slice(block[0].length) };
}

interface Draft {
  readonly dir: string;
  readonly id: string;
  readonly parent: string | null;
  readonly files: string[];
}

const docRank = (file: string) => {
  const rank = DOC_ORDER.indexOf(file);

  return rank < 0 ? DOC_ORDER.length : rank;
};

// A task is a `NNN-name` directory at the top level or directly inside a `subtasks/` folder.
// `texts` maps a path to the contents of its TASK.md.
export function buildTasks(
  files: readonly FileEntry[],
  texts: ReadonlyMap<string, string>,
): Task[] {
  const drafts = new Map<string, Draft>();

  for (const file of files) {
    const parts = file.path.split("/");
    let owner: Draft | undefined;

    for (let index = 0; index < parts.length - 1; index++) {
      const part = parts[index] ?? "";

      if (!/^\d{3}-/.test(part) || (index > 0 && parts[index - 1] !== "subtasks")) continue;

      const dir = parts.slice(0, index + 1).join("/");
      const cut = dir.lastIndexOf("/subtasks/");

      owner = drafts.get(dir) ?? {
        dir,
        id: part,
        parent: cut < 0 ? null : dir.slice(0, cut),
        files: [],
      };
      drafts.set(dir, owner);
    }

    owner?.files.push(file.path.slice(owner.dir.length + 1));
  }

  const tasks = new Map<string, Task>();

  for (const draft of drafts.values()) {
    const { data, body } = parseFrontmatter(texts.get(`${draft.dir}/TASK.md`) ?? "");
    const status = data.get("status");
    const blocker = (/^## Blocker\s*\n([\s\S]*?)(?=\n## |$)/m.exec(body)?.[1] ?? "").trim();

    tasks.set(draft.dir, {
      dir: draft.dir,
      id: draft.id,
      parent: draft.parent,
      title: data.get("title") || draft.id.replace(/^\d{3}-/, "").replaceAll("-", " "),
      status: isStatus(status) ? status : "backlog",
      stage: data.get("stage") ?? "",
      updated: data.get("updated") ?? "",
      blocker: status === "blocked" && !/^none\.?$/i.test(blocker) ? blocker : "",
      files: draft.files
        .filter((file) => !file.startsWith("subtasks/"))
        .sort((a, b) => docRank(a) - docRank(b) || a.localeCompare(b)),
      subtasks: [],
    });
  }

  const roots: Task[] = [];

  for (const task of tasks.values()) {
    const parent = task.parent ? tasks.get(task.parent) : undefined;

    (parent ? parent.subtasks : roots).push(task);
  }

  const byId = (a: Task, b: Task) => a.id.localeCompare(b.id);

  for (const task of tasks.values()) task.subtasks.sort(byId);

  return roots.sort(byId);
}

export function parseBacklog(text: string): BacklogItem[] {
  const items: { taken: boolean; text: string; task: string; context: string }[] = [];

  for (const line of text.split(/\r?\n/)) {
    const item = /^- \[([ xX])\]\s+(.*)$/.exec(line);

    if (item) {
      const taken = item[1] !== " ";
      const arrow = taken ? /^(.*?)\s*→\s*(\S+)\s*$/.exec(item[2] ?? "") : null;

      items.push({ taken, text: arrow?.[1] ?? item[2] ?? "", task: arrow?.[2] ?? "", context: "" });
    } else if (/^\s+\S/.test(line)) {
      const last = items.at(-1);

      if (last) last.context += (last.context ? "\n" : "") + line.trim();
    }
  }

  return items;
}

export function findTask(tasks: readonly Task[], dir: string): Task | undefined {
  for (const task of tasks) {
    const hit = task.dir === dir ? task : findTask(task.subtasks, dir);

    if (hit) return hit;
  }

  return undefined;
}

// Root-to-task chain for breadcrumbs; empty when the task no longer exists.
export function trail(tasks: readonly Task[], dir: string): Task[] {
  for (const task of tasks) {
    if (task.dir === dir) return [task];

    const below = trail(task.subtasks, dir);

    if (below.length > 0) return [task, ...below];
  }

  return [];
}

export const countTasks = (tasks: readonly Task[]): number =>
  tasks.reduce((sum, task) => sum + 1 + countTasks(task.subtasks), 0);

export const countDone = (tasks: readonly Task[]): number =>
  tasks.reduce((sum, task) => sum + (task.status === "done" ? 1 : 0) + countDone(task.subtasks), 0);

export function resolveRelative(from: string, href: string): string {
  const parts = from.split("/").slice(0, -1);

  for (const segment of (href.split("#")[0] ?? "").split("/")) {
    if (segment === "..") parts.pop();
    else if (segment && segment !== ".") parts.push(segment);
  }

  return parts.join("/");
}
