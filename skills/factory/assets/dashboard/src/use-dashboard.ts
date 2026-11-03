import { useCallback, useEffect, useRef, useState } from "react";
import { buildTasks, parseBacklog, type BacklogItem, type Task } from "./model.ts";
import type { Source } from "./sources.ts";

const POLL_MS = 2000;

interface Snapshot {
  readonly name: string;
  readonly tasks: Task[];
  readonly backlog: BacklogItem[];
  readonly mtimes: ReadonlyMap<string, number>;
  readonly loaded: boolean;
}

interface Health {
  readonly checkedAt: Date | null;
  readonly error: string;
}

export interface Dashboard extends Snapshot, Health {
  read(path: string, mtime: number): Promise<string>;
}

const empty: Snapshot = { name: "", tasks: [], backlog: [], mtimes: new Map(), loaded: false };

// Polls the listing and re-reads only files whose modification time changed.
export function useDashboard(source: Source): Dashboard {
  const [snapshot, setSnapshot] = useState<Snapshot>(empty);
  const [health, setHealth] = useState<Health>({ checkedAt: null, error: "" });
  const cache = useRef(new Map<string, { mtime: number; text: string }>());
  const signature = useRef("");

  const read = useCallback(
    async (path: string, mtime: number) => {
      const hit = cache.current.get(path);

      if (hit?.mtime === mtime) return hit.text;

      const text = await source.read(path);

      cache.current.set(path, { mtime, text });

      return text;
    },
    [source],
  );

  useEffect(() => {
    let live = true;

    const check = async () => {
      try {
        const { name, files } = await source.list();
        const next = JSON.stringify(files);

        if (next !== signature.current) {
          const wanted = files.filter(
            (f) => f.path.endsWith("/TASK.md") || f.path === "backlog.md",
          );

          const loaded = await Promise.all(
            wanted.map(async (file) => [file.path, await read(file.path, file.mtime)] as const),
          );

          const texts = new Map(loaded);

          if (!live) return;

          signature.current = next;
          setSnapshot({
            name,
            tasks: buildTasks(files, texts),
            backlog: parseBacklog(texts.get("backlog.md") ?? ""),
            mtimes: new Map(files.map((file) => [file.path, file.mtime])),
            loaded: true,
          });
        }

        if (live) setHealth({ checkedAt: new Date(), error: "" });
      } catch (error) {
        if (live) {
          setHealth((previous) => ({
            ...previous,
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      }
    };

    void check();

    const timer = setInterval(() => void check(), POLL_MS);

    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [source, read]);

  return { ...snapshot, ...health, read };
}
