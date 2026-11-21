import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = realpathSync(join(dirname(fileURLToPath(import.meta.url)), ".."));
const args = process.argv.slice(2);
const options = new Set(args.filter((arg) => arg.startsWith("-")));
const supported = new Set(["--list", "--dry-run", "--help"]);
const selected = args.filter((arg) => !arg.startsWith("-"));

const skills = readdirSync(join(repo, "skills"), { withFileTypes: true })
  .filter(
    (entry) => entry.isDirectory() && existsSync(join(repo, "skills", entry.name, "SKILL.md")),
  )
  .map((entry) => entry.name)
  .sort();

interface Link {
  source: string;
  destination: string;
}

function present(path: string): boolean {
  return (
    existsSync(path) ||
    (() => {
      try {
        return lstatSync(path).isSymbolicLink();
      } catch {
        return false;
      }
    })()
  );
}

interface HookCommand {
  type: string;
  command?: string;
  timeout?: number;
}

interface HookGroup {
  matcher?: string;
  hooks?: HookCommand[];
}

interface Settings {
  autoCompactWindow?: number | string;
  autoMemoryDirectory?: string;
  hooks?: Record<string, HookGroup[]>;
}

const budgetHook = "session-budget-hook.ts";

// Commands linked onto PATH (~/.local/bin/<name>): `md` renders a Markdown document as
// styled HTML, `obsidian` opens a directory as an Obsidian vault, `recall` searches the
// vault's memory and `tasks-index` regenerates a project's TASKS.md.
const commands = {
  md: "md.ts",
  obsidian: "obsidian.ts",
  recall: "recall.ts",
  "tasks-index": "tasks-index.ts",
};

