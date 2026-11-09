import assert from "node:assert/strict";
import { JSDOM, VirtualConsole } from "jsdom";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { Schema } from "effect";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(repo, "skills/factory/assets/task-board/server.ts");

async function freePort(): Promise<number> {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const { port } = Schema.decodeUnknownSync(Schema.Struct({ port: Schema.Number }))(
    server.address(),
  );

  await new Promise<void>((resolveClose, reject) =>
    server.close((error) => (error ? reject(error) : resolveClose())),
  );

  return port;
}

async function fixture(run: (base: string, tasks: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "factory board "));
  const tasks = join(directory, "home", basename(directory));
  await mkdir(tasks, { recursive: true });

  await writeFile(
    join(directory, "package.json"),
    JSON.stringify({ name: "test-project", displayName: "Project <Atlas>" }),
  );
  const port = await freePort();

  const child = spawn(process.execPath, [source, directory], {
    env: {
      ...process.env,
      HOME: tmpdir(),
      PORT: String(port),
      FACTORY_HOME: join(directory, "home"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let diagnostics = "";
  child.stderr.on("data", (data) => {
    diagnostics += data;
  });

  try {
    await new Promise<void>((ready, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Board startup timed out: ${diagnostics}`)),
        10000,
      );

      child.stdout.once("data", () => {
        clearTimeout(timer);
        ready();
      });
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("exit", () => {
        clearTimeout(timer);
        reject(new Error(`Board exited: ${diagnostics}`));
      });
    });
    await run(`http://127.0.0.1:${port}`, tasks);
  } finally {
    const exited = once(child, "exit");

    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
      await exited;
    }

    await rm(directory, { recursive: true, force: true });
  }
}

const taskSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  status: Schema.String,
  created: Schema.String,
  updated: Schema.String,
});

const boardSchema = Schema.Struct({
  project: Schema.String,
  token: Schema.String,
  tasks: Schema.Array(taskSchema),
  errors: Schema.Array(Schema.String),
});

async function board(base: string) {
  return Schema.decodeUnknownSync(boardSchema)(await (await fetch(`${base}/api/board`)).json());
}

// Tasks live at <parent>/<id>/ with their status in TASK.md frontmatter; subtasks sit in <task>/subtasks/.
async function task(tasks: string, id: string, status = "backlog"): Promise<string> {
  const path = join(tasks, id);
  await mkdir(path, { recursive: true });
  const text = `---\ntitle: "Recover account access"\ncreated: "2026-10-28"\nupdated: "2026-10-28"\nstatus: ${status}\nowner: ADMIN\n---\n\nKeep this task context exactly.\n`;
  await writeFile(join(path, "TASK.md"), text);
  await writeFile(
    join(path, "BRIEF.md"),
    "# Recovery\n\n| Requirement | Outcome |\n| --- | --- |\n| R1 | Recover access |\n\n<script>alert('unsafe')</script>\n\n[unsafe](javascript:alert)\n",
  );
  await writeFile(
    join(path, "PLAN.md"),
    "# Implementation\n\n1. Add recovery flow.\n2. Verify it.\n",
  );

  return text;
}

async function move(base: string, token: string, id: string, status: string, origin = base) {
  return fetch(`${base}/api/status`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token, task: id, status }),
  });
}

async function eventually(check: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (check()) return;
    await new Promise((resolveTurn) => setTimeout(resolveTurn, 20));
  }

  assert.ok(check(), "Expected UI state was not reached");
}

async function mount(base: string, live = false, storage: Record<string, string> = {}) {
  const dom = new JSDOM(await (await fetch(base)).text(), {
    url: base,
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole().forwardTo(console),
  });

  const window = dom.window;
  const requests: string[] = [];
  window.AbortController = AbortController;

  for (const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, value);

  window.HTMLElement.prototype.scrollIntoView = () => undefined;
  window.HTMLElement.prototype.setPointerCapture = () => undefined;
  window.HTMLElement.prototype.releasePointerCapture = () => undefined;
  window.fetch = (url, init) => {
    const address = new URL(String(url), base);
    requests.push(address.pathname);

    return fetch(address, {
      ...init,
      headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: base },
    });
  };

  const streams = new AbortController();
  // jsdom has no EventSource, so read the SSE stream with fetch and dispatch its change events.
  // SAFETY: the stub implements the only EventSource members the board uses.
  window.EventSource = class {
    listeners: Array<() => void> = [];
    constructor(path: string) {
      void fetch(new URL(path, base), { signal: streams.signal })
        .then(async (response) => {
          const decoder = new TextDecoder();

          for await (const chunk of response.body ?? []) {
            // Other tests count requests, so only the live test reacts to the setup writes.
            if (live && decoder.decode(chunk).includes("event: change"))
              for (const listener of this.listeners) listener();
          }
        })
        .catch(() => undefined);
    }
    addEventListener(_name: string, listener: () => void) {
      this.listeners.push(listener);
    }
    close() {
      streams.abort();
    }
  } as never;
  window.addEventListener("unload", () => streams.abort());

  window.eval(await (await fetch(`${base}/app.js`)).text());
  await eventually(() => window.document.querySelector('[data-task="move-task"]') !== null);

  return { dom, window, requests };
}

