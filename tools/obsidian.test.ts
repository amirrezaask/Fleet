import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const cli = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "tools", "obsidian.ts");

function isolated(run: (home: string, registry: string) => void): void {
  const home = realpathSync(mkdtempSync(join(tmpdir(), "obsidian home ")));
  const registry = join(home, "Library", "Application Support", "obsidian", "obsidian.json");
  mkdirSync(dirname(registry), { recursive: true });

  try {
    run(home, registry);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

const invoke = (home: string, ...args: string[]) =>
  spawnSync(process.execPath, [cli, "--dry-run", ...args], {
    env: { ...process.env, HOME: home },
    encoding: "utf8",
  });

test("a folder inside a registered vault opens without registering", () =>
  isolated((home, registry) => {
    mkdirSync(join(home, "vault", "notes"), { recursive: true });
    const saved = JSON.stringify({ vaults: { a: { path: join(home, "vault"), ts: 1 } } });
    writeFileSync(registry, saved);
    const result = invoke(home, join(home, "vault", "notes"));
    assert.equal(result.status, 0);
    assert.doesNotMatch(result.stdout, /register/);
    assert.match(result.stdout, /open .*notes/);
    assert.equal(readFileSync(registry, "utf8"), saved);
  }));

test("an unregistered folder is registered; a sibling with a shared prefix is not a match", () =>
  isolated((home, registry) => {
    mkdirSync(join(home, "vault"));
    mkdirSync(join(home, "vault-two"));
    writeFileSync(
      registry,
      JSON.stringify({ vaults: { a: { path: join(home, "vault"), ts: 1 } } }),
    );
    const result = invoke(home, join(home, "vault-two"));
    assert.equal(result.status, 0);
    assert.match(result.stdout, /register .*vault-two/);
  }));

test("a missing directory fails", () =>
  isolated((home) => {
    const result = invoke(home, join(home, "missing"));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Not a directory/);
  }));
