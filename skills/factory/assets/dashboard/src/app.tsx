import { useCallback, useState, type ReactNode } from "react";
import { FolderOpen, Monitor, Moon, Sun } from "lucide-react";
import { Board } from "./components/board.tsx";
import { TaskDrawer, type Direction, type Selection } from "./components/drawer.tsx";
import { Badge } from "./components/ui/badge.tsx";
import { Button } from "./components/ui/button.tsx";
import { Card } from "./components/ui/card.tsx";
import type { Source } from "./sources.ts";
import { useDashboard } from "./use-dashboard.ts";
import { useSource } from "./use-source.ts";
import { useTheme } from "./use-theme.ts";
import { cn } from "./lib/utils.ts";

const THEME_ICON = { system: Monitor, light: Sun, dark: Moon };

function Header({ name, status }: { name: string; status: ReactNode }) {
  const { theme, cycle } = useTheme();
  const Icon = THEME_ICON[theme];

  return (
    <header className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-4 px-6 pt-8">
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
    <footer className="mx-auto flex max-w-[1500px] flex-wrap gap-x-6 gap-y-1 px-6 pb-8 font-mono text-micro text-faint">
      <span>/factory intent &lt;request&gt;</span>
      <span>/factory next</span>
      <span>/factory design | plan | build | review</span>
    </footer>
  );
}

function Dashboard({ source }: { source: Source }) {
  const dashboard = useDashboard(source);
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Selection>({ dir: "", path: null, direction: "none" });

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

  return (
    <>
      <Header name={dashboard.name} status={status} />
      {dashboard.loaded ? (
        <Board tasks={dashboard.tasks} backlog={dashboard.backlog} onOpen={openTask} />
      ) : (
        <p className="mx-auto max-w-[1500px] px-6 py-12 text-muted-foreground">
          {dashboard.error || "Loading tasks…"}
        </p>
      )}
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
    </>
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
            <h2 className="mt-4 font-serif text-2xl font-normal">Open a repository</h2>
            {state.supported ? (
              <>
                <p className="mt-2 text-muted-foreground">
                  Pick the repository or its <code className="font-mono text-meta">.factory</code>{" "}
                  folder. Nothing is uploaded or written; the browser only asks to read it.
                </p>
                <Button className="mt-6" onClick={() => void pick()}>
                  {state.saved ? `Reopen ${state.saved.name}` : "Choose folder"}
                </Button>
              </>
            ) : (
              <p className="mt-2 text-muted-foreground">
                Opening a folder needs a Chromium-based browser. Run{" "}
                <code className="font-mono text-meta">factory-dashboard</code> in the repository to
                serve this page instead.
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