test("React assets and task APIs preserve document rendering, status writes, and other file content", async () => {
  await fixture(async (base, tasks) => {
    assert.equal((await board(base)).tasks.length, 0);
    const original = await task(tasks, "account-recovery");
    const data = await board(base);
    assert.equal(data.project, "Project <Atlas>");
    assert.equal(data.tasks.length, 1);
    const html = await (await fetch(base)).text();
    assert.match(html, /<div id="root">/);
    assert.doesNotMatch(html, /type="text\/tsx"/);
    const css = await (await fetch(`${base}/app.css`)).text();
    assert.match(css, /Anthropic Serif/);
    assert.match(css, /99vw/);
    assert.match(css, /90dvh/);
    const script = await (await fetch(`${base}/app.js`)).text();
    assert.doesNotMatch(script, /location\.reload|window\.location/);

    for (const font of ["anthropic-serif.woff2", "anthropic-sans.woff2"]) {
      const response = await fetch(`${base}/fonts/${font}`);
      assert.equal(response.status, 200);
      assert.ok((await response.arrayBuffer()).byteLength > 1000);
    }

    const docs = await (await fetch(`${base}/api/tasks/account-recovery`)).text();
    assert.match(docs, /<table>/);
    assert.doesNotMatch(docs, /<script>alert|href=\\"javascript:/);
    const brief = await readFile(join(tasks, "account-recovery/BRIEF.md"), "utf8");
    const plan = await readFile(join(tasks, "account-recovery/PLAN.md"), "utf8");

    for (const status of ["inprogress", "blocked", "done", "backlog"]) {
      const response = await move(base, data.token, "account-recovery", status);
      assert.equal(response.status, 200);
      assert.equal(Schema.decodeUnknownSync(taskSchema)(await response.json()).status, status);
      const changed = await readFile(join(tasks, "account-recovery/TASK.md"), "utf8");
      assert.match(changed, new RegExp(`^status: ${status}$`, "m"));

      assert.equal(
        changed
          .replace(/^updated:.*$/m, 'updated: "2026-10-28"')
          .replace(/^status:.*$/m, "status: backlog"),
        original,
      );
    }

    assert.equal(await readFile(join(tasks, "account-recovery/BRIEF.md"), "utf8"), brief);
    assert.equal(await readFile(join(tasks, "account-recovery/PLAN.md"), "utf8"), plan);
    const windows = original.replaceAll("\n", "\r\n") + "Persian context: کار\r\n";
    await writeFile(join(tasks, "account-recovery/TASK.md"), windows);
    assert.equal((await move(base, data.token, "account-recovery", "blocked")).status, 200);
    const changed = await readFile(join(tasks, "account-recovery/TASK.md"), "utf8");

    assert.equal(
      changed
        .replace(/^updated:[^\r\n]*/m, 'updated: "2026-10-28"')
        .replace(/^status:[^\r\n]*/m, "status: backlog"),
      windows,
    );
  });
});

test("API rejects invalid writes and symlinks while exposing valid tasks and unavailable documents", async () => {
  await fixture(async (base, tasks) => {
    const original = await task(tasks, "valid-task");
    const token = (await board(base)).token;
    assert.equal((await move(base, "wrong", "valid-task", "done")).status, 403);
    assert.equal(
      (await move(base, token, "valid-task", "done", "https://example.com")).status,
      403,
    );
    assert.equal((await move(base, token, "valid-task", "missing")).status, 400);
    assert.equal((await move(base, token, "../valid-task", "done")).status, 400);
    await mkdir(join(tasks, "Bad_Task"));
    const outside = join(dirname(tasks), "outside");
    await mkdir(outside);
    await writeFile(join(outside, "TASK.md"), original);
    await symlink(outside, join(tasks, "linked-task"));
    await rm(join(tasks, "valid-task/PLAN.md"));
    await symlink(join(outside, "TASK.md"), join(tasks, "valid-task/PLAN.md"));
    const data = await board(base);
    assert.equal(data.tasks.length, 1);
    assert.equal(data.errors.length, 2);
    assert.match(
      await (await fetch(`${base}/api/tasks/valid-task`)).text(),
      /PLAN.md is unavailable/,
    );
    assert.equal((await move(base, token, "linked-task", "done")).status, 400);
    await rm(join(tasks, "valid-task/TASK.md"));
    await symlink(join(outside, "TASK.md"), join(tasks, "valid-task/TASK.md"));
    assert.equal((await move(base, token, "valid-task", "done")).status, 400);
    assert.equal(await readFile(join(outside, "TASK.md"), "utf8"), original);
  });
});

test("React opens the shadcn dialog, switches tabs, moves cards, and cancels keyboard moves without navigation", async () => {
  await fixture(async (base, tasks) => {
    await task(tasks, "move-task");
    const { window, requests } = await mount(base);
    const document = window.document;
    const root = document.getElementById("root");

    try {
      const open = document.querySelector<HTMLButtonElement>("[data-open-task]");
      assert.ok(open);
      open.click();
      await eventually(() => document.querySelector('[role="dialog"] .reader table') !== null);

      const plan = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find(
        (item) => item.textContent === "Plan",
      );

      assert.ok(plan);
      plan.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
      await eventually(
        () =>
          document
            .querySelector('[role="tabpanel"][data-state="active"]')
            ?.textContent?.includes("Implementation") === true,
      );
      assert.equal(requests.filter((path) => path.startsWith("/api/tasks/")).length, 1);
      const close = document.querySelector<HTMLButtonElement>('button[aria-label="Close task"]');
      assert.ok(close);
      close.click();
      await eventually(() => document.querySelector('[role="dialog"]') === null);
      const card = document.querySelector<HTMLElement>('[data-task="move-task"]');
      assert.ok(card);

      for (const key of [" ", "ArrowRight", "Escape"]) {
        card.dispatchEvent(
          new window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
        );
        await new Promise((resolveTurn) => setTimeout(resolveTurn, 5));
      }

      assert.equal(requests.filter((path) => path === "/api/status").length, 0);

      for (const key of [" ", "ArrowRight", "Enter"]) {
        card.dispatchEvent(
          new window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
        );
        await new Promise((resolveTurn) => setTimeout(resolveTurn, 5));
      }

      await eventually(
        () => document.querySelector('[data-status="inprogress"] [data-task="move-task"]') !== null,
      );
      assert.match(await readFile(join(tasks, "move-task/TASK.md"), "utf8"), /^title:/m);
      assert.equal(document.getElementById("root"), root);
      assert.equal(window.location.href, base + "/");
      assert.equal(requests.filter((path) => path === "/api/board").length, 1);
      const dragged = document.querySelector<HTMLElement>('[data-task="move-task"]');
      const blocked = document.querySelector<HTMLElement>('[data-status="blocked"]');
      assert.ok(dragged && blocked);
      const transfer = { setData: () => undefined, effectAllowed: "", dropEffect: "" };
      dragged.dispatchEvent(
        Object.assign(new window.Event("dragstart", { bubbles: true }), { dataTransfer: transfer }),
      );
      blocked.dispatchEvent(
        Object.assign(new window.Event("dragover", { bubbles: true, cancelable: true }), {
          dataTransfer: transfer,
        }),
      );
      blocked.dispatchEvent(new window.Event("drop", { bubbles: true, cancelable: true }));
      await eventually(
        () => document.querySelector('[data-status="blocked"] [data-task="move-task"]') !== null,
      );
      const previousFetch = window.fetch;
      window.fetch = (url, init) =>
        String(url) === "/api/status"
          ? Promise.resolve(new Response("Rejected", { status: 403 }))
          : previousFetch(url, init);
      const rejected = document.querySelector<HTMLElement>('[data-task="move-task"]');
      assert.ok(rejected);

      for (const key of [" ", "ArrowRight", "Enter"]) {
        rejected.dispatchEvent(
          new window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
        );
        await new Promise((resolveTurn) => setTimeout(resolveTurn, 5));
      }

      await eventually(
        () =>
          document.querySelector('[role="alert"]')?.textContent?.includes("Could not confirm") ===
          true,
      );
      assert.ok(document.querySelector('[data-status="blocked"] [data-task="move-task"]'));
      assert.equal(document.querySelector("[data-board]")?.getAttribute("aria-busy"), "false");
    } finally {
      window.close();
    }
  });
});

test("React pointer grip persists status and updates the card without a reload", async () => {
  await fixture(async (base, tasks) => {
    await task(tasks, "move-task");
    const { window } = await mount(base);

    try {
      const target = window.document.querySelector<HTMLElement>('[data-status="done"]');
      assert.ok(target);
      window.document.elementFromPoint = () => target;
      const handle = window.document.querySelector<HTMLButtonElement>("[data-grip]");
      assert.ok(handle);

      for (const [type, x] of [
        ["pointerdown", 0],
        ["pointermove", 50],
        ["pointerup", 50],
      ]) {
        handle.dispatchEvent(
          Object.assign(new window.Event(String(type), { bubbles: true, cancelable: true }), {
            pointerId: 1,
            pointerType: "touch",
            button: 0,
            clientX: x,
            clientY: 20,
          }),
        );
        await new Promise((resolveTurn) => setTimeout(resolveTurn, 5));
      }

      await eventually(
        () =>
          window.document.querySelector('[data-status="done"] [data-task="move-task"]') !== null,
      );
      assert.match(await readFile(join(tasks, "move-task/TASK.md"), "utf8"), /^title:/m);
    } finally {
      window.close();
    }
  });
});

test("columns reorder by keyboard and pointer, persist, drive card moves, and reset", async () => {
  await fixture(async (base, tasks) => {
    await task(tasks, "move-task");
    const { window } = await mount(base);
    const document = window.document;

    const order = () =>
      Array.from(document.querySelectorAll<HTMLElement>("[data-board] > [data-status]")).map(
        (column) => column.dataset.status,
      );

    const press = (element: Element, key: string) =>
      element.dispatchEvent(new window.KeyboardEvent("keydown", { key, bubbles: true }));

    const settled = (expected: string[]) =>
      eventually(() => JSON.stringify(order()) === JSON.stringify(expected));

    const grip = (status: string) => {
      const element = document.querySelector(`[data-column-grip="${status}"]`);
      assert.ok(element);

      return element;
    };

    const tick = () => new Promise((resolveTurn) => setTimeout(resolveTurn, 10));

    try {
      assert.deepEqual(order(), ["backlog", "inprogress", "blocked", "done"]);

      // Escape returns to the saved order without persisting anything.
      press(grip("done"), " ");
      await eventually(() => document.querySelector('[data-lifted="keyboard"]') !== null);
      press(grip("done"), "ArrowLeft");
      await settled(["backlog", "inprogress", "done", "blocked"]);
      press(grip("done"), "Escape");
      await settled(["backlog", "inprogress", "blocked", "done"]);
      assert.equal(window.localStorage.getItem("factory-columns"), null);

      // Enter commits and the choice is remembered.
      press(grip("done"), " ");
      await eventually(() => document.querySelector('[data-lifted="keyboard"]') !== null);
      press(grip("done"), "ArrowLeft");
      await settled(["backlog", "inprogress", "done", "blocked"]);
      press(grip("done"), "ArrowLeft");
      await settled(["backlog", "done", "inprogress", "blocked"]);
      press(grip("done"), "Enter");
      await eventually(() => document.querySelector("[data-lifted]") === null);
      assert.equal(
        window.localStorage.getItem("factory-columns"),
        "queue,backlog,done,inprogress,blocked",
      );

      // Card keyboard moves walk the columns in their on-screen order.
      const card = document.querySelector<HTMLElement>('[data-task="move-task"]');
      assert.ok(card);
      press(card, " ");
      await eventually(() => card.textContent?.includes("Moving to Backlog") === true);
      press(card, "ArrowRight");
      await eventually(() => card.textContent?.includes("Moving to Done") === true);
      press(card, "Escape");
      await eventually(() => card.textContent?.includes("Moving to") === false);

      // A mouse drag on a column header previews and commits the new slot.
      Object.defineProperty(window.HTMLElement.prototype, "offsetLeft", {
        configurable: true,
        get(this: HTMLElement) {
          return this.parentElement
            ? Array.from(this.parentElement.children).indexOf(this) * 300
            : 0;
        },
      });
      const head = document.querySelector('[data-column-head="blocked"]');
      assert.ok(head);

      for (const [type, x] of [
        ["pointerdown", 950],
        ["pointermove", 960],
        ["pointermove", 100],
        ["pointerup", 100],
      ] as const) {
        head.dispatchEvent(
          Object.assign(new window.Event(type, { bubbles: true, cancelable: true }), {
            pointerId: 7,
            pointerType: "mouse",
            button: 0,
            clientX: x,
            clientY: 10,
          }),
        );
        await tick();
      }

      await settled(["blocked", "backlog", "done", "inprogress"]);
      assert.equal(
        window.localStorage.getItem("factory-columns"),
        "queue,blocked,backlog,done,inprogress",
      );

      const reset = Array.from(document.querySelectorAll("button")).find(
        (button) => button.textContent === "Reset columns",
      );

      assert.ok(reset);
      reset.click();
      await settled(["backlog", "inprogress", "blocked", "done"]);
      assert.equal(window.localStorage.getItem("factory-columns"), null);
    } finally {
      window.close();
    }
  });
});

test("a saved column order that does not name every status falls back to the default", async () => {
  await fixture(async (base, tasks) => {
    await task(tasks, "move-task");
    const { window } = await mount(base, false, { "factory-columns": "done,backlog,done,blocked" });

    try {
      assert.deepEqual(
        Array.from(
          window.document.querySelectorAll<HTMLElement>("[data-board] > [data-status]"),
        ).map((column) => column.dataset.status),
        ["backlog", "inprogress", "blocked", "done"],
      );
    } finally {
      window.close();
    }
  });
});

test("a column order saved before the Queue column keeps its statuses behind Queue", async () => {
  await fixture(async (base, tasks) => {
    await task(tasks, "move-task");

    const { window } = await mount(base, false, {
      "factory-columns": "done,blocked,inprogress,backlog",
    });

    try {
      assert.deepEqual(
        Array.from(
          window.document.querySelectorAll<HTMLElement>("[data-board] > [data-column]"),
        ).map((column) => column.dataset.column),
        ["queue", "done", "blocked", "inprogress", "backlog"],
      );
    } finally {
      window.close();
    }
  });
});

test("the right-click menu changes a task's status and closes without writing on Escape", async () => {
  await fixture(async (base, tasks) => {
    await task(tasks, "move-task");
    const { window, requests } = await mount(base);
    const document = window.document;

    const rightClick = (target: Element) =>
      target.dispatchEvent(
        new window.MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: 40,
          clientY: 50,
        }),
      );

    try {
      const card = document.querySelector('[data-task="move-task"]');
      assert.ok(card);
      assert.equal(rightClick(card), false, "the browser's own menu is replaced");
      await eventually(() => document.querySelector('[role="menu"]') !== null);

      const options = document.querySelectorAll<HTMLElement>('[role="menuitemradio"]');
      assert.equal(options.length, 4);
      assert.equal(
        document.querySelector('[aria-checked="true"]')?.getAttribute("data-status-option"),
        "backlog",
      );

      document
        .querySelector('[role="menu"]')
        ?.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await eventually(() => document.querySelector('[role="menu"]') === null);
      assert.equal(requests.filter((path) => path === "/api/status").length, 0);

      rightClick(card);
      await eventually(() => document.querySelector('[role="menu"]') !== null);
      document.querySelector<HTMLElement>('[data-status-option="blocked"]')?.click();
      await eventually(
        () => document.querySelector('[data-status="blocked"] [data-task="move-task"]') !== null,
      );
      assert.equal(document.querySelector('[role="menu"]'), null);
      assert.match(await readFile(join(tasks, "move-task/TASK.md"), "utf8"), /^status: blocked$/m);
      assert.match(await readFile(join(tasks, "move-task/TASK.md"), "utf8"), /^owner: ADMIN$/m);
    } finally {
      window.close();
    }
  });
});

