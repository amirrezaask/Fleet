import { useEffect, useState, type MouseEvent } from "react";
import { ArrowRight, FileText } from "lucide-react";
import { renderMarkdown } from "../markdown.ts";
import { findTask, resolveRelative, trail, type Task } from "../model.ts";
import { rise, StatusDot, STATUS_LABEL } from "./board.tsx";
import { Badge } from "./ui/badge.tsx";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb.tsx";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./ui/sheet.tsx";
import { cn } from "../lib/utils.ts";

export type Direction = "in" | "out" | "none";

export interface Selection {
  readonly dir: string;
  readonly path: string | null;
  readonly direction: Direction;
}

interface DocProps {
  readonly full: string;
  readonly mtime: number;
  readonly read: (path: string, mtime: number) => Promise<string>;
  readonly onRelative: (href: string) => void;
}

// Keyed by path by the parent: switching documents remounts it, so every document animates in.
function Doc({ full, mtime, read, onRelative }: DocProps) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let live = true;

    read(full, mtime).then(
      (text) => live && setHtml(renderMarkdown(text)),
      (error) =>
        live &&
        setHtml(`<p>${error instanceof Error ? error.message : "Could not read this file."}</p>`),
    );

    return () => {
      live = false;
    };
  }, [full, mtime, read]);

  if (html === null) {
    return <div aria-busy className="h-40 animate-pulse rounded-lg bg-muted/60" />;
  }

  const follow = (event: MouseEvent) => {
    const link = event.target instanceof Element ? event.target.closest("[data-rel]") : null;
    const href = link?.getAttribute("data-rel");

    if (!href) return;

    event.preventDefault();
    onRelative(href);
  };

  // SAFETY: the HTML comes from renderMarkdown, which escapes raw HTML and allows only http(s) and task-document links.
  return (
    <div className="reader doc-in" onClick={follow} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

interface TaskDrawerProps {
  readonly open: boolean;
  readonly selection: Selection;
  readonly tasks: readonly Task[];
  readonly mtimes: ReadonlyMap<string, number>;
  readonly read: (path: string, mtime: number) => Promise<string>;
  readonly onNavigate: (dir: string, direction: Direction) => void;
  readonly onSelectFile: (path: string) => void;
  readonly onClose: () => void;
}

export function TaskDrawer({
  open,
  selection,
  tasks,
  mtimes,
  read,
  onNavigate,
  onSelectFile,
  onClose,
}: TaskDrawerProps) {
  const task = findTask(tasks, selection.dir);
  const chain = trail(tasks, selection.dir);

  const path =
    selection.path && task?.files.includes(selection.path)
      ? selection.path
      : (task?.files[0] ?? null);

  const full = task && path ? `${task.dir}/${path}` : null;
  const mtime = full ? mtimes.get(full) : undefined;
  let lastGroup = "";

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent aria-describedby={undefined}>
        {task ? (
          <div
            key={task.dir}
            data-dir={selection.direction}
            className="level flex min-h-0 flex-1 flex-col"
          >
            <header className="border-b border-border px-6 pt-5 pr-16 pb-4">
              <div className="rise" style={rise(0)}>
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <button type="button" onClick={onClose}>
                          Tasks
                        </button>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {chain.map((step, index) => (
                      <BreadcrumbItem key={step.dir}>
                        <BreadcrumbSeparator />
                        {index === chain.length - 1 ? (
                          <BreadcrumbPage>{step.id}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <button type="button" onClick={() => onNavigate(step.dir, "out")}>
                              {step.id}
                            </button>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              <SheetTitle
                className="rise mt-2.5 font-serif text-[28px] leading-tight font-normal tracking-tight"
                style={rise(1)}
              >
                {task.title}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Documents and subtasks of {task.id}
              </SheetDescription>
              <div className="rise mt-3 flex flex-wrap items-center gap-2" style={rise(2)}>
                <Badge variant={task.status}>
                  <StatusDot status={task.status} />
                  {STATUS_LABEL[task.status]}
                </Badge>
                {task.stage ? <Badge>{task.stage}</Badge> : null}
                {task.updated ? (
                  <span className="font-mono text-micro text-faint">{task.updated}</span>
                ) : null}
              </div>
              {task.blocker ? (
                <p
                  className="rise mt-3 rounded-md bg-st-blocked-bg px-3 py-2 text-meta text-st-blocked-ink"
                  style={rise(3)}
                >
                  {task.blocker}
                </p>
              ) : null}
            </header>
            <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr] max-sm:grid-cols-1 max-sm:grid-rows-[auto_1fr]">
              <nav
                aria-label="Task documents"
                className="rise overflow-y-auto border-r border-border bg-sunken/60 p-3 max-sm:flex max-sm:gap-1 max-sm:overflow-x-auto max-sm:border-r-0 max-sm:border-b"
                style={rise(3)}
              >
                {task.files.map((file) => {
                  const group = file.includes("/")
                    ? file.slice(0, file.lastIndexOf("/"))
                    : "Documents";

                  const heading = group !== lastGroup;

                  lastGroup = group;

                  return (
                    <div key={file} className="max-sm:contents">
                      {heading ? (
                        <p className="mt-3 mb-1 px-2 text-micro font-medium tracking-wide text-faint uppercase first:mt-0 max-sm:hidden">
                          {group}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        aria-current={file === path ? "true" : undefined}
                        onClick={() => onSelectFile(file)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-mono text-micro text-muted-foreground transition-colors hover:bg-accent hover:text-foreground max-sm:w-auto max-sm:whitespace-nowrap",
                          file === path && "bg-accent text-foreground",
                        )}
                      >
                        <FileText className="size-3.5 shrink-0 text-faint" aria-hidden />
                        {file.split("/").pop()}
                      </button>
                    </div>
                  );
                })}
                {task.subtasks.length > 0 ? (
                  <div className="max-sm:contents">
                    <p className="mt-4 mb-1 px-2 text-micro font-medium tracking-wide text-faint uppercase max-sm:hidden">
                      Subtasks
                    </p>
                    {task.subtasks.map((subtask) => (
                      <button
                        key={subtask.dir}
                        type="button"
                        onClick={() => onNavigate(subtask.dir, "in")}
                        className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-mono text-micro text-muted-foreground transition-colors hover:bg-accent hover:text-foreground max-sm:w-auto max-sm:whitespace-nowrap"
                      >
                        <StatusDot status={subtask.status} />
                        <span className="min-w-0 flex-1 truncate">{subtask.id}</span>
                        <ArrowRight
                          className="size-3.5 shrink-0 -translate-x-1 opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100"
                          aria-hidden
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </nav>
              <article className="min-w-0 overflow-y-auto px-8 py-6 max-sm:px-5">
                {full && mtime !== undefined ? (
                  <Doc
                    key={full}
                    full={full}
                    mtime={mtime}
                    read={read}
                    onRelative={(href) => {
                      const target = resolveRelative(full, href);

                      if (target.startsWith(`${task.dir}/`))
                        onSelectFile(target.slice(task.dir.length + 1));
                    }}
                  />
                ) : (
                  <p className="text-muted-foreground italic">No documents yet.</p>
                )}
              </article>
            </div>
          </div>
        ) : (
          <SheetTitle className="sr-only">Task</SheetTitle>
        )}
      </SheetContent>
    </Sheet>
  );
}
