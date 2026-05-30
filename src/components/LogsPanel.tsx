import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import type { LogEntry } from "@/hooks/useMcpClient";

const LEVEL_STYLES: Record<string, string> = {
  debug:     "text-muted-foreground bg-muted",
  info:      "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50",
  notice:    "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50",
  warning:   "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50",
  error:     "text-destructive bg-destructive/10",
  critical:  "text-destructive bg-destructive/10",
  alert:     "text-destructive bg-destructive/10",
  emergency: "text-destructive bg-destructive/10",
};

function formatTime(date: Date): string {
  const hms = date.toLocaleTimeString("en", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${hms}.${String(date.getMilliseconds()).padStart(3, "0")}`;
}

function formatPayload(data: unknown): { message: string; detail?: string } {
  if (data === undefined || data === null) return { message: "" };
  if (typeof data === "string") return { message: data };
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.message === "string") {
      const detail = obj.data !== undefined
        ? (typeof obj.data === "string" ? obj.data : JSON.stringify(obj.data, null, 2))
        : undefined;
      return { message: obj.message, detail };
    }
    return { message: JSON.stringify(data, null, 2) };
  }
  return { message: String(data) };
}

interface Props {
  logs: LogEntry[];
  onClear: () => void;
}

export function LogsPanel({ logs, onClear }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <div className="w-80 border-l border-border flex flex-col bg-background shrink-0">
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Logs</span>
          {logs.length > 0 && (
            <span className="bg-secondary text-secondary-foreground text-xs px-1.5 py-0.5 rounded-full">
              {logs.length}
            </span>
          )}
        </div>
        <button
          onClick={onClear}
          disabled={logs.length === 0}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
          title="Clear logs"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            Waiting for logs…
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {logs.map((entry) => (
              <div key={entry.id} className="px-3 py-2 space-y-1 hover:bg-secondary/20 transition-colors">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">
                    {formatTime(entry.timestamp)}
                  </span>
                  <span className={`text-[10px] font-semibold uppercase px-1 py-0.5 rounded shrink-0 ${LEVEL_STYLES[entry.level] ?? LEVEL_STYLES.info}`}>
                    {entry.level}
                  </span>
                  {entry.logger && (
                    <span className="text-[10px] font-mono text-muted-foreground truncate">
                      {entry.logger}
                    </span>
                  )}
                </div>
                {(() => {
                  const { message, detail } = formatPayload(entry.data);
                  return (
                    <>
                      <p className="text-xs font-mono text-foreground break-words whitespace-pre-wrap leading-relaxed">
                        {message}
                      </p>
                      {detail && (
                        <pre className="text-[10px] font-mono text-muted-foreground break-words whitespace-pre-wrap mt-1 pl-2 border-l border-border">
                          {detail}
                        </pre>
                      )}
                    </>
                  );
                })()}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