test("the Queue column lists backlog.md, filters, and takes no card drops", async () => {
  await fixture(async (base, tasks) => {
    await task(tasks, "move-task");
    await writeFile(
      join(tasks, "backlog.md"),
      "- [ ] Export invoices\n  customers keep asking\n- [x] Rate limit → 001-rate-limit\n",
    );
    const { window } = await mount(base);
    const document = window.document;

    try {
      const queue = document.querySelector('[data-column="queue"]');
      assert.ok(queue);
      assert.equal(queue.querySelectorAll("[data-queue-item]").length, 2);
      assert.match(queue.textContent ?? "", /customers keep asking/);
      assert.match(queue.textContent ?? "", /→ 001-rate-limit/);

      const transfer = { setData: () => undefined, effectAllowed: "", dropEffect: "" };
      document.querySelector('[data-task="move-task"]')?.dispatchEvent(
        Object.assign(new window.Event("dragstart", { bubbles: true }), {
          dataTransfer: transfer,
        }),
      );
      await new Promise((resolveTurn) => setTimeout(resolveTurn, 5));
      assert.equal(
        queue.dispatchEvent(
          Object.assign(new window.Event("dragover", { bubbles: true, cancelable: true }), {
            dataTransfer: transfer,
          }),
        ),
        true,
        "a card cannot be dropped on the queue",
      );
    } finally {
      window.close();
    }
  });
});

