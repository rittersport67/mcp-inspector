import { useState } from "react";
import { Wrench, Play, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ResultView } from "@/components/ResultView";

interface Props {
  tools: Tool[];
  onCall: (name: string, args: Record<string, unknown>) => Promise<CallToolResult>;
}

type JsonSchema = Record<string, unknown>;

function resolveType(prop: JsonSchema, defs?: Record<string, JsonSchema>): string {
  if (prop.$ref && defs) {
    const refName = String(prop.$ref).split("/").pop()!;
    return refName;
  }
  if (prop.anyOf || prop.oneOf) {
    const variants = (prop.anyOf ?? prop.oneOf) as JsonSchema[];
    return variants.map((v) => resolveType(v, defs)).filter((t) => t !== "null").join(" | ");
  }
  if (prop.type === "array") {
    const items = prop.items as JsonSchema | undefined;
    return items ? `${resolveType(items, defs)}[]` : "array";
  }
  if (prop.enum) {
    return (prop.enum as unknown[]).map((v) => JSON.stringify(v)).join(" | ");
  }
  return String(prop.type ?? "any");
}

const TYPE_COLORS: Record<string, string> = {
  string: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50",
  number: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50",
  integer: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50",
  boolean: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50",
  array: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50",
  object: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50",
  null: "text-muted-foreground bg-muted",
  any: "text-muted-foreground bg-muted",
};

function typeColor(type: string): string {
  const base = type.replace(/\[\]$/, "").split(" | ")[0];
  return TYPE_COLORS[base] ?? "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50";
}

function extractRefName(prop: JsonSchema): string | null {
  if (prop.$ref) return String(prop.$ref).split("/").pop()!;
  const variants = (prop.anyOf ?? prop.oneOf) as JsonSchema[] | undefined;
  if (variants) {
    for (const v of variants) {
      if (v.$ref) return String(v.$ref).split("/").pop()!;
    }
  }
  return null;
}

function SchemaDocRows({
  properties,
  required,
  defs,
  showDescription = true,
  indent = 0,
}: {
  properties: Record<string, JsonSchema>;
  required: string[];
  defs?: Record<string, JsonSchema>;
  showDescription?: boolean;
  indent?: number;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <>
      {Object.entries(properties).map(([key, prop]) => {
        const type = resolveType(prop, defs);
        const isRequired = required.includes(key);
        const description = (prop.description ?? prop.title) as string | undefined;
        const defaultVal = prop.default;
        const refName = extractRefName(prop);
        const refDef = refName && defs ? defs[refName] : null;
        const hasNested = Boolean(refDef?.properties);

        return (
          <>
            <tr
              key={key}
              className={hasNested ? "cursor-pointer hover:bg-secondary/30" : ""}
              onClick={hasNested ? () => setExpanded((e) => ({ ...e, [key]: !e[key] })) : undefined}
            >
              <td className="py-1.5 pr-3 align-top">
                <div className="flex items-center gap-1" style={{ paddingLeft: indent * 16 }}>
                  {hasNested ? (
                    expanded[key]
                      ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                      : <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                  ) : (
                    <span className="w-3 shrink-0" />
                  )}
                  <span className="font-mono text-xs font-semibold text-foreground">{key}</span>
                  {isRequired && <span className="text-destructive text-xs leading-none">*</span>}
                </div>
              </td>
              <td className="py-1.5 pr-3 align-top">
                <span className={`inline-block font-mono text-xs px-1.5 py-0.5 rounded ${typeColor(type)}`}>
                  {type}
                </span>
              </td>
              {showDescription && (
                <td className="py-1.5 pr-3 align-top text-xs text-muted-foreground">
                  {description ?? ""}
                </td>
              )}
              <td className="py-1.5 align-top text-xs font-mono text-muted-foreground">
                {defaultVal !== undefined ? JSON.stringify(defaultVal) : ""}
              </td>
            </tr>
            {hasNested && expanded[key] && (
              <SchemaDocRows
                properties={refDef!.properties as Record<string, JsonSchema>}
                required={(refDef!.required as string[]) ?? []}
                defs={defs}
                showDescription={showDescription}
                indent={indent + 1}
              />
            )}
          </>
        );
      })}
    </>
  );
}

