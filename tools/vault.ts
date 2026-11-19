// Paths of the agent memory vault (~/.agents) shared by recall and tasks-index.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";

export const vault = join(homedir(), ".agents");
export const projectsRoot = join(vault, "projects");

const inside = (path: string, root: string) => path.startsWith(root + sep);

// The project key of a directory. Inside the vault it is the projects/ folder holding it
// (the nearest ancestor with MEMORY.md, TASKS.md or tasks/); elsewhere it is the main
// checkout's path relative to home, e.g. dev/GameBox.
export function projectOf(directory: string): string | undefined {
  const start = resolve(directory);

  if (inside(start, projectsRoot)) {
    for (let path = start; inside(path, projectsRoot); path = dirname(path)) {
      if (["MEMORY.md", "TASKS.md", "tasks"].some((name) => existsSync(join(path, name))))
        return relative(projectsRoot, path);
    }

    return undefined;
  }

  const git = spawnSync(
    "git",
    ["-C", start, "rev-parse", "--path-format=absolute", "--git-common-dir"],
    { encoding: "utf8" },
  );

  const root = git.status === 0 ? dirname(git.stdout.trim()) : start;

  return inside(root, homedir()) && root !== vault ? relative(homedir(), root) : undefined;
}