test("a task opens every Markdown file, follows links between them, and shows its blocker", async () => {
  await fixture(async (base, tasks) => {
    await task(tasks, "move-task");
    const blocked = join(tasks, "stuck-task");

    await mkdir(blocked);
    await writeFile(
      join(blocked, "TASK.md"),
      '---\ntitle: "Stuck"\ncreated: "2026-10-28"\nupdated: "2026-10-28"\nstatus: blocked\nblocker: Waiting on API keys\n---\n',
    );
    await writeFile(join(tasks, "move-task/REVIEW.md"), "# Review\n\n[the plan](PLAN.md)\n");
    await mkdir(join(tasks, "move-task/design"));
    await writeFile(join(tasks, "move-task/design/notes.md"), "# Notes\n");
    await mkdir(join(tasks, "move-task/evidence"));
    await writeFile(join(tasks, "move-task/evidence/raw.md"), "raw");
    await symlink(join(tasks, "move-task/PLAN.md"), join(tasks, "move-task/linked.md"));

    const { window } = await mount(base);
    const document = window.document;

    try {
      assert.match(
        document.querySelector('[data-blocker="stuck-task"]')?.textContent ?? "",
        /Waiting on API keys/,
      );
      document.querySelector<HTMLElement>('[data-open-task="move-task"]')?.click();
      await eventually(() => document.querySelector('[role="dialog"] .reader') !== null);
      await eventually(() => document.querySelectorAll('[role="tab"]').length > 4);
      assert.deepEqual(
        Array.from(document.querySelectorAll('[role="tab"]')).map((tab) => tab.textContent),
        ["Intent", "Design", "Plan", "Debrief", "Task", "Review", "design/notes"],
      );

      const review = Array.from(document.querySelectorAll('[role="tab"]')).find(
        (tab) => tab.textContent === "Review",
      );

      assert.ok(review);
      review.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
      await eventually(
        () => document.querySelector('[data-state="active"][role="tabpanel"] a') !== null,
      );
      document.querySelector<HTMLElement>('[data-state="active"][role="tabpanel"] a')?.click();
      await eventually(
        () =>
          document
            .querySelector('[role="tabpanel"][data-state="active"]')
            ?.textContent?.includes("Implementation") === true,
      );
      assert.equal(window.location.href, base + "/");
    } finally {
      window.close();
    }

    await rm(join(tasks, "backlog.md"), { force: true });
    await symlink(join(tasks, "move-task/PLAN.md"), join(tasks, "backlog.md"));
    const listed = await (await fetch(`${base}/api/board`)).json();
    assert.deepEqual(listed.backlog, []);
  });
});