function SchemaTable({
  properties,
  required,
  defs,
  showDescription = true,
}: {
  properties: Record<string, JsonSchema>;
  required: string[];
  defs?: Record<string, JsonSchema>;
  showDescription?: boolean;
}) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-border">
          <th className="text-left text-xs font-semibold text-muted-foreground pb-1.5 pr-3">Name</th>
          <th className="text-left text-xs font-semibold text-muted-foreground pb-1.5 pr-3">Type</th>
          {showDescription && (
            <th className="text-left text-xs font-semibold text-muted-foreground pb-1.5 pr-3">Description</th>
          )}
          <th className="text-left text-xs font-semibold text-muted-foreground pb-1.5">Default</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/50">
        <SchemaDocRows properties={properties} required={required} defs={defs} showDescription={showDescription} />
      </tbody>
    </table>
  );
}

function resolveOutputContent(outputSchema: JsonSchema): {
  typeName: string;
  properties: Record<string, JsonSchema>;
  required: string[];
  defs?: Record<string, JsonSchema>;
} | null {
  const outDefs = (outputSchema.$defs ?? outputSchema.definitions) as Record<string, JsonSchema> | undefined;
  const outProps = outputSchema.properties as Record<string, JsonSchema> | undefined;
  if (!outProps) return null;

  const keys = Object.keys(outProps);

  // FastMCP wraps list returns in a single `result` array property
  if (keys.length === 1 && keys[0] === "result") {
    const resultProp = outProps["result"];
    if (resultProp.type === "array" && resultProp.items) {
      const items = resultProp.items as JsonSchema;
      if (items.$ref && outDefs) {
        const refName = String(items.$ref).split("/").pop()!;
        const refDef = outDefs[refName];
        if (refDef?.properties) {
          return {
            typeName: `${refName}[]`,
            properties: refDef.properties as Record<string, JsonSchema>,
            required: (refDef.required as string[]) ?? [],
            defs: outDefs,
          };
        }
      }
    }
  }

  if (keys.length === 0) return null;
  return {
    typeName: (outputSchema.title as string | undefined) ?? "object",
    properties: outProps,
    required: (outputSchema.required as string[]) ?? [],
    defs: outDefs,
  };
}

function SchemaDoc({ schema, outputSchema }: { schema: Tool["inputSchema"]; outputSchema?: JsonSchema }) {
  const [open, setOpen] = useState(true);

  if (!schema || !schema.properties) return null;

  const inputProps = schema.properties as Record<string, JsonSchema>;
  const inputRequired = (schema.required as string[]) ?? [];
  const inputDefs = (schema.$defs ?? schema.definitions) as Record<string, JsonSchema> | undefined;
  const outputContent = outputSchema ? resolveOutputContent(outputSchema) : null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Schema
        </span>
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      {open && (
        <div className="divide-y divide-border/50">
          <div className="px-4 py-3 overflow-x-auto">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Parameters</p>
            <SchemaTable properties={inputProps} required={inputRequired} defs={inputDefs} showDescription={false} />
          </div>
          {outputContent && (
            <div className="px-4 py-3 overflow-x-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Returns{" "}
                <code className="font-mono normal-case px-1.5 py-0.5 rounded bg-muted text-foreground">
                  {outputContent.typeName}
                </code>
              </p>
              <SchemaTable
                properties={outputContent.properties}
                required={outputContent.required}
                defs={outputContent.defs}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
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

  const activeTool = tools.find((t) => t.name === selected);

  function handleSelectTool(name: string) {
    const tool = tools.find((t) => t.name === name);
    setSelected(name);
    setFormValues(tool ? buildDefaultValues(tool.inputSchema) : {});
    setResult(null);
  }

  async function handleRun() {
    if (!selected) return;
    setLoading(true);
    setResult(null);
    try {
      const cleaned = Object.fromEntries(
        Object.entries(formValues).filter(([, v]) => v !== "" && v !== undefined)
      );
      const res = await onCall(selected, cleaned);
      setResult(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setResult({ isError: true, content: [{ type: "text", text: message }] });
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

            <SchemaDoc
              schema={activeTool.inputSchema}
              outputSchema={(activeTool as Record<string, unknown>).outputSchema as JsonSchema | undefined}
            />

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



            {result && <ResultView result={result} />}
          </div>
        )}
      </div>
    </div>
  );
}
