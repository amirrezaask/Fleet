import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChartGantt,
  Columns3,
  Crosshair,
  FolderOpen,
  Monitor,
  Moon,
  Mountain,
  RotateCcw,
  Search,
  Sun,
  Table2,
  Workflow,
} from "lucide-react";
import { Board } from "./components/board.tsx";
import { TaskDrawer, type Direction, type Selection } from "./components/drawer.tsx";
import { Badge } from "./components/ui/badge.tsx";
import { Button } from "./components/ui/button.tsx";
import { Card } from "./components/ui/card.tsx";
import {
  FocusView,
  HillView,
  Nothing,
  PipelineView,
  StatusRibbon,
  TableView,
  TimelineView,
} from "./components/views.tsx";
import { readSetting, writeSetting } from "./settings.ts";
import type { Source } from "./sources.ts";
import { useDashboard } from "./use-dashboard.ts";
import { useSource } from "./use-source.ts";
import { useTheme } from "./use-theme.ts";
import { cn } from "./lib/utils.ts";
import {
  COLUMNS,
  matches,
  matchesText,
  parseColumnOrder,
  parseView,
  VIEWS,
  type ColumnId,
  type View,
} from "./view-model.ts";

const THEME_ICON = { system: Monitor, light: Sun, dark: Moon };

const VIEW_ITEMS: Record<View, { label: string; icon: typeof Columns3 }> = {
  board: { label: "Board", icon: Columns3 },
  pipeline: { label: "Pipeline", icon: Workflow },
  focus: { label: "Focus", icon: Crosshair },
  hill: { label: "Hill", icon: Mountain },
  timeline: { label: "Timeline", icon: ChartGantt },
  table: { label: "Table", icon: Table2 },
};

const HIDEABLE_VIEWS: readonly View[] = ["pipeline", "hill", "timeline", "table"];

const SELF_SCROLLING_VIEWS: readonly View[] = ["board", "timeline", "table"];

function Header({ name, status }: { name: string; status: ReactNode }) {
  const { theme, cycle } = useTheme();
  const Icon = THEME_ICON[theme];

  return (
    <header className="mx-auto flex w-full max-w-[1500px] flex-wrap items-end justify-between gap-4 px-6 pt-5">
      <div>
        <p className="text-micro font-medium tracking-wider text-muted-foreground uppercase">
          Software factory
        </p>
        <h1 className="font-serif text-display font-normal tracking-tight">{name || "Tasks"}</h1>
      </div>
      <div className="flex items-center gap-2">
        {status}
        <Button
          variant="ghost"
          size="icon"
          onClick={cycle}
          aria-label={`Theme: ${theme}. Switch theme`}
        >
          <Icon aria-hidden />
        </Button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mx-auto flex w-full max-w-[1500px] flex-wrap gap-x-6 gap-y-1 px-6 pt-2 pb-3 font-mono text-micro text-faint max-md:hidden">
      <span>/factory intent &lt;request&gt;</span>
      <span>/factory next</span>
      <span>/factory design | plan | build | review</span>
    </footer>
  );
}

