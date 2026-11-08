// Where the dashboard reads files from: the tiny server, or a folder picked in the browser.
import type { FileEntry } from "./model.ts";

export interface Listing {
  readonly name: string;
  readonly files: readonly FileEntry[];
}

export interface Source {
  readonly label: "server" | "folder";
  list(): Promise<Listing>;
  read(path: string): Promise<string>;
}

export const serverSource: Source = {
  label: "server",
  async list() {
    const response = await fetch("api/files", { cache: "no-store" });

    if (!response.ok) throw new Error(`api/files: HTTP ${response.status}`);

    return response.json();
  },
  async read(path) {
    const response = await fetch(`api/file?p=${encodeURIComponent(path)}`, { cache: "no-store" });

    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);

    return response.text();
  },
};

// The slice of the File System Access API in use; real handles and test fakes both fit.
export interface FileLike {
  readonly kind: "file";
  getFile(): Promise<{ readonly lastModified: number; text(): Promise<string> }>;
}

export interface DirectoryLike {
  readonly kind: "directory";
  readonly name: string;
  entries(): AsyncIterable<[string, DirectoryLike | FileLike]>;
  getDirectoryHandle(name: string): Promise<DirectoryLike>;
  getFileHandle(name: string): Promise<FileLike>;
}

export interface ReadMode {
  readonly mode: "read";
}

export interface RememberedDirectory extends DirectoryLike {
  queryPermission(options: ReadMode): Promise<string>;
  requestPermission(options: ReadMode): Promise<string>;
}

const SKIPPED = new Set(["evidence", "worktree", "node_modules", ".git"]);

async function walk(dir: DirectoryLike, prefix: string, out: FileEntry[]): Promise<void> {
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind === "directory") {
      if (!SKIPPED.has(name)) await walk(handle, `${prefix}${name}/`, out);
    } else if (name.endsWith(".md")) {
      out.push({ path: prefix + name, mtime: (await handle.getFile()).lastModified });
    }
  }
}

// The picked folder is the project's task store, ~/.agents/factory/<project>.
export async function folderSource(root: DirectoryLike): Promise<Source> {
  return {
    label: "folder",
    async list() {
      const files: FileEntry[] = [];

      await walk(root, "", files);

      return { name: root.name, files: files.sort((a, b) => a.path.localeCompare(b.path)) };
    },
    async read(path) {
      const parts = path.split("/");
      let dir = root;

      for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part);

      const file = await dir.getFileHandle(parts.at(-1) ?? "");

      return (await file.getFile()).text();
    },
  };
}

// The picked folder is remembered per browser, so a return visit only re-asks for permission.
// Storage may be blocked or never answer; never let that block the picker.
export function remembered(
  operation: "get" | "put",
  value?: RememberedDirectory,
): Promise<RememberedDirectory | undefined> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(undefined), 1500);

    try {
      const opened = indexedDB.open("factory-dashboard", 1);

      opened.onupgradeneeded = () => opened.result.createObjectStore("kv");
      opened.onerror = () => resolve(undefined);
      opened.onsuccess = () => {
        const store = opened.result
          .transaction("kv", operation === "get" ? "readonly" : "readwrite")
          .objectStore("kv");

        const request = operation === "get" ? store.get("root") : store.put(value, "root");

        request.onsuccess = () => resolve(operation === "get" ? request.result : undefined);
        request.onerror = () => resolve(undefined);
      };
    } catch {
      resolve(undefined);
    }
  });
}