// Skill links superseded by Factory; removed even on selected installs. The
// factory-<stage> skills became `/factory <stage>` subcommands of the factory skill.
const retiredWorkflowSkills = [
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

// Claude Code compacts the session itself once context reaches this many tokens;
// the "Compact Instructions" section of AGENTS.md steers what the summary keeps.
const autoCompactWindow = 300_000;
const autoMemoryDirectory = "~/.agents/memory";

// Events the retired session hook was registered for; reruns remove its entries.
const retiredHookEvents = ["PostToolUse", "SessionStart", "PreToolUse", "Stop"];

function readSettings(path: string): Settings {
  if (!present(path)) return {};

  try {
    const settings = JSON.parse(readFileSync(path, "utf8"));

    if (!(settings instanceof Object) || Array.isArray(settings))
      throw new Error("not a JSON object");

    return settings;
  } catch (error) {
    throw new Error(
      `Refusing to modify unparseable settings ${path}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

// Removes the retired session hook's entries (found by script name), so other
// hooks in settings.json are never touched.
function retireBudgetHook(path: string, settings: Settings, write: boolean) {
  let changed = false;

  for (const event of retiredHookEvents) {
    const groups = settings.hooks?.[event];

    if (!groups) continue;

    for (const group of groups) {
      const before = group.hooks?.length ?? 0;
      group.hooks = group.hooks?.filter((hook) => !hook.command?.includes(budgetHook));

      if ((group.hooks?.length ?? 0) === before) continue;
      console.log(`remove retired ${event} hook in ${path}`);
      changed = true;
    }

    const kept = groups.filter((group) => group.hooks?.length);

    if (kept.length) settings.hooks![event] = kept;
    else delete settings.hooks![event];
  }

  if (settings.autoCompactWindow === undefined) {
    console.log(`set autoCompactWindow ${autoCompactWindow} in ${path}`);
    settings.autoCompactWindow = autoCompactWindow;
    changed = true;
  }

  if (settings.autoMemoryDirectory === undefined) {
    console.log(`set autoMemoryDirectory ${autoMemoryDirectory} in ${path}`);
    settings.autoMemoryDirectory = autoMemoryDirectory;
    changed = true;
  }

  if (changed && write) writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`);
}

// Claude Code's per-project memory folders become links to the vault's one memory folder.
// A folder that still holds memories is left alone, so nothing is lost.
function linkClaudeMemory(home: string, write: boolean) {
  const projects = join(home, ".claude", "projects");
  const memory = join(home, ".agents", "memory");

  if (!present(projects)) return;

  for (const project of readdirSync(projects).sort()) {
    const folder = join(projects, project, "memory");

    if (!present(folder)) continue;

    if (lstatSync(folder).isSymbolicLink()) {
      if (resolve(dirname(folder), readlinkSync(folder)) === memory) continue;
    } else if (readdirSync(folder).length) {
      console.log(`keep ${folder}: move its memories into ${memory}, then reinstall`);
      continue;
    }

    console.log(`link ${folder} -> ${memory}`);

    if (!write) continue;
    rmSync(folder, { recursive: true });
    symlinkSync(memory, folder);
  }
}

const vaultSeed = join(repo, "skills", "agentic-memory", "assets", "vault");

// Copies the vault scaffold into ~/.agents and never replaces an existing file:
// Obsidian and agents edit these files after the first install.
function seedVault(vault: string, write: boolean) {
  for (const path of readdirSync(vaultSeed, { recursive: true, encoding: "utf8" }).sort()) {
    const source = join(vaultSeed, path);
    const destination = join(vault, path);

    if (statSync(source).isDirectory() || present(destination)) continue;
    console.log(`seed ${destination}`);

    if (!write) continue;
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  }
}

function main(): void {
  for (const option of options) {
    if (!supported.has(option)) throw new Error(`Unknown option: ${option}`);
  }

  for (const name of selected) {
    if (!skills.includes(name)) throw new Error(`Unknown skill: ${name}`);
  }

  if (options.has("--help")) {
    console.log(
      "Usage: npm run install:agents -- [--list] [--dry-run] [skill-name ...]\nExisting regular files and directories are never replaced.",
    );

    return;
  }

  if (options.has("--list")) {
    console.log((selected.length ? selected : skills).join("\n"));

    return;
  }

  const home = homedir();
  const globals = [".agents", ".codex", ".claude"].map((name) => join(home, name));

  const destinations = [
    ...globals.map((path) => join(path, "skills")),
    join(home, ".cursor", "skills-cursor"),
  ];

  // Installed on every run: the vault conventions, Factory, and the reviewers Factory's
  // Review stage runs.
  const requiredSkills = ["agentic-memory", "factory", "change-review"];

  for (const name of requiredSkills) {
    const source = join(repo, "skills", name, "SKILL.md");

    if (!existsSync(source) || !statSync(source).isFile()) {
      throw new Error(`Missing required global workflow skill: ${source}`);
    }
  }

  const names = selected.length ? [...new Set([...selected, ...requiredSkills])] : skills;

  for (const path of [
    "AGENTS.md",
    join("tools", "vault.ts"),
    ...Object.values(commands).map((file) => join("tools", file)),
  ]) {
    const source = join(repo, path);

    if (!existsSync(source) || !statSync(source).isFile()) {
      throw new Error(`Missing bundled global file: ${source}`);
    }
  }

  const links: Link[] = [
    ...globals.map((base) => ({
      source: join(repo, "AGENTS.md"),
      destination: join(base, "AGENTS.md"),
    })),
    ...destinations.flatMap((base) =>
      names.map((name) => ({ source: join(repo, "skills", name), destination: join(base, name) })),
    ),
    ...Object.entries(commands).map(([name, file]) => ({
      source: join(repo, "tools", file),
      destination: join(home, ".local", "bin", name),
    })),
  ];

  const settingsPath = join(home, ".claude", "settings.json");
  const settings = readSettings(settingsPath);

  const legacy = join(home, "dev", "Amirreza.md");

  const managed = (target: string, source: string) =>
    target === source ||
    (dirname(source) === join(repo, "skills") &&
      target === join(legacy, "skills", basename(source)));

  const removals: string[] = [];

  for (const base of destinations) {
    if (!present(base) || !lstatSync(base).isDirectory()) continue;

    for (const name of readdirSync(base)) {
      if (selected.length && !retiredWorkflowSkills.includes(name)) continue;
      const path = join(base, name);

      if (!skills.includes(name) && present(path) && lstatSync(path).isSymbolicLink()) {
        const target = resolve(dirname(path), readlinkSync(path));

        if (managed(target, join(repo, "skills", name))) removals.push(path);
      }
    }
  }

  // Preflight every destination before changing any link. A skills directory
  // symlink could otherwise redirect writes into an unrelated installation.
  for (const base of [...globals, join(home, ".cursor"), ...destinations]) {
    if (present(base) && (lstatSync(base).isSymbolicLink() || !lstatSync(base).isDirectory())) {
      throw new Error(`Refusing non-directory or symlink destination: ${base}`);
    }
  }

  for (const { source, destination } of links) {
    if (!present(destination)) continue;

    if (!lstatSync(destination).isSymbolicLink())
      throw new Error(`Refusing to replace existing path: ${destination}`);
    const target = resolve(dirname(destination), readlinkSync(destination));

    if (!managed(target, source))
      throw new Error(`Refusing unrelated symlink: ${destination} -> ${target}`);
  }

  // Template aliases in the global directories are retired: agents read templates from
  // the factory skill. Each is removed only when it points at a location this
  // repository managed, even if the target no longer exists.
  const retiredTemplates = [
    "BRIEF",
    "INTENT",
    "DESIGN",
    "PLAN",
    "DEBRIEF",
    "REVIEW",
    "SPEC",
  ].flatMap((kind) => [`${kind}_TEMPLATE.md`, `${kind}_TEMPLATE.html`]);

  for (const base of globals) {
    for (const name of retiredTemplates) {
      const alias = join(base, name);

      if (!present(alias) || !lstatSync(alias).isSymbolicLink()) continue;
      const target = resolve(base, readlinkSync(alias));

      const formerTargets = [
        join(repo, name),
        join(repo, "skills", "factory", "templates", name),
        join(repo, "skills", "factory", "templates", "AREA_TEMPLATE.md"),
        join(repo, "skills", "atlas", "templates", "AREA_TEMPLATE.html"),
        join(repo, "skills", "atlas", "templates", "AREA_TEMPLATE.md"),
        join(
          repo,
          "skills",
          name.startsWith("SPEC_TEMPLATE") ? "specification" : "communication",
          "templates",
          name,
        ),
      ];

      if (formerTargets.includes(target)) removals.push(alias);
    }
  }

  for (const base of globals) {
    const oldInstaller = join(base, "install.sh");

    if (
      present(oldInstaller) &&
      lstatSync(oldInstaller).isSymbolicLink() &&
      resolve(base, readlinkSync(oldInstaller)) === join(repo, "install.sh")
    ) {
      removals.push(oldInstaller);
    }
  }

  const oldBoard = join(home, ".local", "bin", "production-line");

  if (
    present(oldBoard) &&
    lstatSync(oldBoard).isSymbolicLink() &&
    resolve(dirname(oldBoard), readlinkSync(oldBoard)) ===
      join(repo, "skills", "factory", "assets", "task-board", "bin.js")
  ) {
    removals.push(oldBoard);
  }

  const oldHook = join(home, ".claude", "hooks", budgetHook);

  if (
    present(oldHook) &&
    lstatSync(oldHook).isSymbolicLink() &&
    resolve(dirname(oldHook), readlinkSync(oldHook)) === join(repo, "tools", budgetHook)
  ) {
    removals.push(oldHook);
  }

  for (const destination of removals) {
    console.log(`remove retired link ${destination}`);

    if (!options.has("--dry-run")) unlinkSync(destination);
  }

  for (const { source, destination } of links) {
    if (present(destination) && resolve(dirname(destination), readlinkSync(destination)) === source)
      continue;
    console.log(`link ${destination} -> ${source}`);

    if (!options.has("--dry-run")) {
      mkdirSync(dirname(destination), { recursive: true });

      if (present(destination)) unlinkSync(destination);
      symlinkSync(source, destination);
    }
  }

  seedVault(join(home, ".agents"), !options.has("--dry-run"));
  retireBudgetHook(settingsPath, settings, !options.has("--dry-run"));
  linkClaudeMemory(home, !options.has("--dry-run"));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
