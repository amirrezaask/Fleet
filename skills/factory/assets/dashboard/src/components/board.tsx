import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { GripVertical, ListTodo } from "lucide-react";
import { countDone, countTasks, type BacklogItem, type Status, type Task } from "../model.ts";
import { columnLabel, placeColumn, type ColumnId } from "../view-model.ts";
import { Badge } from "./ui/badge.tsx";
import { Button } from "./ui/button.tsx";
import { Card } from "./ui/card.tsx";
import { cn } from "../lib/utils.ts";

interface RiseStyle extends CSSProperties {
  "--i": number;
}

export const rise = (index: number): RiseStyle => ({ "--i": Math.min(index, 12) });

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
        data-open-task={task.dir}
        onClick={() => onOpen(task.dir)}
        style={rise(index)}
        className={cn(
          "rise block w-full shrink-0 cursor-pointer p-3.5 text-left transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift active:translate-y-0 active:scale-[0.99]",
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
    <Card style={rise(index)} className={cn("rise shrink-0 p-3.5", item.taken && "opacity-60")}>
      <p
        className={cn(
          "text-[15px] leading-snug [overflow-wrap:anywhere]",
          item.taken && "line-through",
        )}
      >
        {item.text}
      </p>
      {item.task ? (
        <p className="mt-1 font-mono text-micro text-muted-foreground">→ {item.task}</p>
      ) : null}
      {item.context ? (
        <p className="mt-2 text-meta whitespace-pre-wrap text-muted-foreground [overflow-wrap:anywhere]">
          {item.context}
        </p>
      ) : null}
    </Card>
  );
}

interface Lifted {
  readonly id: ColumnId;
  readonly keyboard: boolean;
}

interface Gesture {
  readonly id: ColumnId;
  readonly pointer: number;
  readonly startX: number;
  readonly grab: number;
  readonly onGrip: boolean;
  clientX: number;
  moved: boolean;
}

interface ColumnCards {
  readonly count: number;
  readonly body: ReactNode;
}

interface BoardProps {
  readonly tasks: readonly Task[];
  readonly backlog: readonly BacklogItem[];
  readonly order: readonly ColumnId[];
  readonly onOrder: (order: readonly ColumnId[]) => void;
  readonly onAnnounce: (message: string) => void;
  readonly onOpen: (dir: string) => void;
}

