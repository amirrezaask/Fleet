import type { CSSProperties, ReactNode } from "react";
import { ListTodo } from "lucide-react";
import { countDone, countTasks, type BacklogItem, type Status, type Task } from "../model.ts";
import { Badge } from "./ui/badge.tsx";
import { Card } from "./ui/card.tsx";
import { cn } from "../lib/utils.ts";

interface RiseStyle extends CSSProperties {
  "--i": number;
}

export const rise = (index: number): RiseStyle => ({ "--i": Math.min(index, 12) });

export const STATUS_LABEL: Record<Status, string> = {
  backlog: "Backlog",
  inprogress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

const DOT: Record<Status, string> = {
  backlog: "bg-st-backlog",
  inprogress: "bg-st-progress pulse-dot",
  blocked: "bg-st-blocked",
  done: "bg-st-done",
};

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", DOT[status], className)}
    />
  );
}

interface TaskCardProps {
  readonly task: Task;
  readonly index: number;
  readonly onOpen: (dir: string) => void;
}

function TaskCard({ task, index, onOpen }: TaskCardProps) {
  const total = countTasks(task.subtasks);
  const done = countDone(task.subtasks);

  return (
    <Card asChild>
      <button
        type="button"
        onClick={() => onOpen(task.dir)}
        style={rise(index)}
        className={cn(
          "rise block w-full cursor-pointer p-3.5 text-left transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift active:translate-y-0 active:scale-[0.99]",
          task.status === "done" && "opacity-70",
          task.status === "blocked" && "border-st-blocked/60",
        )}
      >
        <span className="flex items-center gap-2 font-mono text-micro text-muted-foreground">
          <StatusDot status={task.status} />
          <span className="min-w-0 truncate">{task.id}</span>
        </span>
        <span className="mt-1.5 block text-[15px] leading-snug font-medium text-foreground">
          {task.title}
        </span>
        <span className="mt-3 flex flex-wrap items-center gap-1.5">
          {task.stage ? <Badge variant="neutral">{task.stage}</Badge> : null}
          {task.updated ? (
            <span className="font-mono text-micro text-faint">{task.updated}</span>
          ) : null}
        </span>
        {total > 0 ? (
          <span className="mt-3 flex items-center gap-2 text-micro text-muted-foreground">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-st-done transition-[width] duration-500"
                style={{ width: `${(done / total) * 100}%` }}
              />
            </span>
            <span className="font-mono">
              {done}/{total} subtasks
            </span>
          </span>
        ) : null}
        {task.blocker ? (
          <span className="mt-3 block rounded-md bg-st-blocked-bg px-2.5 py-1.5 text-meta text-st-blocked-ink">
            {task.blocker}
          </span>
        ) : null}
      </button>
    </Card>
  );
}

function QueueItem({ item, index }: { item: BacklogItem; index: number }) {
  return (
    <Card style={rise(index)} className={cn("rise p-3.5", item.taken && "opacity-60")}>
      <p className={cn("text-[15px] leading-snug", item.taken && "line-through")}>{item.text}</p>
      {item.task ? (
        <p className="mt-1 font-mono text-micro text-muted-foreground">→ {item.task}</p>
      ) : null}
      {item.context ? (
        <p className="mt-2 text-meta whitespace-pre-wrap text-muted-foreground">{item.context}</p>
      ) : null}
    </Card>
  );
}

interface ColumnProps {
  readonly label: string;
  readonly count: number;
  readonly children: ReactNode;
}

function Column({ label, count, children }: ColumnProps) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center gap-2 border-b border-border pb-2.5">
        <h2 className="text-sm font-semibold">{label}</h2>
        {count > 0 ? <Badge className="ml-auto">{count}</Badge> : null}
      </div>
      <div className="flex flex-col gap-2.5">
        {count > 0 ? (
          children
        ) : (
          <p className="flex items-center gap-2 px-1 text-meta text-faint">
            <ListTodo className="size-4" aria-hidden /> Nothing here
          </p>
        )}
      </div>
    </section>
  );
}

interface BoardProps {
  readonly tasks: readonly Task[];
  readonly backlog: readonly BacklogItem[];
  readonly onOpen: (dir: string) => void;
}

export function Board({ tasks, backlog, onOpen }: BoardProps) {
  const columns: readonly Status[] = ["backlog", "inprogress", "blocked", "done"];

  return (
    <main className="mx-auto grid max-w-[1500px] grid-cols-1 gap-x-4 gap-y-8 px-6 pt-6 pb-12 sm:grid-cols-2 xl:grid-cols-5">
      <Column label="Queue" count={backlog.length}>
        {backlog.map((item, index) => (
          <QueueItem key={`${item.text}-${index}`} item={item} index={index} />
        ))}
      </Column>
      {columns.map((status) => {
        const inColumn = tasks.filter((task) => task.status === status).reverse();

        return (
          <Column key={status} label={STATUS_LABEL[status]} count={inColumn.length}>
            {inColumn.map((task, index) => (
              <TaskCard key={task.dir} task={task} index={index} onOpen={onOpen} />
            ))}
          </Column>
        );
      })}
    </main>
  );
}
