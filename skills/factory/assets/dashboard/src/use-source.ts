import { useCallback, useEffect, useState } from "react";
import {
  folderSource,
  remembered,
  serverSource,
  type RememberedDirectory,
  type Source,
} from "./sources.ts";

interface Loading {
  readonly phase: "loading";
}

interface Ready {
  readonly phase: "ready";
  readonly source: Source;
}

interface Picking {
  readonly phase: "pick";
  readonly saved: RememberedDirectory | null;
  readonly supported: boolean;
  readonly error: string;
}

export type SourceState = Loading | Ready | Picking;

interface DirectoryPickerWindow extends Window {
  showDirectoryPicker?: (options: { id: string; mode: "read" }) => Promise<RememberedDirectory>;
}

const pickerWindow: DirectoryPickerWindow = window;

// Served over http the page reads the tiny server; opened from disk it uses a picked folder.
export interface SourceControls {
  readonly state: SourceState;
  readonly pick: () => Promise<void>;
}

export function useSource(): SourceControls {
  const [state, setState] = useState<SourceState>({ phase: "loading" });

  useEffect(() => {
    if (location.protocol.startsWith("http")) {
      setState({ phase: "ready", source: serverSource });

      return;
    }

    let live = true;

    void (async () => {
      const saved = (await remembered("get")) ?? null;

      if (saved && (await saved.queryPermission({ mode: "read" }).catch(() => "")) === "granted") {
        const source = await folderSource(saved).catch(() => null);

        if (source && live) {
          setState({ phase: "ready", source });

          return;
        }
      }

      if (live) {
        setState({
          phase: "pick",
          saved,
          supported: pickerWindow.showDirectoryPicker !== undefined,
          error: "",
        });
      }
    })();

    return () => {
      live = false;
    };
  }, []);

  const pick = useCallback(async () => {
    if (state.phase !== "pick") return;

    try {
      const granted =
        state.saved && (await state.saved.requestPermission({ mode: "read" })) === "granted";

      const directory = granted
        ? state.saved
        : await pickerWindow.showDirectoryPicker?.({ id: "factory", mode: "read" });

      if (!directory) return;

      await remembered("put", directory);
      setState({ phase: "ready", source: await folderSource(directory) });
    } catch (error) {
      // Dismissing the folder dialog is not an error worth showing.
      if (error instanceof DOMException && error.name === "AbortError") return;

      setState({ ...state, error: error instanceof Error ? error.message : String(error) });
    }
  }, [state]);

  return { state, pick };
}