export function Board({ tasks, backlog, order, onOrder, onAnnounce, onOpen }: BoardProps) {
  const boardRef = useRef<HTMLElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const lefts = useRef(new Map<ColumnId, number>());
  const [preview, setPreview] = useState<readonly ColumnId[] | null>(null);
  const [lifted, setLifted] = useState<Lifted | null>(null);
  const shown = preview ?? order;
  const shownKey = shown.join();

  const columnOf = (id: ColumnId) =>
    boardRef.current?.querySelector<HTMLElement>(`[data-column="${id}"]`) ?? null;

  // Layout positions ignore transforms, so reading them mid-animation stays stable.
  function measure() {
    for (const id of shown) {
      const element = columnOf(id);

      if (element) lefts.current.set(id, element.offsetLeft);
    }
  }

  function boardX(clientX: number) {
    const element = boardRef.current;

    return element ? clientX - element.getBoundingClientRect().left + element.scrollLeft : clientX;
  }

  function follow() {
    const current = gesture.current;
    const element = current?.moved ? columnOf(current.id) : null;

    if (current && element)
      element.style.transform = `translateX(${boardX(current.clientX) - current.grab - element.offsetLeft}px)`;
  }

  function slide(element: HTMLElement, from: string) {
    if (!("animate" in element) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    element.animate([{ transform: from }, { transform: "none" }], {
      duration: 180,
      easing: "cubic-bezier(.165,.84,.44,1)",
    });
  }

  useLayoutEffect(() => {
    for (const id of shown) {
      const element = columnOf(id);
      const before = lefts.current.get(id);

      if (!element) continue;

      if (before !== undefined && before !== element.offsetLeft && id !== gesture.current?.id)
        slide(element, `translateX(${before - element.offsetLeft}px)`);

      lefts.current.set(id, element.offsetLeft);
    }

    follow();

    if (lifted?.keyboard) {
      boardRef.current
        ?.querySelector<HTMLElement>(`[data-column-grip="${lifted.id}"]`)
        ?.focus({ preventScroll: true });
      columnOf(lifted.id)?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [shownKey]);

  function finish(next: readonly ColumnId[] | null) {
    setPreview(null);
    setLifted(null);

    if (next && next.join() !== order.join()) {
      onOrder(next);
      onAnnounce(`Columns reordered: ${next.map(columnLabel).join(", ")}.`);
    } else onAnnounce("Column order unchanged.");
  }

  function lift(id: ColumnId) {
    measure();
    setPreview(order);
    setLifted({ id, keyboard: true });
    onAnnounce(
      `${columnLabel(id)} column lifted. Use left and right arrows to move it, Enter to drop, Escape to cancel.`,
    );
  }

  function release(cancelled: boolean) {
    const current = gesture.current;

    gesture.current = null;

    if (!current?.moved) return;

    const element = columnOf(current.id);

    if (element) {
      const from = element.style.transform;

      element.style.transform = "";
      slide(element, from);
    }

    finish(cancelled ? null : shown);
  }

  function startColumn(event: ReactPointerEvent<HTMLElement>, id: ColumnId) {
    if (event.button !== 0 || lifted?.keyboard) return;

    const onGrip =
      event.target instanceof Element && event.target.closest("[data-column-grip]") !== null;

    // Touch keeps the header scrollable; only the grip starts a touch drag.
    if (!onGrip && event.pointerType !== "mouse") return;

    const element = columnOf(id);

    if (!element) return;

    event.preventDefault();

    if (onGrip) boardRef.current?.querySelector<HTMLElement>(`[data-column-grip="${id}"]`)?.focus();

    event.currentTarget.setPointerCapture(event.pointerId);
    measure();
    gesture.current = {
      id,
      pointer: event.pointerId,
      startX: event.clientX,
      clientX: event.clientX,
      grab: boardX(event.clientX) - element.offsetLeft,
      moved: false,
      onGrip,
    };
  }

  function moveColumn(event: ReactPointerEvent<HTMLElement>) {
    const current = gesture.current;
    const element = boardRef.current;

    if (!current || !element || current.pointer !== event.pointerId) return;

    current.clientX = event.clientX;

    if (!current.moved && Math.abs(event.clientX - current.startX) > 6) {
      current.moved = true;
      setPreview(order);
      setLifted({ id: current.id, keyboard: false });
      onAnnounce(`Moving ${columnLabel(current.id)} column.`);
    }

    if (!current.moved) return;

    const bounds = element.getBoundingClientRect();

    if (event.clientX < bounds.left + 32) element.scrollLeft -= 16;

    if (event.clientX > bounds.right - 32) element.scrollLeft += 16;

    const offsets = shown.map((id) => columnOf(id)?.offsetLeft ?? 0);
    const first = Math.min(...offsets);
    const step = (Math.max(...offsets) - first) / Math.max(1, shown.length - 1);

    if (step > 0) {
      const slot = Math.max(
        0,
        Math.min(
          shown.length - 1,
          Math.round((boardX(event.clientX) - current.grab - first) / step),
        ),
      );

      if (slot !== shown.indexOf(current.id)) setPreview(placeColumn(shown, current.id, slot));
    }

    follow();
  }

  function endColumn(event: ReactPointerEvent<HTMLElement>) {
    const current = gesture.current;

    if (!current || current.pointer !== event.pointerId) return;

    event.currentTarget.releasePointerCapture(event.pointerId);

    if (!current.moved) {
      gesture.current = null;

      if (current.onGrip) lift(current.id);

      return;
    }

    release(false);
  }

  function columnKey(event: ReactKeyboardEvent, id: ColumnId) {
    const space = event.key === " " || event.key === "Enter";

    if (!lifted && space) {
      event.preventDefault();
      lift(id);
    } else if (lifted?.id === id && lifted.keyboard) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();

        const slot = shown.indexOf(id) + (event.key === "ArrowRight" ? 1 : -1);

        if (slot >= 0 && slot < shown.length) {
          setPreview(placeColumn(shown, id, slot));
          onAnnounce(`${columnLabel(id)} column, position ${slot + 1} of ${shown.length}.`);
        }
      } else if (space) {
        event.preventDefault();
        finish(shown);
      } else if (event.key === "Escape") {
        event.preventDefault();
        finish(null);
      }
    }
  }

  const dragging = lifted && !lifted.keyboard;

  useEffect(() => {
    if (!lifted?.keyboard) return;

    const away = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest("[data-column-grip]"))
        finish(null);
    };

    window.addEventListener("pointerdown", away);

    return () => window.removeEventListener("pointerdown", away);
  });

  useEffect(() => {
    if (!dragging) return;

    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") release(true);
    };

    window.addEventListener("keydown", escape);

    return () => window.removeEventListener("keydown", escape);
  });

  function cards(id: ColumnId): ColumnCards {
    if (id === "queue") {
      return {
        count: backlog.length,
        body: backlog.map((item, index) => (
          <QueueItem key={`${item.text}-${index}`} item={item} index={index} />
        )),
      };
    }

    const inColumn = tasks.filter((task) => task.status === id).reverse();

    return {
      count: inColumn.length,
      body: inColumn.map((task, index) => (
        <TaskCard key={task.dir} task={task} index={index} onOpen={onOpen} />
      )),
    };
  }

  return (
    <main
      ref={boardRef}
      data-board="true"
      className="relative grid h-full grid-cols-[repeat(5,minmax(256px,1fr))] grid-rows-[minmax(0,1fr)] gap-3 overflow-x-auto pb-4"
    >
      <p id="column-instructions" className="sr-only">
        Drag a column by its header to reorder it. On the reorder grip, press Space, use left and
        right arrows, and Enter to drop or Escape to cancel.
      </p>
      {shown.map((id) => {
        const label = columnLabel(id);
        const { count, body } = cards(id);
        const isLifted = lifted?.id === id;

        return (
          <section
            key={id}
            data-column={id}
            data-lifted={isLifted ? (lifted.keyboard ? "keyboard" : "pointer") : undefined}
            aria-label={label}
            className={cn(
              "flex min-h-64 min-w-0 flex-col rounded-2xl bg-sunken transition-[box-shadow] duration-150",
              isLifted && "relative z-20 shadow-drag",
              isLifted && lifted.keyboard && "ring-2 ring-clay",
            )}
          >
            <div
              data-column-head={id}
              className="group/col flex cursor-grab items-center gap-2 px-3 pt-2.5 pb-2 select-none active:cursor-grabbing"
              onPointerDown={(event) => startColumn(event, id)}
              onPointerMove={moveColumn}
              onPointerUp={endColumn}
              onPointerCancel={() => release(true)}
            >
              <h2 className="text-sm font-semibold">{label}</h2>
              {count > 0 ? <Badge>{count}</Badge> : null}
              <Button
                data-column-grip={id}
                variant="ghost"
                size="iconSm"
                className="-mr-1 ml-auto cursor-grab touch-none text-faint opacity-0 group-focus-within/col:opacity-100 group-hover/col:opacity-100 focus-visible:opacity-100 active:cursor-grabbing [@media(hover:none)]:opacity-100"
                aria-label={`Reorder ${label} column`}
                aria-describedby="column-instructions"
                aria-pressed={isLifted}
                onKeyDown={(event) => columnKey(event, id)}
              >
                <GripVertical />
              </Button>
            </div>
            {isLifted && lifted.keyboard ? (
              <p className="px-3 pb-2 text-micro font-medium text-clay-ink">
                Arrows move · Enter drops · Esc cancels
              </p>
            ) : null}
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 pt-0.5">
              {count > 0 ? (
                body
              ) : (
                <p className="flex items-center gap-2 px-1 py-2 text-meta text-faint">
                  <ListTodo className="size-4" aria-hidden /> Nothing here
                </p>
              )}
            </div>
          </section>
        );
      })}
    </main>
  );
}
