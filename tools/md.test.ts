import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const viewer = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "tools", "md.ts");

function isolated(run: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), "md viewer "));

  try {
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const render = (...args: string[]) =>
  spawnSync(process.execPath, [viewer, "--no-open", ...args], { encoding: "utf8" });

test("renders frontmatter, mermaid and linked Markdown documents as styled pages", () =>
  isolated((directory) => {
    const task = join(directory, "task");
    const out = join(directory, "out");
    mkdirSync(join(task, "design"), { recursive: true });
    writeFileSync(
      join(task, "TASK.md"),
      '---\ntitle: Ship <it>\ncreated: "2026-11-03"\nstatus: inprogress\n---\n\n# Ship it\n\nSee [the plan](PLAN.md#steps) and [missing](GONE.md).\n',
    );
    writeFileSync(
      join(task, "PLAN.md"),
      "# Plan\n\n## Steps\n\n```mermaid\ngraph TD; A-->B\n```\n",
    );

    const result = render(join(task, "TASK.md"), "--out", out);
    assert.equal(result.status, 0, result.stderr);
    const page = readFileSync(result.stdout.trim(), "utf8");
    assert.match(page, /<title>Ship &lt;it&gt;<\/title>/);
    assert.match(page, /<b>status<\/b>inprogress/);
    assert.match(page, /--clay:/);
    assert.match(page, /href="file:\/\/[^"]*PLAN-[0-9a-f]{8}\.html#steps"/);
    assert.match(page, /href="GONE\.md"/);
    assert.doesNotMatch(page, /mermaid@/);

    const files = readdirSync(out).sort();
    assert.equal(files.length, 2);

    const plan = readFileSync(
      join(
        out,
        files.find((name) => name.startsWith("PLAN-"))!,
      ),
      "utf8",
    );

    assert.match(plan, /<pre class="mermaid">graph TD; A--&gt;B<\/pre>/);
    assert.match(plan, /mermaid@/);
  }));

test("rejects missing files and unknown options", () =>
  isolated((directory) => {
    assert.notEqual(render(join(directory, "none.md")).status, 0);
    assert.notEqual(render("--bogus", join(directory, "none.md")).status, 0);
    assert.notEqual(render().status, 0);
  }));