test("every view renders the same tasks, switches by click and shortcut, and filters", async () => {
  await fixture(async (base, tasks) => {
    await task(tasks, "move-task");
    const { window } = await mount(base);
    const document = window.document;

    const openIds = () =>
      Array.from(document.querySelectorAll<HTMLElement>("[data-open-task]")).map(
        (item) => item.dataset.openTask,
      );

    const choose = (view: string) =>
      document.querySelector<HTMLButtonElement>(`[data-view="${view}"]`)?.click();

    try {
      for (const view of ["pipeline", "focus", "hill", "timeline", "table"]) {
        choose(view);
        await eventually(
          () => document.querySelector(`[data-view="${view}"][aria-current="page"]`) !== null,
        );
        await eventually(() => openIds().includes("move-task"));
        assert.equal(document.querySelector("[data-board]"), null);
      }

      assert.equal(window.localStorage.getItem("factory-view"), "table");

      // The table's status control writes through the same status endpoint.
      const select = document.querySelector<HTMLSelectElement>("select");
      assert.ok(select);

      const setValue = Object.getOwnPropertyDescriptor(
        window.HTMLSelectElement.prototype,
        "value",
      )?.set;

      setValue?.call(select, "done");
      select.dispatchEvent(new window.Event("change", { bubbles: true }));
      await eventually(() => document.querySelector("select")?.value === "done");
      assert.match(await readFile(join(tasks, "move-task/TASK.md"), "utf8"), /^status: done$/m);

      window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "7", bubbles: true }));
      await eventually(
        () => document.querySelector('[data-view="portfolio"][aria-current="page"]') !== null,
      );
      await eventually(() => document.querySelector("[data-portfolio-project]") !== null);

      window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "1", bubbles: true }));
      await eventually(() => document.querySelector("[data-board]") !== null);

      const filter = document.querySelector<HTMLInputElement>('input[type="search"]');
      assert.ok(filter);

      const setText = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;

      setText?.call(filter, "zzz-no-match");
      filter.dispatchEvent(new window.Event("input", { bubbles: true }));
      await eventually(() => document.querySelector('[data-task="move-task"]') === null);
    } finally {
      window.close();
    }
  });
});

