// Pure logic behind the board's views. No DOM, so tests import it directly.
import { STATUSES, type Status, type Task } from "./model.ts";

export const STAGES = ["intent", "design", "plan", "build", "review", "done"] as const;

export type Stage = (typeof STAGES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  backlog: "Backlog",
  inprogress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

export const ATTENTION_ORDER: readonly Status[] = ["blocked", "inprogress", "backlog", "done"];

export const COLUMNS = ["queue", ...STATUSES] as const;

export type ColumnId = (typeof COLUMNS)[number];

export const columnLabel = (id: ColumnId) => (id === "queue" ? "Queue" : STATUS_LABEL[id]);

export const VIEWS = ["board", "pipeline", "focus", "hill", "timeline", "table"] as const;

export type View = (typeof VIEWS)[number];

// A saved order is used only when it names every column exactly once.
export function parseColumnOrder(saved: string | null): readonly ColumnId[] {
  const order = (saved ?? "").split(",").flatMap((part) => COLUMNS.filter((id) => id === part));

  return order.length === COLUMNS.length && new Set(order).size === COLUMNS.length
    ? order
    : COLUMNS;
}

export function placeColumn(
  order: readonly ColumnId[],
  id: ColumnId,
  slot: number,
): readonly ColumnId[] {
  const rest = order.filter((column) => column !== id);

  return [...rest.slice(0, slot), id, ...rest.slice(slot)];
}

export const parseView = (saved: string | null): View =>
  VIEWS.find((view) => view === saved) ?? "board";

// A finished task has left the line, whatever stage its metadata last recorded.
export const stageOf = (task: Task): Stage | undefined =>
  task.status === "done" ? "done" : STAGES.find((stage) => stage === task.stage);

export function stageRank(task: Task): number {
  const stage = stageOf(task);

  return stage ? STAGES.indexOf(stage) : -1;
}

export const taskNumber = (task: Task) => /^(\d+)-/.exec(task.id)?.[1] ?? "";

const searchText = (task: Task): string =>
  [
    task.id,
    task.title,
    STATUS_LABEL[task.status],
    task.stage,
    ...task.subtasks.map(searchText),
  ].join(" ");

export function matchesText(text: string, query: string): boolean {
  const haystack = text.toLowerCase();

  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

export const matches = (task: Task, query: string) => matchesText(searchText(task), query);

const DAY_MS = 86_400_000;

// Task dates are calendar days, so all arithmetic happens on whole UTC day numbers.
export function dayNumber(date: string): number | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!parts) return null;

  return Math.floor(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) / DAY_MS);
}

export const todayNumber = (now = new Date()) =>
  Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS);

export function daysSince(date: string, now = new Date()): number | null {
  const day = dayNumber(date);

  return day === null ? null : todayNumber(now) - day;
}

export function ago(date: string, now = new Date()): string {
  const days = daysSince(date, now);

  if (days === null) return "no date";

  if (days <= 0) return "today";

  if (days === 1) return "yesterday";

  if (days < 60) return `${days}d ago`;

  return `${Math.round(days / 30)}mo ago`;
}

export const shortDay = (day: number) =>
  new Date(day * DAY_MS).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

// Mondays while a week is readable at this scale, month starts after that.
export function timelineTicks(first: number, last: number): number[] {
  const weekly = last - first <= 84;

  return Array.from({ length: last - first + 1 }, (_, index) => first + index).filter((day) => {
    const date = new Date(day * DAY_MS);

    return weekly ? date.getUTCDay() === 1 : date.getUTCDate() === 1;
  });
}

export const hillHeight = (x: number) => 0.9 - 0.56 * Math.exp(-((x - 0.5) ** 2) / (2 * 0.19 ** 2));

export interface HillDot {
  readonly task: Task;
  readonly x: number;
  readonly y: number;
  readonly level: number;
}

const HILL_ROW = 4;

// Each stage owns an equal band of the hill; crowded bands stack upward in rows.
export function hillDots(tasks: readonly Task[]): HillDot[] {
  return STAGES.flatMap((stage, band) => {
    const group = tasks.filter((task) => stageOf(task) === stage);

    return group.map((task, index) => {
      const level = Math.floor(index / HILL_ROW);

      const inRow =
        level < Math.floor(group.length / HILL_ROW) ? HILL_ROW : group.length % HILL_ROW;

      const x = (band + 0.08 + (0.84 * ((index % HILL_ROW) + 0.5)) / inRow) / STAGES.length;

      return { task, x, y: hillHeight(x), level };
    });
  });
}
