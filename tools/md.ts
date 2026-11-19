#!/usr/bin/env node
// md <file.md>: render a Markdown document (and the local Markdown files it links to) as
// Claude-styled HTML and open it in the browser. Documents stay Markdown for agents.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import matter from "gray-matter";
import { Match } from "effect";
import { Marked } from "marked";

const repo = realpathSync(join(dirname(fileURLToPath(import.meta.url)), ".."));
const fonts = join(repo, "tools", "fonts");
const usage = "Usage: md <file.md> [--out <dir>] [--no-open]";

// Linked documents are rendered too so links work offline; this bounds a runaway crawl.
const maxDocuments = 200;

const escape = (text: string) =>
  text.replace(/[&<>"]/g, (char) => `&${{ "&": "amp", "<": "lt", ">": "gt", '"': "quot" }[char]};`);

const style = `
:root{--background:#faf9f5;--card:#fff;--foreground:#141413;--muted:#f0eee6;--muted-foreground:#5e5d59;--border:#e8e6dc;--clay:#c15f3c;--clay-ink:#9b4a32;--clay-tint:#f6e7df;--ring:#d97757;--selection:#ecd5c8;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--background:#1f1e1d;--card:#2a2927;--foreground:#f0eee6;--muted:#302e2b;--muted-foreground:#a8a59b;--border:#363431;--clay:#d97757;--clay-ink:#e8a083;--clay-tint:#3a2a23;--selection:#4a3328}}
@font-face{font-family:"Anthropic Sans";src:url("${pathToFileURL(join(fonts, "anthropic-sans.woff2")).href}") format("woff2");font-display:swap}
@font-face{font-family:"Anthropic Serif";src:url("${pathToFileURL(join(fonts, "anthropic-serif.woff2")).href}") format("woff2");font-display:swap}
*{box-sizing:border-box}
body{margin:0;background:var(--background);color:var(--foreground);font:15px/1.6 "Anthropic Sans",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
::selection{background:var(--selection)}
:focus-visible{outline:2px solid var(--ring);outline-offset:3px;border-radius:6px}
main{max-width:800px;margin:0 auto;padding:48px 24px 96px}
.path{font:12px ui-monospace,Menlo,monospace;color:var(--muted-foreground);margin:0 0 24px;word-break:break-all}
h1,h2,h3,h4{font-family:"Anthropic Serif",Georgia,serif;font-weight:500;line-height:1.2;letter-spacing:-.01em;margin:0}
h1{font-size:clamp(30px,4vw,40px);margin-bottom:16px}
h2{font-size:22px;margin:40px 0 12px;padding-top:24px;border-top:1px solid var(--border)}
h3{font-size:17px;margin:24px 0 8px}
h4{font-size:15px;margin:20px 0 6px}
p,ul,ol,blockquote{margin:0 0 12px}
ul,ol{padding-left:22px}
li>ul,li>ol{margin:4px 0}
a{color:var(--clay-ink)}
img{max-width:100%;border-radius:8px}
hr{border:0;border-top:1px solid var(--border);margin:32px 0}
blockquote{border-left:4px solid var(--clay);background:var(--clay-tint);border-radius:0 12px 12px 0;padding:12px 18px}
blockquote>:last-child{margin-bottom:0}
code,pre{font:13px ui-monospace,"SF Mono",Menlo,Consolas,monospace}
code{background:var(--muted);padding:1px 5px;border-radius:6px}
pre{background:var(--muted);border:1px solid var(--border);border-radius:8px;padding:12px 14px;overflow:auto;margin:0 0 12px}
pre code{background:none;padding:0}
pre.mermaid{background:var(--card);text-align:center}
table{width:100%;border-collapse:collapse;font-size:13px;margin:0 0 12px;display:block;overflow-x:auto}
th,td{text-align:left;vertical-align:top;padding:8px 10px;border-bottom:1px solid var(--border)}
th{font-weight:600;color:var(--muted-foreground);background:var(--muted)}
input[type=checkbox]{accent-color:var(--clay)}
.meta{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 24px;padding:0;list-style:none}
.meta li{font-size:13px;padding:2px 10px;border:1px solid var(--border);border-radius:999px;background:var(--card)}
.meta b{font-weight:600;color:var(--muted-foreground);margin-right:4px}
@media print{body{background:#fff}}`;

// Mermaid loads only for documents with a mermaid block, matching the page's color scheme.
const mermaid = `<script type="module">
import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs";
mermaid.initialize({ startOnLoad: true, theme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "neutral" });
</script>`;

const outputFor = (outDir: string, source: string) =>
  join(
    outDir,
    `${basename(source).replace(/\.md$/i, "")}-${createHash("sha1").update(source).digest("hex").slice(0, 8)}.html`,
  );

function frontmatterList(data: matter.GrayMatterFile<string>["data"]): string {
  const items = Object.entries(data)
    .filter(([key, value]) => key !== "title" && value !== null && value !== undefined)
    .map(([key, value]) => {
      const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);

      return `<li><b>${escape(key)}</b>${escape(text)}</li>`;
    });

  return items.length ? `<ul class="meta">${items.join("")}</ul>` : "";
}

// Renders `entry` and every local Markdown file reachable through its links.
function renderAll(entry: string, outDir: string): void {
  const queue = [entry];
  const seen = new Set(queue);

  for (let source = queue.shift(); source; source = queue.shift()) {
    const { data, content } = matter(readFileSync(source, "utf8"));
    let hasMermaid = false;
    const marked = new Marked({ gfm: true });

    marked.use({
      renderer: {
        code({ text, lang }) {
          if (lang !== "mermaid") return false;
          hasMermaid = true;

          return `<pre class="mermaid">${escape(text)}</pre>`;
        },
        link({ href, title, tokens }) {
          const [path, hash] = href.split("#");
          let target = href;

          if (path && /\.md$/i.test(path) && !/^[a-z][a-z0-9+.-]*:/i.test(path)) {
            const linked = resolve(dirname(source), decodeURIComponent(path));

            if (existsSync(linked) && statSync(linked).isFile()) {
              if (!seen.has(linked) && seen.size < maxDocuments) {
                seen.add(linked);
                queue.push(linked);
              }

              if (seen.has(linked))
                target = pathToFileURL(outputFor(outDir, linked)).href + (hash ? `#${hash}` : "");
            }
          }

          const label = this.parser.parseInline(tokens);

          return `<a href="${escape(target)}"${title ? ` title="${escape(title)}"` : ""}>${label}</a>`;
        },
      },
    });

    const body = marked.parse(content, { async: false });
    const heading = /^#\s/m.test(content);
    const title = String(data.title ?? /^#\s+(.+)$/m.exec(content)?.[1] ?? basename(source));

    const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${escape(title)}</title>
<base href="${escape(pathToFileURL(dirname(source)).href)}/">
<style>${style}</style>
</head>
<body>
<main>
<p class="path">${escape(source)}</p>
${heading ? "" : `<h1>${escape(title)}</h1>`}
${frontmatterList(data)}
${body}
</main>
${hasMermaid ? mermaid : ""}
</body>
</html>
`;

    writeFileSync(outputFor(outDir, source), page);
  }
}

function openInBrowser(path: string): void {
  const [command, ...args] = Match.value(process.platform).pipe(
    Match.when("darwin", () => ["open", path]),
    Match.when("win32", () => ["cmd", "/c", "start", "", path]),
    Match.orElse(() => ["xdg-open", path]),
  );

  spawn(command!, args, { detached: true, stdio: "ignore" }).unref();
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(usage);

    return;
  }

  const files: string[] = [];
  let outDir = join(tmpdir(), "md-preview");

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;

    if (arg === "--out") {
      const value = args[++index];

      if (!value) throw new Error(usage);
      outDir = resolve(value);
    } else if (arg === "--no-open") continue;
    else if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}\n${usage}`);
    else files.push(arg);
  }

  if (files.length !== 1) throw new Error(usage);

  const source = resolve(files[0]!);

  if (!existsSync(source) || !statSync(source).isFile()) throw new Error(`Not a file: ${source}`);
  const entry = realpathSync(source);

  mkdirSync(outDir, { recursive: true });
  renderAll(entry, outDir);
  const output = outputFor(outDir, entry);

  console.log(output);

  if (!args.includes("--no-open")) openInBrowser(output);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
