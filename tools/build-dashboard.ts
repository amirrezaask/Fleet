#!/usr/bin/env node
// Bundles the Factory dashboard (React, shadcn-style components, Tailwind, fonts) into the single
// self-contained skills/factory/assets/dashboard/dashboard.html: `npm run build:dashboard`.
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Scanner } from "@tailwindcss/oxide";
import { build } from "esbuild";
import { compile } from "tailwindcss";

const dashboard = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "skills",
  "factory",
  "assets",
  "dashboard",
);

const source = join(dashboard, "src");
const require = createRequire(import.meta.url);

export const outputPath = join(dashboard, "dashboard.html");

async function stylesheet(): Promise<string> {
  const fonts = new Map(
    await Promise.all(
      ["serif", "sans"].map(async (face) => {
        const bytes = await readFile(join(source, "fonts", `anthropic-${face}.woff2`));

        return [face, `data:font/woff2;base64,${bytes.toString("base64")}`] as const;
      }),
    ),
  );

  const css = (await readFile(join(source, "styles.css"), "utf8")).replace(
    /url\("font:(serif|sans)"\)/g,
    (_, face: string) => `url("${fonts.get(face)}")`,
  );

  const compiler = await compile(css, {
    base: source,
    loadStylesheet: async (id, base) => {
      const path = id.startsWith(".")
        ? resolve(base, id)
        : require.resolve(id === "tailwindcss" ? "tailwindcss/index.css" : id, { paths: [base] });

      return { path, base: dirname(path), content: await readFile(path, "utf8") };
    },
  });

  const scanner = new Scanner({ sources: [{ base: source, pattern: "**/*.tsx", negated: false }] });

  return compiler.build(scanner.scan());
}

async function script(): Promise<string> {
  const result = await build({
    entryPoints: [join(source, "main.tsx")],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    legalComments: "none",
    minify: true,
  });

  const text = result.outputFiles[0]?.text;

  if (!text) throw new Error("esbuild produced no output for the dashboard.");

  // Keep the inline script from ending its element or opening an HTML comment.
  return text.replaceAll("</script", "<\\/script").replaceAll("<!--", "<\\!--");
}

export async function buildDashboard(): Promise<string> {
  const [template, css, js] = await Promise.all([
    readFile(join(dashboard, "template.html"), "utf8"),
    stylesheet(),
    script(),
  ]);

  return template.replace("<!--CSS-->", () => css).replace("<!--JS-->", () => js);
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const html = await buildDashboard();

  await writeFile(outputPath, html);
  console.log(`wrote ${outputPath} (${(html.length / 1024).toFixed(0)} KiB)`);
}