test("one board reads the project it was started with", async () => {
  await fixture(async (base, tasks) => {
    await task(tasks, "local-project-task");
    const data = await board(base);
    assert.equal(data.project, "Project <Atlas>");
    assert.deepEqual(data.errors, []);
    assert.deepEqual(
      data.tasks.map((item) => item.id),
      ["local-project-task"],
    );
    const response = await move(base, data.token, "local-project-task", "blocked");
    assert.equal(response.status, 200);
    assert.match(await readFile(join(tasks, "local-project-task/TASK.md"), "utf8"), /^title:/m);
    assert.equal((await fetch(`${base}/app.js`)).status, 200);
    assert.equal((await fetch(`${base}/fonts/anthropic-serif.woff2`)).status, 200);
  });
});

const countsSchema = Schema.Struct({
  tasks: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      status: Schema.String,
      file: Schema.String,
      subtasks: Schema.Struct({ total: Schema.Number, done: Schema.Number }),
    }),
  ),
});

const detailSchema = Schema.Struct({
  subtasks: Schema.Array(
    Schema.Struct({ id: Schema.String, status: Schema.String, file: Schema.String }),
  ),
});

test("tasks are listed with their metadata status, misnamed directories are reported, and nested subtasks are counted", async () => {
  await fixture(async (base, tasks) => {
    await task(tasks, "parent-task", "inprogress");
    await task(tasks, "done-backlog", "blocked");
    const subtasks = join(tasks, "parent-task", "subtasks");
    await task(subtasks, "first-step", "done");
    await task(subtasks, "second-step", "backlog");
    await task(join(subtasks, "second-step", "subtasks"), "deep-step", "done");
    await mkdir(join(subtasks, "second-step", "deeper", "not-a-task"), { recursive: true });
    await mkdir(join(tasks, "parent-task", "design"));
    await writeFile(join(tasks, "parent-task", "design", "mock.html"), "<p>mock</p>");
    await mkdir(join(tasks, "Not_A_Task"));

    const data = await board(base);
    assert.ok(
      data.errors.some((error) => error.startsWith("Not_A_Task: task directories are named")),
    );

    const listed = Schema.decodeUnknownSync(countsSchema)(
      await (await fetch(`${base}/api/board`)).json(),
    );

    assert.deepEqual(
      listed.tasks.map((item) => [item.id, item.status, item.file]),
      [
        ["done-backlog", "blocked", join(tasks, "done-backlog/TASK.md")],
        ["parent-task", "inprogress", join(tasks, "parent-task/TASK.md")],
      ],
    );
    assert.deepEqual(listed.tasks[1]?.subtasks, { total: 3, done: 2 });
  });
});

test("moving edits the status in TASK and leaves the directory and subtasks in place", async () => {
  await fixture(async (base, tasks) => {
    await task(tasks, "parent-task", "inprogress");
    const parent = join(tasks, "parent-task");
    await task(join(parent, "subtasks"), "first-step", "done");
    const { token } = await board(base);

    const response = await move(base, token, "parent-task", "done");
    assert.equal(response.status, 200);
    assert.equal(
      Schema.decodeUnknownSync(Schema.Struct({ file: Schema.String }))(await response.json()).file,
      join(tasks, "parent-task/TASK.md"),
    );
    assert.match(await readFile(join(parent, "TASK.md"), "utf8"), /^status: done$/m);
    assert.match(
      await readFile(join(parent, "subtasks/first-step/TASK.md"), "utf8"),
      /^status: done$/m,
    );
    assert.equal((await fetch(`${base}/api/tasks/parent-task/first-step`)).status, 200);

    assert.equal((await move(base, token, "parent-task/first-step", "backlog")).status, 200);
    assert.match(
      await readFile(join(parent, "subtasks/first-step/TASK.md"), "utf8"),
      /^status: backlog$/m,
    );
    assert.equal((await move(base, token, "parent-task/missing", "done")).status, 404);
  });
});

