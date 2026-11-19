#!/usr/bin/env node
// obsidian [dir]: open a directory (default: the current one) as an Obsidian vault on macOS.
// Obsidian opens only folders in its vault registry, which it reads at startup and rewrites
// on quit, so registering a new folder quits a running Obsidian first.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, sep } from "node:path";

interface Registry {
  vaults: Record<string, { path: string; ts: number; open?: boolean }>;
}

const registryPath = join(homedir(), "Library", "Application Support", "obsidian", "obsidian.json");

function readRegistry(): Registry {
  return existsSync(registryPath) ? JSON.parse(readFileSync(registryPath, "utf8")) : { vaults: {} };
}

const running = () => spawnSync("pgrep", ["-x", "Obsidian"]).status === 0;

function quitObsidian() {
  spawnSync("osascript", ["-e", 'tell application "Obsidian" to quit']);

  for (let waited = 0; running(); waited += 100) {
    if (waited > 15_000) throw new Error("Obsidian did not quit; close it and run again");
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const target = resolve(args.find((arg) => !arg.startsWith("-")) ?? ".");

  if (process.platform !== "darwin") throw new Error("obsidian supports macOS only");

  if (!existsSync(target) || !statSync(target).isDirectory())
    throw new Error(`Not a directory: ${target}`);

  const registered = Object.values(readRegistry().vaults).some(
    ({ path }) => target === path || target.startsWith(path + sep),
  );

  if (!registered) {
    // Quitting clears the vaults' open flags; restore them so they reopen with the new one.
    const wasOpen = Object.entries(readRegistry().vaults)
      .filter(([, vault]) => vault.open)
      .map(([id]) => id);

    if (running()) {
      console.log("restart Obsidian to register the vault");

      if (!dryRun) quitObsidian();
    }

    console.log(`register ${target}`);

    if (!dryRun) {
      // Read after quitting: Obsidian saves its registry on quit.
      const registry = readRegistry();

      for (const id of wasOpen) if (registry.vaults[id]) registry.vaults[id].open = true;
      registry.vaults[randomBytes(8).toString("hex")] = {
        path: target,
        ts: Date.now(),
        open: true,
      };
      writeFileSync(registryPath, JSON.stringify(registry));
    }
  }

  console.log(`open ${target}`);

  if (!dryRun && spawnSync("open", ["-a", "Obsidian", target]).status !== 0)
    throw new Error("Could not launch Obsidian");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
