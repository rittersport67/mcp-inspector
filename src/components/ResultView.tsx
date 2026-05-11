import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

interface Props {
  result: CallToolResult;
}

function tryParseJson(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function ValueCell({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">null</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span className={value ? "text-success" : "text-destructive"}>
        {String(value)}
      </span>
    );
  }
  if (typeof value === "number") {
    return <span className="text-primary font-mono">{String(value)}</span>;
  }
  if (typeof value === "object") {
    return (
      <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return <span className="text-foreground break-words">{String(value)}</span>;
}

function ObjectCard({ obj, index }: { obj: Record<string, unknown>; index?: number }) {
  const entries = Object.entries(obj);
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {index !== undefined && (
        <div className="px-3 py-1.5 border-b border-border bg-secondary/40">
          <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
        </div>
      )}
      <div className="divide-y divide-border">
        {entries.map(([key, value]) => (
          <div key={key} className="flex gap-3 px-3 py-2 items-start">
            <span className="text-xs font-medium text-muted-foreground shrink-0 w-32 pt-0.5 truncate" title={key}>
              {key}
            </span>
            <div className="flex-1 text-sm">
              <ValueCell value={value} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function JsonResult({ data }: { data: unknown }) {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          Empty array []
        </div>
      );
    }
    if (data.every((item) => typeof item === "object" && item !== null && !Array.isArray(item))) {
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{data.length} item{data.length > 1 ? "s" : ""}</p>
          {data.map((item, i) => (
            <ObjectCard key={i} obj={item as Record<string, unknown>} index={i} />
          ))}
        </div>
      );
    }
    return (
      <pre className="text-sm font-mono text-foreground whitespace-pre-wrap break-words bg-muted p-3 rounded-lg">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  if (typeof data === "object" && data !== null) {
    return <ObjectCard obj={data as Record<string, unknown>} />;
  }

  return <span className="text-sm text-foreground">{String(data)}</span>;
}

export function TextBlock({ text }: { text: string }) {
  const parsed = tryParseJson(text);
  if (parsed !== null) {
    return <JsonResult data={parsed} />;
  }
  return (
    <pre className="text-sm text-foreground whitespace-pre-wrap break-words font-mono bg-muted p-3 rounded-lg">
      {text}
    </pre>
  );
}

export function ResultView({ result }: Props) {
  const blocks = (result.content ?? []) as Array<{ type: string; text?: string; data?: string; mimeType?: string }>;

  return (
    <div className="border border-border rounded-lg bg-background overflow-hidden">
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Result
        </span>
        {result.isError && (
          <span className="text-xs bg-destructive/15 text-destructive px-1.5 py-0.5 rounded font-medium">
            Error
          </span>
        )}
      </div>

      <div className="p-4 space-y-3 max-h-[600px] overflow-auto">
        {blocks.map((block, i) => {
          if (block.type === "text" && block.text != null) {
            return <TextBlock key={i} text={block.text} />;
          }
          if (block.type === "image" && block.data) {
            return (
              <img
                key={i}
                src={`data:${block.mimeType ?? "image/png"};base64,${block.data}`}
                alt="tool result"
                className="max-w-full rounded-lg border border-border"
              />
            );
          }
          return (
            <pre key={i} className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words">
              {JSON.stringify(block, null, 2)}
            </pre>
          );
        })}
      </div>
    </div>
  );
}