test("task detail lists nested subtasks and serves their documents by path", async () => {
  await fixture(async (base, tasks) => {
    await task(tasks, "parent-task", "inprogress");
    const subtasks = join(tasks, "parent-task", "subtasks");
    await task(subtasks, "first-step", "done");
    await task(join(subtasks, "first-step", "subtasks"), "deep-step", "backlog");

    const detail = Schema.decodeUnknownSync(detailSchema)(
      await (await fetch(`${base}/api/tasks/parent-task`)).json(),
    );

    assert.deepEqual(
      detail.subtasks.map((item) => [item.id, item.status, item.file]),
      [["parent-task/first-step", "done", join(tasks, "parent-task/subtasks/first-step/TASK.md")]],
    );
    assert.equal((await fetch(`${base}/api/tasks/parent-task/first-step`)).status, 200);
    assert.equal((await fetch(`${base}/api/tasks/parent-task/first-step/deep-step`)).status, 200);
    assert.equal((await fetch(`${base}/api/tasks/parent-task/missing`)).status, 404);
  });
});

test("React board refreshes when task files change on disk", async () => {
  await fixture(async (base, tasks) => {
    await task(tasks, "move-task");
    const { window } = await mount(base, true);

    try {
      const created = await task(tasks, "new-task");
      await eventually(() => window.document.querySelector('[data-task="new-task"]') !== null);
      await writeFile(
        join(tasks, "new-task/TASK.md"),
        created.replace("status: backlog", "status: done"),
      );
      await eventually(
        () => window.document.querySelector('[data-status="done"] [data-task="new-task"]') !== null,
      );
    } finally {
      window.close();
    }
  });
});

test("projects can be added, scoped by id, and removed at runtime", async () => {
  await fixture(async (base, tasks) => {
    await task(tasks, "first-task");
    const other = await mkdtemp(join(tmpdir(), "factory other "));

    try {
      await task(join(dirname(tasks), basename(other)), "second-task");
      const first = await board(base);
      const form = { "Content-Type": "application/x-www-form-urlencoded", Origin: base };

      const added = await fetch(`${base}/api/projects/add`, {
        method: "POST",
        headers: form,
        body: new URLSearchParams({ token: first.token, path: other }),
      });

      assert.equal(added.status, 200);

      const { id } = Schema.decodeUnknownSync(Schema.Struct({ id: Schema.String }))(
        await added.json(),
      );

      const scoped = await (await fetch(`${base}/api/board?project=${id}`)).json();
      assert.deepEqual(
        scoped.tasks.map((item: { id: string }) => item.id),
        ["second-task"],
      );
      assert.equal(scoped.projects.length, 2);

      assert.equal((await board(base)).tasks[0]?.id, "first-task");

      const refused = await fetch(`${base}/api/projects/add`, {
        method: "POST",
        headers: form,
        body: new URLSearchParams({ token: "wrong", path: other }),
      });

      assert.equal(refused.status, 403);

      const removed = await fetch(`${base}/api/projects/remove`, {
        method: "POST",
        headers: form,
        body: new URLSearchParams({ token: first.token, id }),
      });

      assert.equal(removed.status, 200);

      assert.equal((await fetch(`${base}/api/board?project=${id}`)).status, 404);
    } finally {
      await rm(other, { recursive: true, force: true });
    }
  });
});

test("folder picker needs the board token and theme script is served", async () => {
  await fixture(async (base) => {
    const refused = await fetch(`${base}/api/projects/pick`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: base },
      body: new URLSearchParams({ token: "wrong" }),
    });

    assert.equal(refused.status, 403);
    assert.match(await (await fetch(`${base}/theme.js`)).text(), /factory-theme/);
  });
});

test("HTML tasks load, render sanitized, and move alongside Markdown tasks", async () => {
  await fixture(async (base, tasks) => {
    await task(tasks, "legacy-task");
    const directory = join(tasks, "html-task");
    await mkdir(directory, { recursive: true });

    const page = (title: string, body: string, meta = "") =>
      `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${meta}<style>body{}</style></head><body><main><h1>${title}</h1>${body}</main></body></html>`;

    const original = page(
      "Fix &lt;login&gt; flow",
      "<h2>Plan</h2><table><tr><td>R1</td></tr></table><script>alert('unsafe')</script>",
      '<meta name="created" content="2026-10-28"><meta name="updated" content="2026-10-28"><meta name="status" content="backlog">',
    );

    await writeFile(join(directory, "TASK.html"), original);
    await writeFile(join(directory, "BRIEF.html"), page("Brief", "<p>Brief body</p>"));
    await writeFile(join(directory, "PLAN.html"), page("Plan", "<p>Plan body</p>"));

    const data = await board(base);
    const found = data.tasks.find((entry) => entry.id === "html-task");
    assert.equal(found?.title, "Fix <login> flow");
    assert.ok(data.tasks.some((entry) => entry.id === "legacy-task"));

    const docs = await (await fetch(`${base}/api/tasks/html-task`)).text();
    assert.match(docs, /Brief body/);
    assert.match(docs, /Plan body/);
    assert.doesNotMatch(docs, /<script|<style|<h1/);

    const response = await move(base, data.token, "html-task", "done");
    assert.equal(response.status, 200);
    const changed = await readFile(join(tasks, "html-task/TASK.html"), "utf8");
    assert.match(changed, /<meta name="updated" content="\d{4}-\d{2}-\d{2}">/);
    assert.equal(
      changed
        .replace(
          /<meta name="updated" content="[^"]*">/,
          '<meta name="updated" content="2026-10-28">',
        )
        .replace('content="done"', 'content="backlog"'),
      original,
    );
  });
});

