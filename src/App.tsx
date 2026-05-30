import { useState } from "react";
import { Boxes, Wrench, MessageSquare, FileText } from "lucide-react";
import { ConnectionPanel } from "@/components/ConnectionPanel";
import { ResourcesPanel } from "@/components/ResourcesPanel";
import { ToolsPanel } from "@/components/ToolsPanel";
import { PromptsPanel } from "@/components/PromptsPanel";
import { LogsPanel } from "@/components/LogsPanel";
import { useMcpClient } from "@/hooks/useMcpClient";

type Tab = "resources" | "tools" | "prompts";

const TABS: { id: Tab; label: string; icon: typeof Boxes }[] = [
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "resources", label: "Resources", icon: FileText },
  { id: "prompts", label: "Prompts", icon: MessageSquare },
];

function App() {
  const mcp = useMcpClient();
  const [tab, setTab] = useState<Tab>("tools");

  const counts = {
    tools: mcp.tools.length,
    resources: mcp.resources.length,
    prompts: mcp.prompts.length,
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card px-6 py-3 flex items-center gap-3">
        <Boxes className="w-5 h-5 text-primary" />
        <h1 className="text-base font-semibold">MCP Inspector</h1>
        <span className="text-xs text-muted-foreground">v1.0.0</span>
      </header>

      <ConnectionPanel
        status={mcp.status}
        error={mcp.error}
        onConnect={mcp.connect}
        onDisconnect={mcp.disconnect}
      />

      {mcp.status === "connected" ? (
        <div className="flex-1 flex flex-col min-h-0">
          <nav className="flex border-b border-border bg-card">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {counts[id] > 0 && (
                  <span className="bg-secondary text-secondary-foreground text-xs px-1.5 py-0.5 rounded-full">
                    {counts[id]}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="flex-1 min-h-0 overflow-hidden flex">
            <div className="flex-1 min-h-0 overflow-hidden">
              {tab === "resources" && (
                <ResourcesPanel resources={mcp.resources} onRead={mcp.readResource} />
              )}
              {tab === "tools" && (
                <ToolsPanel tools={mcp.tools} onCall={mcp.callTool} />
              )}
              {tab === "prompts" && (
                <PromptsPanel prompts={mcp.prompts} onGet={mcp.getPrompt} />
              )}
            </div>
            <LogsPanel logs={mcp.logs} onClear={mcp.clearLogs} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Boxes className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground text-sm">
              Connect to an MCP server to inspect its capabilities.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
