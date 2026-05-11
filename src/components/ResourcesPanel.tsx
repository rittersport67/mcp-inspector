import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import type { Resource, ResourceContents } from "@modelcontextprotocol/sdk/types.js";
import { TextBlock } from "@/components/ResultView";

interface Props {
  resources: Resource[];
  onRead: (uri: string) => Promise<ResourceContents[]>;
}

export function ResourcesPanel({ resources, onRead }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [contents, setContents] = useState<ResourceContents[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeResource = resources.find((r) => r.uri === selected);

  async function handleSelect(uri: string) {
    setSelected(uri);
    setLoading(true);
    setError(null);
    setContents(null);
    try {
      const result = await onRead(uri);
      setContents(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (resources.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No resources exposed by this server.
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-border overflow-y-auto shrink-0">
        {resources.map((r) => (
          <button
            key={r.uri}
            onClick={() => handleSelect(r.uri)}
            className={`w-full text-left px-4 py-3 border-b border-border hover:bg-secondary/50 transition-colors ${
              selected === r.uri ? "bg-secondary" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">
                {r.name || r.uri}
              </span>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono truncate">{r.uri}</p>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {!selected && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a resource to view its contents.
          </div>
        )}

        {selected && (
          <div className="p-4 space-y-4">
            {activeResource && (
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {activeResource.name || activeResource.uri}
                </h3>
                {activeResource.description && (
                  <p className="text-sm text-muted-foreground mt-1">{activeResource.description}</p>
                )}
                <p className="text-xs font-mono text-muted-foreground/60 mt-1">{activeResource.uri}</p>
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Loading…
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {contents && !loading && (
              <div className="space-y-3">
                {contents.map((c, i) => (
                  <div key={i} className="border border-border rounded-lg bg-background overflow-hidden">
                    <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Content
                      </span>
                      {c.mimeType && (
                        <span className="text-xs bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                          {c.mimeType}
                        </span>
                      )}
                    </div>
                    <div className="p-4 max-h-[600px] overflow-auto">
                      {"text" in c && typeof c.text === "string" ? (
                        <TextBlock text={c.text} />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Binary content (blob)</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
