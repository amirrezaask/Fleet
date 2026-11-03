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

// Factory stage skills (factory-*) are left out so the sample stays independent of factory.
const skill = readdirSync(join(root, "skills"))
  .sort()
  .find(
    (name) =>
      !["factory", "atlas"].includes(name) &&
      !name.startsWith("factory-") &&
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
    assert.equal(existsSync(join(home, ".agents", "tools")), false);
    assert.equal(existsSync(join(home, ".agents", ".git")), false);
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
      [...new Set([skill, "factory", "atlas"])].sort(),
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

const templateSources = [
  { name: "INTENT_TEMPLATE.html", path: "skills/factory/templates/INTENT_TEMPLATE.html" },
  { name: "DESIGN_TEMPLATE.html", path: "skills/factory/templates/DESIGN_TEMPLATE.html" },
  { name: "PLAN_TEMPLATE.html", path: "skills/factory/templates/PLAN_TEMPLATE.html" },
  { name: "DEBRIEF_TEMPLATE.html", path: "skills/factory/templates/DEBRIEF_TEMPLATE.html" },
  { name: "TEST_REPORT_TEMPLATE.html", path: "skills/factory/templates/TEST_REPORT_TEMPLATE.html" },
  { name: "SPEC_TEMPLATE.html", path: "skills/atlas/templates/AREA_TEMPLATE.html" },
];

const globalDirectories = [".agents", ".codex", ".claude"];

test("full and selected installs provide every readable global template alias", () =>
  isolated((home) => {
    for (const args of [[], [skill], [skill]]) {
      assert.equal(invoke(home, ...args).status, 0);

      for (const directory of globalDirectories) {
        for (const { name, path } of templateSources) {
          const alias = join(home, directory, name);
          assert.equal(readlinkSync(alias), join(root, path));
          assert.equal(readFileSync(alias, "utf8"), readFileSync(join(root, path), "utf8"));
        }
      }
    }
  }));

test("dry-run preserves old root aliases and actual install migrates exact managed aliases", () =>
  isolated((home) => {
    for (const directory of globalDirectories) {
      mkdirSync(join(home, directory));

      for (const { name } of templateSources)
        symlinkSync(join(root, name), join(home, directory, name));
    }

    assert.equal(invoke(home, "--dry-run", skill).status, 0);

    for (const directory of globalDirectories) {
      for (const { name } of templateSources)
        assert.equal(readlinkSync(join(home, directory, name)), join(root, name));
      assert.equal(existsSync(join(home, directory, "AGENTS.md")), false);
      assert.equal(existsSync(join(home, directory, "skills")), false);
    }

    assert.equal(invoke(home, skill).status, 0);

    for (const directory of globalDirectories) {
      for (const { name, path } of templateSources)
        assert.equal(readlinkSync(join(home, directory, name)), join(root, path));
    }
  }));

test("foreign template aliases and regular files fail preflight without partial installation", () => {
  for (const collision of ["symlink", "file"])
    isolated((home) => {
      const base = join(home, ".claude");
      mkdirSync(base);
      const alias = join(base, "SPEC_TEMPLATE.html");
      const foreign = join(home, "foreign.md");
      writeFileSync(foreign, "saved");

      if (collision === "symlink") symlinkSync(foreign, alias);
      else writeFileSync(alias, "saved");
      const result = invoke(home, skill);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Refusing/);
      assert.equal(readFileSync(alias, "utf8"), "saved");

      if (collision === "symlink") assert.equal(readlinkSync(alias), foreign);
      assert.equal(existsSync(join(home, ".agents")), false);
      assert.equal(existsSync(join(base, "AGENTS.md")), false);
    });
});