const documentsSchema = Schema.Struct({
  intent: Schema.String,
  design: Schema.String,
  plan: Schema.String,
  debrief: Schema.String,
});

async function documents(base: string, id: string) {
  return Schema.decodeUnknownSync(documentsSchema)(
    await (await fetch(`${base}/api/tasks/${id}`)).json(),
  );
}

test("intent prefers INTENT over BRIEF, falls back to BRIEF, and optional documents never error", async () => {
  await fixture(async (base, tasks) => {
    await task(tasks, "legacy-task");
    await task(tasks, "intent-task");
    const directory = join(tasks, "intent-task");
    await writeFile(
      join(directory, "INTENT.html"),
      "<html><body><main><h1>Intent</h1><p>Intent body</p></main></body></html>",
    );
    await writeFile(join(directory, "DESIGN.md"), "# Design\n\nDesign body\n");
    await writeFile(
      join(directory, "DEBRIEF.html"),
      "<html><body><main><p>Debrief body</p></main></body></html>",
    );

    const preferred = await documents(base, "intent-task");
    assert.match(preferred.intent, /Intent body/);
    assert.doesNotMatch(preferred.intent, /Recover access/);
    assert.match(preferred.design, /Design body/);
    assert.match(preferred.debrief, /Debrief body/);

    await writeFile(join(directory, "INTENT.md"), "# Intent\n\nMarkdown wins\n");
    assert.match((await documents(base, "intent-task")).intent, /Markdown wins/);

    const legacy = await documents(base, "legacy-task");
    assert.match(legacy.intent, /<table>/);
    assert.match(legacy.plan, /Implementation/);
    assert.match(legacy.design, /Not written yet/);
    assert.match(legacy.debrief, /Not written yet/);

    await writeFile(join(tasks, "legacy-task/INTENT.md"), "# Intent\n\nMarkdown intent body\n");
    assert.match((await documents(base, "legacy-task")).intent, /Markdown intent body/);

    const outside = join(dirname(tasks), "outside.md");
    await writeFile(outside, "secret design");
    await symlink(outside, join(tasks, "legacy-task/DESIGN.md"));
    const linked = await documents(base, "legacy-task");
    assert.match(linked.design, /DESIGN.md is unavailable/);
    assert.doesNotMatch(linked.design, /secret design/);
  });
});

test("optional task stage is parsed from TASK.html and TASK.md and shown as a card badge", async () => {
  await fixture(async (base, tasks) => {
    await task(tasks, "move-task");
    const markdownTask = join(tasks, "markdown-stage");
    await mkdir(markdownTask, { recursive: true });
    await writeFile(
      join(markdownTask, "TASK.md"),
      `---\ntitle: "Markdown stage"\ncreated: "2026-10-28"\nupdated: "2026-10-28"\nstage: design\n---\n`,
    );
    const html = join(tasks, "html-stage");
    await mkdir(html, { recursive: true });
    await writeFile(
      join(html, "TASK.html"),
      '<!doctype html><html><head><title>HTML stage</title><meta name="created" content="2026-10-28"><meta name="updated" content="2026-10-28"><meta name="stage" content="build"></head><body></body></html>',
    );
    const unknown = join(tasks, "unknown-stage");
    await mkdir(unknown, { recursive: true });
    await writeFile(
      join(unknown, "TASK.md"),
      `---\ntitle: "Unknown stage"\ncreated: "2026-10-28"\nupdated: "2026-10-28"\nstage: shipping\n---\n`,
    );

    const listed = Schema.decodeUnknownSync(
      Schema.Struct({
        tasks: Schema.Array(
          Schema.Struct({ id: Schema.String, stage: Schema.optional(Schema.String) }),
        ),
      }),
    )(await (await fetch(`${base}/api/board`)).json());

    assert.deepEqual(Object.fromEntries(listed.tasks.map((item) => [item.id, item.stage])), {
      "html-stage": "build",
      "markdown-stage": "design",
      "move-task": undefined,
      "unknown-stage": undefined,
    });

    const { window } = await mount(base);
    const document = window.document;

    try {
      const badge = (id: string) =>
        document.querySelector(`[data-task="${id}"] [data-stage]`)?.textContent ?? null;

      assert.equal(badge("html-stage"), "build");
      assert.equal(badge("markdown-stage"), "design");
      assert.equal(badge("move-task"), null);
      assert.equal(badge("unknown-stage"), null);

      document.querySelector<HTMLButtonElement>('[data-open-task="move-task"]')?.click();
      await eventually(() => document.querySelector('[role="dialog"] .reader table') !== null);
      assert.deepEqual(
        Array.from(document.querySelectorAll('[role="tab"]')).map((item) => item.textContent),
        ["Intent", "Design", "Plan", "Debrief", "Task"],
      );
      assert.equal(
        document.querySelector('[role="tab"][data-state="active"]')?.textContent,
        "Intent",
      );
    } finally {
      window.close();
    }
  });
});