function ViewSwitcher({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <nav aria-label="Views" className="max-w-full overflow-x-auto">
      <ul className="flex items-center gap-0.5 rounded-lg bg-sunken p-0.5">
        {VIEWS.map((id, index) => {
          const current = id === view;
          const { label, icon: Icon } = VIEW_ITEMS[id];

          return (
            <li key={id}>
              <button
                type="button"
                data-view={id}
                aria-current={current ? "page" : undefined}
                aria-label={label}
                title={`${label} (${index + 1})`}
                onClick={() => onChange(id)}
                className={cn(
                  "flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-meta transition-[background-color,color,box-shadow] duration-150 ease-[var(--ease)] [&_svg]:size-4",
                  current
                    ? "bg-card font-medium text-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon aria-hidden />
                <span className={cn(!current && "max-md:hidden")}>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Dashboard({ source }: { source: Source }) {
  const dashboard = useDashboard(source);
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Selection>({ dir: "", path: null, direction: "none" });
  const [view, setView] = useState<View>(() => parseView(readSetting("factory-view")));
  const [hideDone, setHideDone] = useState(() => readSetting("factory-hide-done") === "1");
  const [query, setQuery] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const filterRef = useRef<HTMLInputElement>(null);

  const [order, setOrder] = useState<readonly ColumnId[]>(() =>
    parseColumnOrder(readSetting("factory-columns")),
  );

  const openTask = useCallback((dir: string) => {
    setSelection({ dir, path: null, direction: "none" });
    setOpen(true);
  }, []);

  const navigate = useCallback((dir: string, direction: Direction) => {
    setSelection({ dir, path: null, direction });
  }, []);

  const selectFile = useCallback((path: string) => {
    setSelection((previous) => ({ ...previous, path, direction: "none" }));
  }, []);

  const chooseView = useCallback((next: View) => {
    setView(next);
    writeSetting("factory-view", next);
  }, []);

  function chooseOrder(next: readonly ColumnId[]) {
    setOrder(next);
    writeSetting("factory-columns", next.join() === COLUMNS.join() ? null : next.join());
  }

  function toggleHideDone() {
    setHideDone(!hideDone);
    writeSetting("factory-hide-done", hideDone ? null : "1");
  }

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (open || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      )
        return;

      if (event.key === "/") {
        event.preventDefault();
        filterRef.current?.focus();

        return;
      }

      const next = VIEWS[Number(event.key) - 1];

      if (next) chooseView(next);
    };

    window.addEventListener("keydown", shortcut);

    return () => window.removeEventListener("keydown", shortcut);
  }, [open, chooseView]);

  const filtered = useMemo(
    () => dashboard.tasks.filter((task) => matches(task, query)),
    [dashboard.tasks, query],
  );

  const queue = useMemo(
    () => dashboard.backlog.filter((item) => matchesText(`${item.text} ${item.context}`, query)),
    [dashboard.backlog, query],
  );

  const canHide = HIDEABLE_VIEWS.includes(view);
  const visible = canHide && hideDone ? filtered.filter((t) => t.status !== "done") : filtered;

  const status = (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-micro text-muted-foreground",
        dashboard.error && "border-st-blocked/60 text-st-blocked-ink",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          dashboard.error ? "bg-st-blocked" : "bg-st-done pulse-dot",
        )}
      />
      {dashboard.error ||
        `${source.label} · ${dashboard.checkedAt?.toLocaleTimeString() ?? "connecting"}`}
    </span>
  );

  function content() {
    if (view === "board") {
      return (
        <Board
          tasks={filtered}
          backlog={queue}
          order={order}
          onOrder={chooseOrder}
          onAnnounce={setAnnouncement}
          onOpen={openTask}
        />
      );
    }

    if (!visible.length) return <Nothing query={query} onClear={() => setQuery("")} />;

    if (view === "pipeline") return <PipelineView tasks={visible} onOpen={openTask} />;

    if (view === "focus") return <FocusView tasks={visible} onOpen={openTask} />;

    if (view === "hill") return <HillView tasks={visible} onOpen={openTask} />;

    if (view === "timeline") return <TimelineView tasks={visible} onOpen={openTask} />;

    return <TableView tasks={visible} onOpen={openTask} />;
  }

  return (
    <div className="flex h-dvh min-h-[520px] flex-col">
      <Header name={dashboard.name} status={status} />
      <div className="mx-auto w-full max-w-[1500px] px-6 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <ViewSwitcher view={view} onChange={chooseView} />
          <div className="ml-auto flex max-w-full flex-wrap items-center gap-2">
            {view === "board" && order.join() !== COLUMNS.join() ? (
              <Button variant="ghost" size="sm" onClick={() => chooseOrder(COLUMNS)}>
                <RotateCcw aria-hidden />
                Reset columns
              </Button>
            ) : null}
            {canHide ? (
              <Button variant="ghost" size="sm" aria-pressed={hideDone} onClick={toggleHideDone}>
                {hideDone ? "Show done" : "Hide done"}
              </Button>
            ) : null}
            <label className="relative block">
              <span className="sr-only">Filter tasks</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint"
                aria-hidden
              />
              <input
                ref={filterRef}
                type="search"
                value={query}
                placeholder="Filter"
                aria-keyshortcuts="/"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setQuery("");
                    event.currentTarget.blur();
                  }
                }}
                className="h-8 w-36 rounded-md border border-border bg-card pr-2 pl-8 text-meta transition-[width] duration-150 ease-[var(--ease)] placeholder:text-muted-foreground focus:w-52 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </div>
        </div>
        <div className="mt-3">
          <StatusRibbon tasks={dashboard.tasks} />
        </div>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 flex-col px-6 pt-3">
        {dashboard.loaded ? (
          <div
            key={view}
            className={cn(
              "view-in min-h-0 flex-1",
              SELF_SCROLLING_VIEWS.includes(view) ? "overflow-hidden" : "overflow-y-auto",
            )}
          >
            {content()}
          </div>
        ) : (
          <p className="py-12 text-muted-foreground">{dashboard.error || "Loading tasks…"}</p>
        )}
      </div>
      <Footer />
      <TaskDrawer
        open={open}
        selection={selection}
        tasks={dashboard.tasks}
        mtimes={dashboard.mtimes}
        read={dashboard.read}
        onNavigate={navigate}
        onSelectFile={selectFile}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

export function App() {
  const { state, pick } = useSource();

  if (state.phase === "ready") return <Dashboard source={state.source} />;

  return (
    <>
      <Header name="" status={null} />
      <main className="mx-auto max-w-lg px-6 py-16">
        {state.phase === "loading" ? (
          <p className="text-center text-muted-foreground">Loading…</p>
        ) : (
          <Card className="rise p-8 text-center">
            <FolderOpen className="mx-auto size-8 text-clay" aria-hidden />
            <h2 className="mt-4 font-serif text-2xl font-normal">Open a project</h2>
            {state.supported ? (
              <>
                <p className="mt-2 text-muted-foreground">
                  Pick the project's folder in{" "}
                  <code className="font-mono text-meta">~/.agents/factory</code>. Nothing is
                  uploaded or written; the browser only asks to read it.
                </p>
                <Button className="mt-6" onClick={() => void pick()}>
                  {state.saved ? `Reopen ${state.saved.name}` : "Choose folder"}
                </Button>
              </>
            ) : (
              <p className="mt-2 text-muted-foreground">
                Opening a folder needs a Chromium-based browser. Run{" "}
                <code className="font-mono text-meta">npm run factory:board</code> in the repository
                to serve this page instead.
              </p>
            )}
            {state.error ? (
              <Badge variant="blocked" className="mt-4">
                {state.error}
              </Badge>
            ) : null}
          </Card>
        )}
      </main>
    </>
  );
}
