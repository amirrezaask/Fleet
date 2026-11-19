import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const installer = join(root, "tools", "install.ts");

const skill = readdirSync(join(root, "skills"))
  .sort()
  .find(
    (name) =>
      !["agentic-memory", "change-review"].includes(name) &&
      existsSync(join(root, "skills", name, "SKILL.md")),
  );

assert.ok(skill);

function isolated(run: (home: string) => void): void {
  const home = mkdtempSync(join(tmpdir(), "agent home "));

  try {
    run(home);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

function invoke(home: string, ...args: string[]) {
  return spawnSync(process.execPath, [installer, ...args], {
    env: { ...process.env, HOME: home },
    encoding: "utf8",
  });
}

test("list and dry-run do not write to HOME; invalid input fails", () =>
  isolated((home) => {
    assert.equal(invoke(home, "--list").status, 0);
    assert.equal(invoke(home, "--dry-run").status, 0);
    assert.deepEqual(readdirSync(home), []);
    assert.notEqual(invoke(home, "--unknown").status, 0);
    assert.notEqual(invoke(home, "../missing").status, 0);
    assert.deepEqual(readdirSync(home), []);
  }));

test("installs individual skills and globals; repeated installs preserve unrelated files", () =>
  isolated((home) => {
    const base = join(home, ".agents", "skills");
    mkdirSync(base, { recursive: true });
    writeFileSync(join(base, "unrelated"), "keep");
    assert.equal(invoke(home).status, 0);
    assert.equal(lstatSync(base).isDirectory(), true);
    assert.equal(readlinkSync(join(base, skill)), join(root, "skills", skill));
    assert.equal(readlinkSync(join(home, ".codex", "AGENTS.md")), join(root, "AGENTS.md"));
    assert.equal(readlinkSync(join(home, ".local", "bin", "md")), join(root, "tools", "md.ts"));
    assert.equal(existsSync(join(home, ".agents", "tools")), false);
    assert.equal(existsSync(join(home, ".agents", ".git")), false);
    assert.equal(existsSync(join(home, ".agents", "memory", "MEMORY.md")), true);
    assert.equal(existsSync(join(home, ".agents", ".gitignore")), true);
    assert.equal(invoke(home).status, 0);
    assert.equal(readFileSync(join(base, "unrelated"), "utf8"), "keep");
  }));

test("collisions fail preflight without changing globals or existing content", () =>
  isolated((home) => {
    const base = join(home, ".claude", "skills", skill);
    mkdirSync(base, { recursive: true });
    writeFileSync(join(base, "saved"), "keep");
    assert.notEqual(invoke(home).status, 0);
    assert.equal(readFileSync(join(base, "saved"), "utf8"), "keep");
    assert.equal(existsSync(join(home, ".agents")), false);
  }));

test("migrates known legacy links and only removes managed retired skills", () =>
  isolated((home) => {
    const base = join(home, ".agents", "skills");
    mkdirSync(base, { recursive: true });
    const old = join(home, "dev", "Amirreza.md", "skills");
    symlinkSync(join(old, skill), join(base, skill));
    symlinkSync(join(old, "amirreza-md"), join(base, "amirreza-md"));

    if (!existsSync(join(root, "skills", "dod")))
      symlinkSync(join(home, "unrelated", "dod"), join(base, "dod"));
    assert.equal(invoke(home).status, 0);
    assert.equal(readlinkSync(join(base, skill)), join(root, "skills", skill));

    if (!existsSync(join(root, "skills", "amirreza-md")))
      assert.throws(() => lstatSync(join(base, "amirreza-md")));

    if (!existsSync(join(root, "skills", "dod")))
      assert.equal(readlinkSync(join(base, "dod")), join(home, "unrelated", "dod"));
  }));

test("selected install includes global workflow skills; foreign symlinks are preserved", () =>
  isolated((home) => {
    assert.equal(invoke(home, skill).status, 0);
    assert.deepEqual(
      readdirSync(join(home, ".agents", "skills")).sort(),
      [skill, "agentic-memory", "change-review"].sort(),
    );
    const destination = join(home, ".codex", "skills", skill);
    rmSync(destination);
    symlinkSync(join(home, "foreign"), destination);
    assert.notEqual(invoke(home, skill).status, 0);
    assert.equal(readlinkSync(destination), join(home, "foreign"));
  }));

test("symlinked skills destination is rejected before writing through it", () =>
  isolated((home) => {
    const foreign = join(home, "foreign");
    mkdirSync(foreign);
    mkdirSync(join(home, ".agents"));
    symlinkSync(foreign, join(home, ".agents", "skills"));
    assert.notEqual(invoke(home).status, 0);
    assert.deepEqual(readdirSync(foreign), []);
  }));

test("symlinked cursor parent is rejected and legacy root installer links are cleaned", () =>
  isolated((home) => {
    const foreign = join(home, "foreign");
    mkdirSync(foreign);
    symlinkSync(foreign, join(home, ".cursor"));
    assert.notEqual(invoke(home).status, 0);
    assert.deepEqual(readdirSync(foreign), []);
    rmSync(join(home, ".cursor"));
    mkdirSync(join(home, ".agents"));
    symlinkSync(join(root, "install.sh"), join(home, ".agents", "install.sh"));
    assert.equal(invoke(home).status, 0);
    assert.throws(() => lstatSync(join(home, ".agents", "install.sh")));
  }));

test("removes any retired old-source skill link but preserves unrelated links and directories", () =>
  isolated((home) => {
    const base = join(home, ".cursor", "skills-cursor");
    mkdirSync(base, { recursive: true });
    symlinkSync(join(home, "dev", "Amirreza.md", "skills", "code-style"), join(base, "code-style"));
    symlinkSync(join(home, "foreign", "poweruser-usability"), join(base, "poweruser-usability"));
    mkdirSync(join(base, "typescript-performance"));
    assert.equal(invoke(home).status, 0);
    assert.throws(() => lstatSync(join(base, "code-style")));
    assert.equal(
      readlinkSync(join(base, "poweruser-usability")),
      join(home, "foreign", "poweruser-usability"),
    );
    assert.equal(lstatSync(join(base, "typescript-performance")).isDirectory(), true);
  }));

const globalDirectories = [".agents", ".codex", ".claude"];

const templateNames = ["INTENT", "DESIGN", "PLAN", "DEBRIEF", "REVIEW", "SPEC"].map(
  (kind) => `${kind}_TEMPLATE.md`,
);

const factoryTemplate = (name: string) =>
  join(
    root,
    "skills",
    "factory",
    "templates",
    name === "SPEC_TEMPLATE.md" ? "AREA_TEMPLATE.md" : name,
  );

test("seeds the vault without replacing files agents or Obsidian changed", () =>
  isolated((home) => {
    const index = join(home, ".agents", "memory", "MEMORY.md");
    mkdirSync(dirname(index), { recursive: true });
    writeFileSync(index, "mine");
    assert.equal(invoke(home).status, 0);
    assert.equal(readFileSync(index, "utf8"), "mine");
    assert.equal(existsSync(join(home, ".agents", ".obsidian", "app.json")), true);
  }));

test("dry-run keeps Factory template aliases and installs retire them; foreign ones stay", () =>
  isolated((home) => {
    const foreign = join(home, "foreign.md");
    writeFileSync(foreign, "mine");

    for (const directory of globalDirectories) {
      mkdirSync(join(home, directory));

      for (const name of templateNames)
        symlinkSync(factoryTemplate(name), join(home, directory, name));
    }

    rmSync(join(home, ".claude", "PLAN_TEMPLATE.md"));
    symlinkSync(foreign, join(home, ".claude", "PLAN_TEMPLATE.md"));

    assert.equal(invoke(home, "--dry-run", skill).status, 0);
    assert.equal(
      readlinkSync(join(home, ".agents", "INTENT_TEMPLATE.md")),
      factoryTemplate("INTENT_TEMPLATE.md"),
    );
    assert.equal(invoke(home, skill).status, 0);

    for (const directory of globalDirectories) {
      for (const name of templateNames) {
        if (directory === ".claude" && name === "PLAN_TEMPLATE.md") continue;
        assert.throws(() => lstatSync(join(home, directory, name)));
      }
    }

    assert.equal(readlinkSync(join(home, ".claude", "PLAN_TEMPLATE.md")), foreign);
  }));

test("retires the managed task board link but keeps a foreign one", () =>
  isolated((home) => {
    const bin = join(home, ".local", "bin");
    mkdirSync(bin, { recursive: true });
    symlinkSync(
      join(root, "skills", "factory", "assets", "task-board", "bin.js"),
      join(bin, "production-line"),
    );
    assert.equal(invoke(home).status, 0);
    assert.throws(() => lstatSync(join(bin, "production-line")));
    symlinkSync(join(home, "foreign"), join(bin, "production-line"));
    assert.equal(invoke(home).status, 0);
    assert.equal(readlinkSync(join(bin, "production-line")), join(home, "foreign"));
  }));

test("missing bundled file or required skill fails before any home mutation", () => {
  for (const missing of ["md", "agentic-memory", "change-review"])
    isolated((temporary) => {
      const fixture = join(temporary, "fixture");
      const home = join(temporary, "home");
      mkdirSync(home);
      mkdirSync(join(fixture, "tools"), { recursive: true });
      writeFileSync(join(fixture, "tools", "install.ts"), readFileSync(installer));
      writeFileSync(join(fixture, "AGENTS.md"), "global");

      if (missing !== "md") writeFileSync(join(fixture, "tools", "md.ts"), "viewer");

      for (const name of ["agentic-memory", "change-review"]) {
        mkdirSync(join(fixture, "skills", name), { recursive: true });

        if (missing !== name) writeFileSync(join(fixture, "skills", name, "SKILL.md"), "skill");
      }

      const result = spawnSync(process.execPath, [join(fixture, "tools", "install.ts")], {
        env: { ...process.env, HOME: home },
        encoding: "utf8",
      });

      assert.notEqual(result.status, 0);
      assert.match(
        result.stderr,
        /Missing bundled global file|Missing required global workflow skill/,
      );
      assert.deepEqual(readdirSync(home), []);
    });
});

const retiredSkills = [
  "factory",
  "communication",
  "specification",
  "atlas",
  "hbs",
  "factory-intent",
  "factory-design",
  "factory-plan",
  "factory-build",
  "factory-test",
];

test("migrates former nested template aliases and retires old workflow skills on selected installs", () =>
  isolated((home) => {
    for (const directory of globalDirectories) {
      const base = join(home, directory);
      mkdirSync(join(base, "skills"), { recursive: true });

      for (const name of retiredSkills)
        symlinkSync(join(root, "skills", name), join(base, "skills", name));

      for (const name of templateNames) {
        const old = name === "SPEC_TEMPLATE.md" ? "specification" : "communication";
        symlinkSync(join(root, "skills", old, "templates", name), join(base, name));
      }
    }

    assert.equal(invoke(home, "--dry-run", skill).status, 0);
    assert.equal(
      lstatSync(join(home, ".agents", "skills", "communication")).isSymbolicLink(),
      true,
    );
    assert.equal(invoke(home, skill).status, 0);

    for (const directory of globalDirectories) {
      for (const name of retiredSkills)
        assert.throws(() => lstatSync(join(home, directory, "skills", name)));

      for (const name of templateNames) assert.throws(() => lstatSync(join(home, directory, name)));
    }
  }));

test("retires managed HTML template aliases on selected installs, including dangling links", () =>
  isolated((home) => {
    const templates = join(root, "skills", "factory", "templates");
    const oldArea = join(root, "skills", "atlas", "templates", "AREA_TEMPLATE.html");
    const oldSpec = join(root, "skills", "atlas", "templates", "AREA_TEMPLATE.md");
    const oldBrief = join(templates, "BRIEF_TEMPLATE.md");
    const foreign = join(home, "PLAN_TEMPLATE.html");
    writeFileSync(foreign, "mine");

    for (const directory of globalDirectories) {
      mkdirSync(join(home, directory));
      symlinkSync(oldArea, join(home, directory, "SPEC_TEMPLATE.html"));
      symlinkSync(
        join(templates, "INTENT_TEMPLATE.html"),
        join(home, directory, "INTENT_TEMPLATE.html"),
      );
      symlinkSync(oldSpec, join(home, directory, "SPEC_TEMPLATE.md"));
      symlinkSync(oldBrief, join(home, directory, "BRIEF_TEMPLATE.md"));
      symlinkSync(foreign, join(home, directory, "PLAN_TEMPLATE.html"));
    }

    assert.equal(invoke(home, "--dry-run", skill).status, 0);
    assert.equal(readlinkSync(join(home, ".agents", "SPEC_TEMPLATE.html")), oldArea);
    assert.equal(invoke(home, skill).status, 0);

    for (const directory of globalDirectories) {
      for (const name of [
        "SPEC_TEMPLATE.html",
        "INTENT_TEMPLATE.html",
        "BRIEF_TEMPLATE.md",
        "SPEC_TEMPLATE.md",
      ])
        assert.throws(() => lstatSync(join(home, directory, name)));
      assert.equal(
        readlinkSync(join(home, directory, "PLAN_TEMPLATE.html")),
        foreign,
        "foreign link kept",
      );
      assert.throws(() => lstatSync(join(home, directory, "skills", "atlas")));
    }
  }));

test("retires the managed BRIEF_TEMPLATE.html alias but keeps foreign ones", () =>
  isolated((home) => {
    const managed = join(root, "skills", "factory", "templates", "BRIEF_TEMPLATE.html");
    const foreign = join(home, "BRIEF_TEMPLATE.html");
    writeFileSync(foreign, "mine");

    for (const [index, directory] of globalDirectories.entries()) {
      mkdirSync(join(home, directory));
      symlinkSync(index === 0 ? foreign : managed, join(home, directory, "BRIEF_TEMPLATE.html"));
    }

    assert.equal(invoke(home, "--dry-run", skill).status, 0);
    assert.equal(readlinkSync(join(home, ".codex", "BRIEF_TEMPLATE.html")), managed);
    assert.equal(invoke(home, skill).status, 0);
    assert.equal(readlinkSync(join(home, ".agents", "BRIEF_TEMPLATE.html")), foreign);

    for (const directory of globalDirectories.slice(1))
      assert.throws(() => lstatSync(join(home, directory, "BRIEF_TEMPLATE.html")));

    for (const directory of globalDirectories)
      assert.equal(existsSync(join(home, directory, "INTENT_TEMPLATE.md")), false);
  }));

const budgetHook = "session-budget-hook.ts";

function readJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

test("retires the session hook, preserving existing settings and hooks", () =>
  isolated((home) => {
    const settings = join(home, ".claude", "settings.json");
    const other = { matcher: "*", hooks: [{ type: "command", command: "echo keep" }] };
    const ours = { hooks: [{ type: "command", command: `node ${budgetHook}` }] };
    const link = join(home, ".claude", "hooks", budgetHook);
    mkdirSync(join(home, ".claude", "hooks"), { recursive: true });
    symlinkSync(join(root, "tools", budgetHook), link);
    writeFileSync(
      settings,
      JSON.stringify({
        model: "sonnet",
        hooks: {
          SessionStart: [ours],
          PreToolUse: [{ matcher: "AskUserQuestion", ...ours }],
          Stop: [other, ours],
        },
      }),
    );

    assert.equal(invoke(home, "--dry-run").status, 0);
    assert.equal(readJson(settings).hooks.Stop.length, 2);
    assert.ok(lstatSync(link).isSymbolicLink());

    assert.equal(invoke(home).status, 0);
    const installed = readJson(settings);
    assert.equal(installed.model, "sonnet");
    assert.deepEqual(installed.hooks, { Stop: [other] });
    assert.equal(installed.autoCompactWindow, 300_000);
    assert.equal(existsSync(link), false);

    const before = readFileSync(settings, "utf8");
    assert.equal(invoke(home).status, 0);
    assert.equal(readFileSync(settings, "utf8"), before);
  }));

test("keeps a chosen autoCompactWindow and retires our old PostToolUse hook", () =>
  isolated((home) => {
    const settings = join(home, ".claude", "settings.json");
    mkdirSync(join(home, ".claude"));
    writeFileSync(
      settings,
      JSON.stringify({
        autoCompactWindow: "500k",
        hooks: {
          PostToolUse: [
            { matcher: "*", hooks: [{ type: "command", command: `node ${budgetHook}` }] },
          ],
        },
      }),
    );

    assert.equal(invoke(home).status, 0);
    const installed = readJson(settings);
    assert.equal(installed.autoCompactWindow, "500k");
    assert.equal(installed.hooks.PostToolUse, undefined);
  }));

test("unparseable settings.json fails before any home mutation", () =>
  isolated((home) => {
    mkdirSync(join(home, ".claude"));
    writeFileSync(join(home, ".claude", "settings.json"), "{ not json");
    const result = invoke(home);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unparseable settings/);
    assert.equal(readFileSync(join(home, ".claude", "settings.json"), "utf8"), "{ not json");
    assert.equal(existsSync(join(home, ".agents")), false);
    assert.equal(existsSync(join(home, ".claude", "hooks")), false);
  }));
