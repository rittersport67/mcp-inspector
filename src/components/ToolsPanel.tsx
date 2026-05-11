import { useState } from "react";
import { Wrench, Play, Loader2 } from "lucide-react";
import type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ResultView } from "@/components/ResultView";

interface Props {
  tools: Tool[];
  onCall: (name: string, args: Record<string, unknown>) => Promise<CallToolResult>;
}

function buildDefaultValues(schema: Tool["inputSchema"]): Record<string, unknown> {
  if (!schema || schema.type !== "object" || !schema.properties) return {};
  const defaults: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(schema.properties as Record<string, Record<string, unknown>>)) {
    if (prop.default !== undefined) defaults[key] = prop.default;
    else if (prop.type === "string") defaults[key] = "";
    else if (prop.type === "number" || prop.type === "integer") defaults[key] = 0;
    else if (prop.type === "boolean") defaults[key] = false;
  }
  return defaults;
}

function SchemaForm({
  schema,
  values,
  onChange,
}: {
  schema: Tool["inputSchema"];
  values: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  if (!schema || !schema.properties) {
    return <p className="text-xs text-muted-foreground italic">No parameters</p>;
  }

  const properties = schema.properties as Record<string, Record<string, unknown>>;
  const required = (schema.required as string[]) || [];

  return (
    <div className="space-y-3">
      {Object.entries(properties).map(([key, prop]) => {
        const isRequired = required.includes(key);
        const type = prop.type as string;
        const description = prop.description as string | undefined;
        const enumValues = prop.enum as unknown[] | undefined;

        return (
          <div key={key}>
            <label className="block text-xs font-medium text-foreground mb-1">
              {key}
              {isRequired && <span className="text-destructive ml-0.5">*</span>}
              {description && (
                <span className="text-muted-foreground font-normal ml-2">{description}</span>
              )}
            </label>

            {enumValues ? (
              <select
                value={String(values[key] ?? "")}
                onChange={(e) => onChange({ ...values, [key]: e.target.value })}
                className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select…</option>
                {enumValues.map((v) => (
                  <option key={String(v)} value={String(v)}>
                    {String(v)}
                  </option>
                ))}
              </select>
            ) : type === "boolean" ? (
              <input
                type="checkbox"
                checked={Boolean(values[key])}
                onChange={(e) => onChange({ ...values, [key]: e.target.checked })}
                className="rounded border-input"
              />
            ) : type === "number" || type === "integer" ? (
              <input
                type="number"
                value={values[key] != null ? String(values[key]) : ""}
                onChange={(e) => onChange({ ...values, [key]: Number(e.target.value) })}
                className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ) : type === "object" || type === "array" ? (
              <textarea
                value={typeof values[key] === "string" ? (values[key] as string) : JSON.stringify(values[key] ?? "", null, 2)}
                onChange={(e) => {
                  try {
                    onChange({ ...values, [key]: JSON.parse(e.target.value) });
                  } catch {
                    onChange({ ...values, [key]: e.target.value });
                  }
                }}
                rows={3}
                placeholder="JSON"
                className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
            ) : (
              <input
                type="text"
                value={String(values[key] ?? "")}
                onChange={(e) => onChange({ ...values, [key]: e.target.value })}
                className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ToolsPanel({ tools, onCall }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<CallToolResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTool = tools.find((t) => t.name === selected);

  function handleSelectTool(name: string) {
    const tool = tools.find((t) => t.name === name);
    setSelected(name);
    setFormValues(tool ? buildDefaultValues(tool.inputSchema) : {});
    setResult(null);
    setError(null);
  }

  async function handleRun() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const cleaned = Object.fromEntries(
        Object.entries(formValues).filter(([, v]) => v !== "" && v !== undefined)
      );
      const res = await onCall(selected, cleaned);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  if (tools.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No tools exposed by this server.
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-border overflow-y-auto">
        {tools.map((t) => (
          <button
            key={t.name}
            onClick={() => handleSelectTool(t.name)}
            className={`w-full text-left px-4 py-3 border-b border-border hover:bg-secondary/50 transition-colors ${
              selected === t.name ? "bg-secondary" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">{t.name}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {!activeTool && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a tool to configure and run it.
          </div>
        )}
        {activeTool && (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">{activeTool.name}</h3>
              {activeTool.description && (
                <p className="text-sm text-muted-foreground mt-1">{activeTool.description}</p>
              )}
            </div>

            <div className="border border-border rounded-lg p-4 bg-card">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Parameters
              </h4>
              <SchemaForm
                schema={activeTool.inputSchema}
                values={formValues}
                onChange={setFormValues}
              />
            </div>

            <button
              onClick={handleRun}
              disabled={loading}
              className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Run
            </button>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {result && <ResultView result={result} />}
          </div>
        )}
      </div>
    </div>
  );
}