test("missing template or required skill fails before any home mutation", () => {
  for (const missing of ["template", "factory", "atlas"])
    isolated((temporary) => {
      const fixture = join(temporary, "fixture");
      const home = join(temporary, "home");
      mkdirSync(home);
      mkdirSync(join(fixture, "tools"), { recursive: true });
      writeFileSync(join(fixture, "tools", "install.ts"), readFileSync(installer));
      writeFileSync(join(fixture, "AGENTS.md"), "global");

      for (const name of ["factory", "atlas"]) {
        mkdirSync(join(fixture, "skills", name), { recursive: true });

        if (missing !== name) writeFileSync(join(fixture, "skills", name, "SKILL.md"), "skill");
      }

      for (const { name, path } of templateSources) {
        mkdirSync(dirname(join(fixture, path)), { recursive: true });

        if (missing !== "template" || name !== "SPEC_TEMPLATE.html")
          writeFileSync(join(fixture, path), "template");
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

test("migrates former nested template aliases and retires old workflow skills on selected installs", () =>
  isolated((home) => {
    for (const directory of globalDirectories) {
      const base = join(home, directory);
      mkdirSync(join(base, "skills"), { recursive: true });

      for (const name of ["communication", "specification"])
        symlinkSync(join(root, "skills", name), join(base, "skills", name));

      for (const { name } of templateSources) {
        const old = name === "SPEC_TEMPLATE.html" ? "specification" : "communication";
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
      for (const name of ["communication", "specification"])
        assert.throws(() => lstatSync(join(home, directory, "skills", name)));
      assert.equal(
        readlinkSync(join(home, directory, "skills", "factory")),
        join(root, "skills", "factory"),
      );

      for (const { name, path } of templateSources)
        assert.equal(readlinkSync(join(home, directory, name)), join(root, path));
    }
  }));

test("retires managed Markdown template aliases on selected installs, including dangling links", () =>
  isolated((home) => {
    const oldSpec = join(root, "skills", "factory", "templates", "SPEC_TEMPLATE.md");
    const oldArea = join(root, "skills", "atlas", "templates", "AREA_TEMPLATE.md");
    const oldBrief = join(root, "skills", "factory", "templates", "BRIEF_TEMPLATE.md");
    const foreign = join(home, "PLAN_TEMPLATE.md");
    writeFileSync(foreign, "mine");

    for (const [index, directory] of globalDirectories.entries()) {
      mkdirSync(join(home, directory));
      symlinkSync(index === 0 ? oldSpec : oldArea, join(home, directory, "SPEC_TEMPLATE.md"));
      symlinkSync(oldBrief, join(home, directory, "BRIEF_TEMPLATE.md"));
      symlinkSync(foreign, join(home, directory, "PLAN_TEMPLATE.md"));
    }

    assert.equal(invoke(home, "--dry-run", skill).status, 0);
    assert.equal(readlinkSync(join(home, ".agents", "SPEC_TEMPLATE.md")), oldSpec);
    assert.equal(invoke(home, skill).status, 0);

    for (const directory of globalDirectories) {
      assert.throws(() => lstatSync(join(home, directory, "SPEC_TEMPLATE.md")));
      assert.throws(() => lstatSync(join(home, directory, "BRIEF_TEMPLATE.md")));
      assert.equal(
        readlinkSync(join(home, directory, "PLAN_TEMPLATE.md")),
        foreign,
        "foreign link kept",
      );
      assert.equal(
        readlinkSync(join(home, directory, "SPEC_TEMPLATE.html")),
        join(root, "skills", "atlas", "templates", "AREA_TEMPLATE.html"),
      );
      assert.equal(
        readlinkSync(join(home, directory, "skills", "atlas")),
        join(root, "skills", "atlas"),
      );
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
      assert.equal(
        readlinkSync(join(home, directory, "INTENT_TEMPLATE.html")),
        join(root, "skills", "factory", "templates", "INTENT_TEMPLATE.html"),
      );
  }));

test("factory stage skills are discovered and selecting one installs factory too", () =>
  isolated((temporary) => {
    const fixture = join(temporary, "fixture");
    const home = join(temporary, "home");
    mkdirSync(home);
    mkdirSync(join(fixture, "tools"), { recursive: true });
    writeFileSync(join(fixture, "tools", "install.ts"), readFileSync(installer));
    writeFileSync(join(fixture, "tools", budgetHook), "hook");
    writeFileSync(join(fixture, "AGENTS.md"), "global");

    const stages = [
      "factory-intent",
      "factory-design",
      "factory-plan",
      "factory-build",
      "factory-test",
    ];

    for (const name of ["factory", "atlas", ...stages]) {
      mkdirSync(join(fixture, "skills", name), { recursive: true });
      writeFileSync(join(fixture, "skills", name, "SKILL.md"), "skill");
    }

    for (const { path } of templateSources) {
      mkdirSync(dirname(join(fixture, path)), { recursive: true });
      writeFileSync(join(fixture, path), "template");
    }

    const run = (...args: string[]) =>
      spawnSync(process.execPath, [join(fixture, "tools", "install.ts"), ...args], {
        env: { ...process.env, HOME: home },
        encoding: "utf8",
      });

    const listed = run("--list");
    assert.equal(listed.status, 0);
    assert.deepEqual(listed.stdout.trim().split("\n"), ["atlas", "factory", ...stages.toSorted()]);
    assert.equal(run("factory-design").status, 0);
    assert.deepEqual(readdirSync(join(home, ".agents", "skills")).sort(), [
      "atlas",
      "factory",
      "factory-design",
    ]);
  }));

const budgetHook = "session-budget-hook.ts";

function readJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

test("registers the session budget hook once, preserving existing settings and hooks", () =>
  isolated((home) => {
    const settings = join(home, ".claude", "settings.json");
    const other = { matcher: "*", hooks: [{ type: "command", command: "echo keep" }] };
    mkdirSync(join(home, ".claude"));
    writeFileSync(
      settings,
      JSON.stringify({ model: "sonnet", hooks: { PostToolUse: [other], Stop: [other] } }),
    );

    assert.equal(invoke(home, "--dry-run").status, 0);
    assert.equal(readJson(settings).hooks.PostToolUse.length, 1);

    assert.equal(invoke(home).status, 0);
    const installed = readJson(settings);
    assert.equal(installed.model, "sonnet");
    const link = join(home, ".claude", "hooks", budgetHook);
    assert.equal(readlinkSync(link), join(root, "tools", budgetHook));

    assert.deepEqual(installed.hooks.Stop[0], other);
    assert.equal(installed.hooks.Stop.length, 2);

    for (const event of ["SessionStart", "PreToolUse", "Stop"]) {
      const ours = installed.hooks[event].at(-1);
      assert.ok(ours.hooks[0].command.includes(link));
    }

    assert.deepEqual(installed.hooks.PostToolUse, [other]);
    assert.equal(installed.autoCompactWindow, 300_000);
    assert.match(installed.hooks.PreToolUse[0].matcher, /AskUserQuestion/);
    assert.equal(installed.hooks.Stop[1].matcher, undefined);

    const before = readFileSync(settings, "utf8");
    assert.equal(invoke(home).status, 0);
    assert.equal(readFileSync(settings, "utf8"), before);

    installed.hooks.Stop[1].hooks[0].command = `old ${budgetHook}`;
    installed.hooks.PreToolUse[0].matcher = "*";
    writeFileSync(settings, JSON.stringify(installed));
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

interface ToolArgs {
  recap?: string;
  ask?: string;
  initiation?: string;
  file_path?: string;
}

interface HookPayload {
  hook_event_name?: string;
  transcript_path?: string;
  tool_name?: string;
  tool_input?: ToolArgs;
  tool_use_id?: string;
  agent_id?: string;
  source?: string;
  stop_hook_active?: boolean;
  last_assistant_message?: string;
}

interface HookEnv {
  SESSION_AUTONOMY?: string;
  SESSION_STOP_BLOCKS?: string;
}

// Synthetic transcript records in Claude Code's JSONL shape.
const readCall = (filePath: string) =>
  JSON.stringify({
    type: "assistant",
    isSidechain: false,
    message: {
      content: [{ type: "tool_use", id: "t1", name: "Read", input: { file_path: filePath } }],
    },
  });

const toolUse = (name: string, id: string, messageId: string) =>
  JSON.stringify({
    type: "assistant",
    message: { id: messageId, content: [{ type: "tool_use", id, name, input: {} }] },
  });

function hookSession(
  run: (hook: (input: HookPayload, env?: HookEnv) => string, home: string) => void,
) {
  isolated((home) => {
    const sessionId = `hook-test-${process.pid}-${Math.random().toString(36).slice(2)}`;

    const hook = (input: HookPayload, env: HookEnv = {}) => {
      const result = spawnSync(process.execPath, [join(root, "tools", budgetHook)], {
        env: {
          ...process.env,
          ...env,
        },
        input: JSON.stringify({ session_id: sessionId, cwd: home, ...input }),
        encoding: "utf8",
      });

      assert.equal(result.status, 0, result.stderr);

      return result.stdout;
    };

    try {
      run(hook, home);
    } finally {
      rmSync(join(tmpdir(), `session-hooks-${sessionId.replace(/\W/g, "_")}.json`), {
        force: true,
      });
    }
  });
}

test("PreToolUse denies questions to ADMIN and unchecked or forked sessions", () =>
  hookSession((hook, home) => {
    const transcript = join(home, "t.jsonl");

    const pre = (tool_name: string, tool_input: ToolArgs = {}, extra: HookPayload = {}) =>
      hook({
        hook_event_name: "PreToolUse",
        transcript_path: transcript,
        tool_name,
        tool_input,
        tool_use_id: "toolu_now",
        ...extra,
      });

    const denied = (output: string) =>
      JSON.parse(output).hookSpecificOutput.permissionDecision === "deny";

    writeFileSync(transcript, "");
    assert.ok(denied(pre("AskUserQuestion")));
    assert.ok(denied(pre("mcp__ccd_turn__wrap_up", { recap: "r", ask: "Start it?" })));
    assert.equal(pre("mcp__ccd_turn__wrap_up", { recap: "r" }), "");
    assert.ok(denied(pre("mcp__ccd_session__hand_off_to_session")));
    assert.ok(denied(pre("mcp__ccd_session__start_session", { initiation: "offer" })));

    const start = "mcp__ccd_session__start_session";
    const list = "mcp__ccd_session_mgmt__list_sessions";
    assert.ok(denied(pre(start, { initiation: "user_asked" })));

    writeFileSync(
      transcript,
      `${toolUse(list, "toolu_l1", "m1")}\n${toolUse(start, "toolu_now", "m2")}\n`,
    );
    assert.equal(pre(start, { initiation: "user_asked" }), "");

    writeFileSync(
      transcript,
      [
        toolUse(list, "toolu_l1", "m1"),
        toolUse(start, "toolu_s1", "m2"),
        toolUse(start, "toolu_now", "m2"),
      ].join("\n"),
    );
    assert.equal(pre(start), "", "sibling calls after one list_sessions are allowed");

    writeFileSync(
      transcript,
      [
        toolUse(list, "toolu_l1", "m1"),
        toolUse(start, "toolu_s1", "m2"),
        toolUse(start, "toolu_now", "m3"),
      ].join("\n"),
    );
    assert.ok(denied(pre(start)), "a later start needs a fresh list_sessions");

    assert.equal(pre(start, {}, { agent_id: "sub" }), "");
    assert.ok(denied(pre("AskUserQuestion", {}, { agent_id: "sub" })));
    assert.equal(
      hook(
        { hook_event_name: "PreToolUse", tool_name: "AskUserQuestion" },
        { SESSION_AUTONOMY: "off" },
      ),
      "",
    );
  }));

test("Stop blocks questions to ADMIN while a touched task is in progress, with a loop guard", () =>
  hookSession((hook, home) => {
    const task = join(home, ".factory", "epic", "subtasks", "leaf");

    mkdirSync(task, { recursive: true });
    writeFileSync(join(task, "TASK.md"), "status: inprogress\n## Blocker\nNone\n");
    const transcript = join(home, "t.jsonl");
    const read = readCall(join(task, "PLAN.md"));
    writeFileSync(transcript, `${read}\n`);

    // A raised block cap keeps every scenario below observable in one session.
    const stop = (last_assistant_message: string, extra: HookPayload = {}) =>
      hook(
        {
          hook_event_name: "Stop",
          transcript_path: transcript,
          last_assistant_message,
          ...extra,
        },
        { SESSION_STOP_BLOCKS: "20" },
      );

    assert.equal(stop("Committed M3. Next I start M4."), "");
    const blocked = JSON.parse(stop("M3 is done.\n\nStart the continuation session?"));
    assert.equal(blocked.decision, "block");
    assert.match(blocked.reason, /\.factory\/epic\/subtasks\/leaf/);
    assert.equal(
      stop("Waiting on you for the branch name.", { stop_hook_active: true }),
      "",
      "no work since block",
    );

    writeFileSync(transcript, `${read}\n${read}\n`);
    assert.match(stop("Should I keep going?", { stop_hook_active: true }), /"block"/);

    writeFileSync(
      join(task, "TASK.md"),
      "status: inprogress\n## Blocker\nBRIEF R2 conflicts with the engine API.\n",
    );
    assert.equal(stop("Which option do you want?"), "", "an escalated task may end");

    writeFileSync(join(task, "TASK.md"), "status: inprogress\n## Blocker\nNone\n");

    const html = (blocker: string, status = "inprogress") =>
      `<meta name="status" content="${status}"><main><h1>Leaf</h1><h2>Blocker</h2>\n<p>${blocker}</p>\n<h2>Outcome</h2><p>None</p></main>`;

    writeFileSync(join(task, "TASK.html"), html("&lt;Reason when blocked; otherwise None.&gt;"));
    writeFileSync(transcript, `${readCall(join(task, "PLAN.html"))}\n`);
    assert.match(
      stop("Which option?"),
      /"block"/,
      "TASK.html template placeholder is not a blocker",
    );
    writeFileSync(join(task, "TASK.html"), html("BRIEF R2 conflicts with the engine API."));
    assert.equal(stop("Which option do you want?"), "", "an escalated TASK.html task may end");

    writeFileSync(join(task, "TASK.html"), html("None"));
    writeFileSync(transcript, `${readCall(join(task, "INTENT.html"))}\n`);
    assert.match(stop("Which option?"), /"block"/, "touching INTENT.html marks the task");

    writeFileSync(transcript, `${readCall(join(task, "PLAN.html"))}\n`);
    writeFileSync(join(task, "TASK.html"), html("None", "done"));
    assert.equal(stop("Anything else?"), "", "a task moved to another status may end");

    rmSync(join(home, ".factory"), { recursive: true });
    assert.equal(stop("Anything else?"), "", "a finished or moved task may end");
  }));

test("SessionStart lists in-progress leaf tasks and re-grounds after compaction", () =>
  hookSession((hook, home) => {
    assert.equal(hook({ hook_event_name: "SessionStart", source: "startup" }), "");
    const tasks = join(home, ".factory");

    const status = (name: string, value: string) => {
      mkdirSync(join(tasks, name), { recursive: true });
      writeFileSync(join(tasks, name, "TASK.md"), `status: ${value}\n`);
    };

    status("epic", "inprogress");
    status("epic/subtasks/leaf", "inprogress");
    status("epic/subtasks/other-step", "done");
    status("solo", "inprogress");
    mkdirSync(join(tasks, "solo", "design"), { recursive: true });
    status("idle", "backlog");
    status("idle/subtasks/child", "inprogress");

    const start = JSON.parse(
      hook({ hook_event_name: "SessionStart", source: "startup" }),
    ).hookSpecificOutput;

    assert.equal(start.hookEventName, "SessionStart");
    assert.match(start.additionalContext, /list_sessions/);
    const listed = /In-progress leaf tasks here: (.*)\./.exec(start.additionalContext)?.[1];
    assert.deepEqual(listed?.split(", ").sort(), [".factory/epic/subtasks/leaf", ".factory/solo"]);
    assert.match(hook({ hook_event_name: "SessionStart", source: "compact" }), /re-read the task/);
  }));
