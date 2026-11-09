// The read-only alternatives to the board: every view opens tasks and changes nothing.
import { useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { countDone, countTasks, type Status, type Task } from "../model.ts";
import {
  ago,
  ATTENTION_ORDER,
  dayNumber,
  daysSince,
  hillDots,
  hillHeight,
  shortDay,
  STAGES,
  stageOf,
  stageRank,
  STATUS_LABEL,
  taskNumber,
  timelineTicks,
  todayNumber,
  type HillDot,
} from "../view-model.ts";
import { StatusDot } from "./board.tsx";
import { Button } from "./ui/button.tsx";
import { cn } from "../lib/utils.ts";

interface TaskViewProps {
  readonly tasks: readonly Task[];
  readonly onOpen: (dir: string) => void;
}

const STATUS_FILL: Record<Status, string> = {
  backlog: "bg-st-backlog",
  inprogress: "bg-st-progress",
  blocked: "bg-st-blocked",
  done: "bg-st-done",
};

const STATUS_RING: Record<Status, string> = {
  backlog: "border-st-backlog text-st-backlog-ink",
  inprogress: "border-st-progress text-st-progress-ink",
  blocked: "border-st-blocked text-st-blocked-ink",
  done: "border-st-done text-st-done-ink",
};

export function StatusRibbon({ tasks }: { tasks: readonly Task[] }) {
  return (
    <div className="flex h-[3px] w-full gap-px overflow-hidden rounded-full bg-border" aria-hidden>
      {(["backlog", "inprogress", "blocked", "done"] as const).map((status) => {
        const count = tasks.filter((task) => task.status === status).length;

        return count ? (
          <span
            key={status}
            className={cn("h-full transition-[flex-grow] duration-300", STATUS_FILL[status])}
            style={{ flexGrow: count }}
            title={`${STATUS_LABEL[status]}: ${count}`}
          />
        ) : null;
      })}
    </div>
  );
}

interface OpenTaskProps {
  readonly task: Task;
  readonly onOpen: (dir: string) => void;
  readonly className?: string;
}

function OpenTask({ task, onOpen, className }: OpenTaskProps) {
  return (
    <button
      type="button"
      data-open-task={task.dir}
      title={task.title}
      onClick={() => onOpen(task.dir)}
      className={cn(
        "min-w-0 cursor-pointer text-left decoration-clay/40 underline-offset-4 hover:underline",
        className,
      )}
    >
      {task.title}
    </button>
  );
}

export function Nothing({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl bg-sunken px-8 py-10 text-center">
      <p className="font-serif text-xl">
        {query ? `No tasks match “${query}”` : "No tasks to show here"}
      </p>
      {query ? (
        <Button variant="outline" size="sm" className="mt-5" onClick={onClear}>
          Clear filter
        </Button>
      ) : (
        <p className="mt-2 text-meta text-muted-foreground">
          Start one with <code className="font-mono text-micro">/factory intent</code> in any agent
          session, and it appears here as soon as its files land.
        </p>
      )}
    </div>
  );
}

function StationTrack({ task }: { task: Task }) {
  const stage = stageOf(task);
  const at = stageRank(task);

  return (
    <div
      role="img"
      aria-label={stage ? `At ${stage}, ${STATUS_LABEL[task.status]}` : "No stage recorded"}
      className="relative grid grid-cols-6 items-center py-3"
    >
      <span
        className={cn(
          "absolute inset-x-[8.33%] top-1/2 border-t border-border-strong",
          at < 0 && "border-dashed",
        )}
      />
      {at > 0 ? (
        <span
          className={cn(
            "absolute top-1/2 left-[8.33%] h-0.5 -translate-y-1/2",
            STATUS_FILL[task.status],
          )}
          style={{ width: `${(at / STAGES.length) * 100}%` }}
        />
      ) : null}
      {STAGES.map((name, index) => (
        <span key={name} className="relative flex justify-center">
          {index === at ? (
            <span className="rounded-full bg-background p-1 group-hover/row:bg-sunken">
              <StatusDot status={task.status} className="block size-3" />
            </span>
          ) : (
            <span
              className={cn(
                "rounded-full",
                index < at ? cn("size-2", STATUS_FILL[task.status]) : "size-1.5 bg-border-strong",
              )}
            />
          )}
        </span>
      ))}
    </div>
  );
}

export function PipelineView({ tasks, onOpen }: TaskViewProps) {
  const grid =
    "grid grid-cols-1 md:grid-cols-[minmax(230px,1.15fr)_minmax(420px,3fr)_64px] md:items-center md:gap-4";

  return (
    <div className="pb-8 md:min-w-[760px]">
      <div className={cn(grid, "sticky top-0 z-10 bg-background px-3 pt-1 pb-2")}>
        <span className="text-micro font-medium text-muted-foreground max-md:hidden">Task</span>
        <div className="grid grid-cols-6">
          {STAGES.map((stage) => (
            <span
              key={stage}
              className="text-center text-micro font-medium capitalize md:text-meta"
            >
              {stage}
              <span className="ml-1.5 text-micro font-normal text-muted-foreground tabular-nums max-md:hidden">
                {tasks.filter((task) => stageOf(task) === stage).length}
              </span>
            </span>
          ))}
        </div>
        <span className="text-right text-micro font-medium text-muted-foreground max-md:hidden">
          Moved
        </span>
      </div>
      {ATTENTION_ORDER.map((status) => {
        const group = tasks
          .filter((task) => task.status === status)
          .sort((a, b) => stageRank(b) - stageRank(a) || a.id.localeCompare(b.id));

        if (!group.length) return null;

        return (
          <section key={status} aria-label={STATUS_LABEL[status]} className="mt-4 first:mt-1">
            <h2 className="flex items-center gap-2 px-3 pb-1.5 text-meta font-medium">
              <StatusDot status={status} />
              {STATUS_LABEL[status]}
              <span className="text-micro font-normal text-muted-foreground tabular-nums">
                {group.length}
              </span>
            </h2>
            <ul className="border-t border-border">
              {group.map((task) => (
                <li
                  key={task.dir}
                  data-pipeline-task={task.dir}
                  className={cn(
                    grid,
                    "group/row border-b border-border px-3 transition-colors duration-100 hover:bg-sunken max-md:pt-2.5",
                  )}
                >
                  <div className="flex min-w-0 items-baseline gap-2.5">
                    <span className="w-7 shrink-0 text-micro text-muted-foreground tabular-nums">
                      {taskNumber(task)}
                    </span>
                    <OpenTask
                      task={task}
                      onOpen={onOpen}
                      className={cn(
                        "truncate text-sm font-medium",
                        status === "done" && "font-normal text-muted-foreground",
                      )}
                    />
                  </div>
                  <StationTrack task={task} />
                  <span
                    className="text-right text-micro text-muted-foreground tabular-nums max-md:hidden"
                    title={`Updated ${task.updated}`}
                  >
                    {ago(task.updated)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

const QUIET_AFTER_DAYS = 3;

function FocusRow({ task, onOpen }: { task: Task; onOpen: (dir: string) => void }) {
  const quiet = task.status === "inprogress" ? (daysSince(task.updated) ?? 0) : 0;
  const stage = stageOf(task);

  return (
    <li className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors duration-100 hover:bg-sunken">
      <StatusDot status={task.status} className="mt-1.5" />
      <div className="min-w-0 flex-1">
        <OpenTask
          task={task}
          onOpen={onOpen}
          className={cn(
            "block text-body leading-snug font-medium",
            task.status === "done" && "font-normal text-muted-foreground",
          )}
        />
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-micro text-muted-foreground tabular-nums">
          {taskNumber(task) ? <span>#{taskNumber(task)}</span> : null}
          {stage ? <span className="capitalize">{stage}</span> : null}
          <span title={`Updated ${task.updated}`}>{ago(task.updated)}</span>
          {quiet >= QUIET_AFTER_DAYS ? (
            <span className="rounded-full bg-st-blocked-bg px-2 py-px font-medium text-st-blocked-ink">
              Quiet {quiet}d
            </span>
          ) : null}
        </p>
        {task.blocker ? (
          <p className="mt-1.5 rounded-md bg-st-blocked-bg px-2.5 py-1.5 text-meta text-st-blocked-ink">
            {task.blocker}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function focusHeadline(blocked: number, active: number, next: Task | undefined) {
  if (blocked > 0)
    return blocked === 1
      ? "One task is waiting on a decision."
      : `${blocked} tasks are waiting on a decision.`;

  if (active > 0)
    return active === 1
      ? "One task is in progress, and nothing is stuck."
      : `${active} tasks are in progress, and nothing is stuck.`;

  if (next) return `Nothing is running. ${next.title} is next.`;

  return "All clear.";
}

export function FocusView({ tasks, onOpen }: TaskViewProps) {
  const blocked = tasks.filter((task) => task.status === "blocked");

  const active = tasks
    .filter((task) => task.status === "inprogress")
    .sort((a, b) => a.updated.localeCompare(b.updated));

  const backlog = tasks
    .filter((task) => task.status === "backlog")
    .sort((a, b) => stageRank(b) - stageRank(a) || a.id.localeCompare(b.id));

  const shipped = tasks
    .filter((task) => task.status === "done")
    .sort((a, b) => b.updated.localeCompare(a.updated));

  const sections = [
    { title: "Waiting on you", items: blocked, more: 0 },
    { title: "In progress", items: active, more: 0 },
    { title: "Up next", items: backlog.slice(0, 5), more: backlog.length - 5 },
    { title: "Recently done", items: shipped.slice(0, 4), more: shipped.length - 4 },
  ];

  return (
    <div className="mx-auto max-w-[760px] pt-4 pb-12">
      <p className="px-3 font-serif text-title text-balance">
        {focusHeadline(blocked.length, active.length, backlog[0])}
      </p>
      {sections.map((section) =>
        section.items.length ? (
          <section key={section.title} aria-label={section.title} className="mt-8">
            <h2 className="flex items-center gap-2 px-3 pb-1 text-meta font-medium text-muted-foreground">
              {section.title}
              <span className="text-micro font-normal tabular-nums">
                {section.items.length + Math.max(0, section.more)}
              </span>
            </h2>
            <ul>
              {section.items.map((task) => (
                <FocusRow key={task.dir} task={task} onOpen={onOpen} />
              ))}
            </ul>
            {section.more > 0 ? (
              <p className="px-3 pt-1 text-micro text-muted-foreground">{section.more} more</p>
            ) : null}
          </section>
        ) : null,
      )}
    </div>
  );
}

const HILL_CURVE = Array.from({ length: 101 }, (_, index) => {
  const x = index / 100;

  return `${x * 1000},${hillHeight(x) * 400}`;
}).join(" L");

interface HillListProps {
  readonly title: string;
  readonly dots: readonly HillDot[];
  readonly hot: string;
  readonly onHot: (dir: string) => void;
  readonly onOpen: (dir: string) => void;
}

function HillList({ title, dots, hot, onHot, onOpen }: HillListProps) {
  return (
    <section aria-label={title} className="min-w-0">
      <h2 className="border-b border-border px-2 pb-2 text-meta font-medium">{title}</h2>
      {dots.length ? null : (
        <p className="px-2 py-3 text-meta text-muted-foreground">Nothing here right now.</p>
      )}
      <ul>
        {dots.map(({ task }) => (
          <li
            key={task.dir}
            data-hill-task={task.dir}
            onMouseEnter={() => onHot(task.dir)}
            onMouseLeave={() => onHot("")}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors duration-100",
              hot === task.dir && "bg-sunken",
            )}
          >
            <StatusDot status={task.status} />
            <span className="w-7 shrink-0 text-micro text-muted-foreground tabular-nums">
              {taskNumber(task)}
            </span>
            <OpenTask task={task} onOpen={onOpen} className="flex-1 truncate text-sm" />
            <span className="text-micro text-muted-foreground capitalize">{stageOf(task)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HillView({ tasks, onOpen }: TaskViewProps) {
  const [hot, setHot] = useState("");
  const dots = hillDots(tasks);
  const uphill = dots.filter((dot) => dot.x < 0.5);
  const downhill = dots.filter((dot) => dot.x >= 0.5);
  const unstaged = tasks.filter((task) => !stageOf(task));
  const levels = Math.max(0, ...dots.map((dot) => dot.level));

  return (
    <div className="pb-10">
      <div className="overflow-x-auto" style={{ paddingTop: Math.max(0, levels - 2) * 38 }}>
        <div className="relative mx-auto h-[min(46vh,420px)] min-h-[300px] max-w-[1280px] min-w-[860px] md:min-w-[640px]">
          <svg
            viewBox="0 0 1000 400"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full"
            aria-hidden
          >
            <path d={`M0,400 L${HILL_CURVE} L1000,400 Z`} fill="var(--surface-sunken)" />
            <path
              d={`M${HILL_CURVE}`}
              fill="none"
              stroke="var(--border-strong)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1="500"
              x2="500"
              y1={hillHeight(0.5) * 400}
              y2="400"
              stroke="var(--border-strong)"
              strokeDasharray="4 5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span className="absolute top-2 left-[6%] font-serif text-xl">Figuring it out</span>
          <span className="absolute top-2 right-[6%] font-serif text-xl">Getting it done</span>
          {dots.map(({ task, x, y, level }) => (
            <button
              key={task.dir}
              type="button"
              data-open-task={task.dir}
              aria-label={`${task.title}, ${stageOf(task)}, ${STATUS_LABEL[task.status]}`}
              title={task.title}
              onClick={() => onOpen(task.dir)}
              onMouseEnter={() => setHot(task.dir)}
              onMouseLeave={() => setHot("")}
              onFocus={() => setHot(task.dir)}
              onBlur={() => setHot("")}
              className={cn(
                "absolute grid size-7 cursor-pointer place-items-center rounded-full border-2 bg-card text-micro font-medium tabular-nums transition-[scale,box-shadow] duration-150 ease-[var(--ease)] md:size-8",
                STATUS_RING[task.status],
                task.status === "inprogress" && "task-ping",
                task.status === "done" && "opacity-60",
                hot === task.dir && "z-10 scale-110 opacity-100 shadow-lift",
              )}
              style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                transform: `translate(-50%, calc(-50% - ${level * 38}px))`,
              }}
            >
              {taskNumber(task).replace(/^0+/, "") || task.title.slice(0, 1)}
            </button>
          ))}
          <div className="absolute inset-x-0 bottom-2 grid grid-cols-6" aria-hidden>
            {STAGES.map((stage) => (
              <span key={stage} className="text-center text-micro text-muted-foreground capitalize">
                {stage}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto mt-8 grid max-w-[1280px] grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
        <HillList title="Uphill" dots={uphill} hot={hot} onHot={setHot} onOpen={onOpen} />
        <HillList title="Downhill" dots={downhill} hot={hot} onHot={setHot} onOpen={onOpen} />
      </div>
      {unstaged.length ? (
        <section aria-label="Not on the hill" className="mx-auto mt-8 max-w-[1280px]">
          <h2 className="border-b border-border px-2 pb-2 text-meta font-medium">
            No stage recorded
          </h2>
          <ul className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
            {unstaged.map((task) => (
              <li key={task.dir} className="flex items-center gap-2.5 px-2 py-1.5">
                <StatusDot status={task.status} />
                <OpenTask task={task} onOpen={onOpen} className="truncate text-sm" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

const DAY_WIDTH = 26;

export function TimelineView({ tasks, onOpen }: TaskViewProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const now = todayNumber();

  const rows = tasks.flatMap((task) => {
    const start = dayNumber(task.created);
    const moved = dayNumber(task.updated);

    return start === null || moved === null ? [] : [{ task, start, moved }];
  });

  const undated = tasks.length - rows.length;
  const first = Math.min(now, ...rows.map((row) => row.start)) - 1;
  const last = now + 2;
  const span = last - first + 1;
  const ticks = timelineTicks(first, last);
  const percent = (day: number) => `${((day - first) / span) * 100}%`;

  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, [span]);

  const ordered = [...rows].sort((a, b) => b.start - a.start || b.task.id.localeCompare(a.task.id));

  return (
    <div ref={scroller} className="h-full overflow-auto">
      <div className="min-w-full pb-6" style={{ width: 280 + span * DAY_WIDTH }}>
        <div className="sticky top-0 z-20 flex bg-background">
          <span className="sticky left-0 z-10 flex w-[200px] shrink-0 items-end bg-background px-3 pb-2 text-micro font-medium text-muted-foreground md:w-[280px]">
            Task
          </span>
          <div className="relative h-8 flex-1 border-b border-border">
            {ticks
              .filter((day) => Math.abs(day - now) > 2)
              .map((day) => (
                <span
                  key={day}
                  className="absolute bottom-1.5 -translate-x-1/2 text-micro whitespace-nowrap text-muted-foreground tabular-nums"
                  style={{ left: percent(day) }}
                >
                  {shortDay(day)}
                </span>
              ))}
            <span
              className="absolute bottom-1.5 -translate-x-1/2 text-micro font-medium text-clay-ink"
              style={{ left: percent(now + 1) }}
            >
              Today
            </span>
          </div>
        </div>
        <ul className="relative">
          {ordered.map(({ task, start, moved }) => {
            const end = Math.max(moved, start) + 1;
            const open = task.status !== "done";

            return (
              <li
                key={task.dir}
                data-timeline-task={task.dir}
                className="group/row relative flex h-10 items-center"
              >
                <div className="sticky left-0 z-10 flex h-full w-[200px] shrink-0 items-center gap-2 bg-background px-3 group-hover/row:bg-sunken md:w-[280px]">
                  <StatusDot status={task.status} />
                  <OpenTask task={task} onOpen={onOpen} className="truncate text-sm" />
                </div>
                <div className="relative h-full flex-1">
                  {ticks.map((day) => (
                    <span
                      key={day}
                      className="absolute inset-y-0 w-px bg-border"
                      style={{ left: percent(day) }}
                    />
                  ))}
                  <span
                    className="absolute inset-y-0 w-0.5 bg-clay"
                    style={{ left: percent(now + 1) }}
                  />
                  {open && end <= now ? (
                    <span
                      className="absolute top-1/2 border-t-2 border-dotted border-border-strong"
                      style={{
                        left: percent(end),
                        width: `${((now + 1 - end) / span) * 100}%`,
                      }}
                    />
                  ) : null}
                  <span
                    title={`${task.title}: ${shortDay(start)} to ${shortDay(end - 1)}${
                      open ? ", still open" : ""
                    }`}
                    className={cn(
                      "absolute top-1/2 h-5 -translate-y-1/2 rounded-[5px]",
                      STATUS_FILL[task.status],
                      task.status === "done" && "opacity-55",
                      task.status === "backlog" && "opacity-40",
                    )}
                    style={{ left: percent(start), width: `${((end - start) / span) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        {undated ? (
          <p className="sticky left-0 px-3 pt-3 text-micro text-muted-foreground">
            {undated} task{undated === 1 ? "" : "s"} without valid dates not shown.
          </p>
        ) : null}
      </div>
    </div>
  );
}

const TABLE_COLUMNS = [
  { key: "number", label: "#", className: "w-14" },
  { key: "title", label: "Task", className: "" },
  { key: "status", label: "Status", className: "w-32" },
  { key: "stage", label: "Stage", className: "w-24" },
  { key: "subtasks", label: "Subtasks", className: "w-24" },
  { key: "created", label: "Created", className: "w-28 max-md:hidden" },
  { key: "updated", label: "Updated", className: "w-28" },
  { key: "age", label: "Age", className: "w-20 max-md:hidden" },
] as const;

type TableKey = (typeof TABLE_COLUMNS)[number]["key"];

function tableValue(task: Task, key: TableKey): string | number {
  if (key === "number") return task.id;

  if (key === "title") return task.title.toLowerCase();

  if (key === "status") return ATTENTION_ORDER.indexOf(task.status);

  if (key === "stage") return stageRank(task);

  if (key === "subtasks") return countTasks(task.subtasks);

  if (key === "created") return task.created;

  if (key === "updated") return task.updated;

  return daysSince(task.created) ?? -1;
}

export function TableView({ tasks, onOpen }: TaskViewProps) {
  const [sort, setSort] = useState<{ key: TableKey; ascending: boolean }>({
    key: "updated",
    ascending: false,
  });

  const rows = [...tasks].sort((a, b) => {
    const left = tableValue(a, sort.key);
    const right = tableValue(b, sort.key);
    const order = left < right ? -1 : left > right ? 1 : a.id.localeCompare(b.id);

    return sort.ascending ? order : -order;
  });

  const cell = "border-b border-border px-3 py-2 align-middle tabular-nums";
  const quiet = "text-meta text-muted-foreground";

  return (
    <div className="h-full overflow-auto pb-8">
      <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {TABLE_COLUMNS.map((column) => {
              const active = sort.key === column.key;
              const Arrow = sort.ascending ? ArrowUp : ArrowDown;

              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={active ? (sort.ascending ? "ascending" : "descending") : "none"}
                  className={cn(
                    "sticky top-0 z-10 border-b border-border-strong bg-background p-0 text-left",
                    column.className,
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-1 px-3 py-2 text-micro font-medium transition-colors duration-100 hover:text-foreground",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                    onClick={() =>
                      setSort({
                        key: column.key,
                        ascending: active ? !sort.ascending : column.key === "title",
                      })
                    }
                  >
                    {column.label}
                    {active ? <Arrow className="size-3" aria-hidden /> : null}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((task) => {
            const total = countTasks(task.subtasks);
            const age = daysSince(task.created);

            return (
              <tr
                key={task.dir}
                data-table-task={task.dir}
                className="transition-colors duration-100 hover:bg-sunken"
              >
                <td className={cn(cell, "text-micro text-muted-foreground")}>{taskNumber(task)}</td>
                <td className={cell}>
                  <OpenTask
                    task={task}
                    onOpen={onOpen}
                    className={cn(
                      "font-medium",
                      task.status === "done" && "font-normal text-muted-foreground",
                    )}
                  />
                </td>
                <td className={cell}>
                  <span className="flex items-center gap-2 text-meta">
                    <StatusDot status={task.status} />
                    {STATUS_LABEL[task.status]}
                  </span>
                </td>
                <td className={cn(cell, quiet, "capitalize")}>{stageOf(task) ?? ""}</td>
                <td className={cn(cell, quiet)}>
                  {total ? `${countDone(task.subtasks)}/${total}` : ""}
                </td>
                <td className={cn(cell, quiet, "max-md:hidden")}>{task.created}</td>
                <td className={cn(cell, quiet)}>{task.updated}</td>
                <td className={cn(cell, quiet, "max-md:hidden")}>
                  {age === null ? "" : `${age}d`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
