import { useState } from "react";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import type { Prompt, PromptMessage } from "@modelcontextprotocol/sdk/types.js";

interface Props {
  prompts: Prompt[];
  onGet: (name: string, args: Record<string, string>) => Promise<PromptMessage[]>;
}

export function PromptsPanel({ prompts, onGet }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [argValues, setArgValues] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<PromptMessage[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePrompt = prompts.find((p) => p.name === selected);

  function handleSelect(name: string) {
    const prompt = prompts.find((p) => p.name === name);
    setSelected(name);
    const defaults: Record<string, string> = {};
    if (prompt?.arguments) {
      for (const arg of prompt.arguments) {
        defaults[arg.name] = "";
      }
    }
    setArgValues(defaults);
    setMessages(null);
    setError(null);
  }

  async function handleGet() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const cleaned = Object.fromEntries(
        Object.entries(argValues).filter(([, v]) => v !== "")
      );
      const result = await onGet(selected, cleaned);
      setMessages(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setMessages(null);
    } finally {
      setLoading(false);
    }
  }

  if (prompts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No prompts exposed by this server.
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-border overflow-y-auto">
        {prompts.map((p) => (
          <button
            key={p.name}
            onClick={() => handleSelect(p.name)}
            className={`w-full text-left px-4 py-3 border-b border-border hover:bg-secondary/50 transition-colors ${
              selected === p.name ? "bg-secondary" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
            </div>
            {p.arguments && p.arguments.length > 0 && (
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                {p.arguments.length} arg{p.arguments.length > 1 ? "s" : ""}
              </p>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {!activePrompt && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a prompt to view and get messages.
          </div>
        )}
        {activePrompt && (
          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">{activePrompt.name}</h3>
              {activePrompt.description && (
                <p className="text-sm text-muted-foreground mt-1">{activePrompt.description}</p>
              )}
            </div>

            {activePrompt.arguments && activePrompt.arguments.length > 0 && (
              <div className="border border-border rounded-lg p-4 bg-card">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Arguments
                </h4>
                <div className="space-y-3">
                  {activePrompt.arguments.map((arg) => (
                    <div key={arg.name}>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        {arg.name}
                        {arg.required && <span className="text-destructive ml-0.5">*</span>}
                        {arg.description && (
                          <span className="text-muted-foreground font-normal ml-2">
                            {arg.description}
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={argValues[arg.name] || ""}
                        onChange={(e) =>
                          setArgValues({ ...argValues, [arg.name]: e.target.value })
                        }
                        className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleGet}
              disabled={loading}
              className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Get Prompt
            </button>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {messages && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Messages
                </h4>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 ${
                      msg.role === "user"
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      {msg.role}
                    </span>
                    <div className="mt-1 text-sm text-foreground whitespace-pre-wrap">
                      {typeof msg.content === "string"
                        ? msg.content
                        : JSON.stringify(msg.content, null, 2)}
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
