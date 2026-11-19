#!/usr/bin/env node
// recall <keyword...> [--all]: print the bullets and paragraphs of the agent memory vault
// that match the keywords, best first, each with its file, line and heading path. Searches
// every memory in ~/.agents/memory/ and the current project's TASKS.md; --all searches
// every project's TASKS.md.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { projectOf, projectsRoot, vault } from "./vault.ts";

const limit = 20;

interface Chunk {
  source: string;
  line: number;
  headings: string;
  text: string;
}

const memories = join(vault, "memory");

// Every project's TASKS.md, without descending into task folders.
function taskIndexes(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return entry.name === "tasks" ? [] : taskIndexes(path);

    return entry.name === "TASKS.md" ? [path] : [];
  });
}

// A chunk is one top-level bullet (with its continuation lines) or one paragraph. A
// memory's frontmatter is not a chunk: its name and description head the file's chunks.
function chunks(path: string): Chunk[] {
  const found: Chunk[] = [];
  const headings: string[] = [];
  let current: { line: number; lines: string[] } | undefined;
  let fenced = false;

  const flush = () => {
    if (current && !current.lines[0]?.trimStart().startsWith("<!--"))
      found.push({
        source: relative(vault, path),
        line: current.line,
        headings: headings.filter(Boolean).join(" › "),
        text: current.lines.join("\n").trimEnd(),
      });
    current = undefined;
  };

  const lines = readFileSync(path, "utf8").split("\n");
  let start = 0;

  const end = lines[0] === "---" ? lines.indexOf("---", 1) : -1;

  if (end > 0) {
    const field = (key: string) =>
      lines
        .slice(1, end)
        .find((line) => line.startsWith(`${key}:`))
        ?.slice(key.length + 1)
        .trim()
        .replace(/^"(.*)"$/, "$1");

    headings[0] = [field("name"), field("description")].filter(Boolean).join(": ");
    start = end + 1;
  }

  for (const [index, line] of lines.entries()) {
    if (index < start) continue;
    const fence = /^\s*```/.test(line);

    if (fenced || fence) {
      current ??= { line: index + 1, lines: [] };
      current.lines.push(line);

      if (fence) fenced = !fenced;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)/);

    if (heading) {
      flush();
      const level = heading[1]!.length + (start ? 1 : 0);
      headings.length = level - 1;
      headings[level - 1] = heading[2]!.trim();
    } else if (!line.trim()) flush();
    else {
      if (/^(?:[-*+]|\d+\.)\s/.test(line)) flush();
      current ??= { line: index + 1, lines: [] };
      current.lines.push(line);
    }
  }

  flush();

  return found;
}

function main(): void {
  const args = process.argv.slice(2);
  const keywords = args.filter((arg) => !arg.startsWith("--")).map((arg) => arg.toLowerCase());

  if (!keywords.length) throw new Error("Usage: recall <keyword...> [--all]");
  const project = projectOf(process.cwd());

  const sources = [
    ...(existsSync(memories)
      ? readdirSync(memories)
          .filter((name) => name.endsWith(".md"))
          .sort(
            (a, b) => Number(b === "MEMORY.md") - Number(a === "MEMORY.md") || a.localeCompare(b),
          )
          .map((name) => join(memories, name))
      : []),
    ...(args.includes("--all")
      ? taskIndexes(projectsRoot)
      : project
        ? [join(projectsRoot, project, "TASKS.md")]
        : []),
  ].filter((path) => existsSync(path));

  const matches = sources
    .flatMap(chunks)
    .flatMap((chunk, order) => {
      const haystack = `${chunk.headings}\n${chunk.text}`.toLowerCase();
      const hits = keywords.filter((keyword) => haystack.includes(keyword)).length;
      const count = keywords.reduce((sum, keyword) => sum + haystack.split(keyword).length - 1, 0);

      return hits ? [{ chunk, hits, count, order }] : [];
    })
    .sort((a, b) => b.hits - a.hits || b.count - a.count || a.order - b.order);

  if (!matches.length) {
    console.log(
      `No matches in ${["memory/", ...sources.flatMap((path) => (path.startsWith(memories) ? [] : [relative(vault, path)]))].join(", ")}`,
    );

    return;
  }

  for (const { chunk } of matches.slice(0, limit))
    console.log(`${chunk.source}:${chunk.line} › ${chunk.headings}\n${chunk.text}\n`);

  if (matches.length > limit)
    console.log(`… ${matches.length - limit} more matches; add keywords to narrow them`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
