import { useState, type FormEvent } from "react";
import { Plug, Unplug, RotateCw } from "lucide-react";
import type { ConnectionStatus } from "@/hooks/useMcpClient";

interface Props {
  status: ConnectionStatus;
  error: string | null;
  onConnect: (url: string, token?: string) => void;
  onDisconnect: () => void;
}

const STATUS_STYLES: Record<ConnectionStatus, string> = {
  disconnected: "bg-muted-foreground",
  connecting: "bg-warning animate-pulse",
  connected: "bg-success",
  error: "bg-destructive",
};

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  disconnected: "Disconnected",
  connecting: "Connecting…",
  connected: "Connected",
  error: "Error",
};

export function ConnectionPanel({ status, error, onConnect, onDisconnect }: Props) {
  const [url, setUrl] = useState(() => localStorage.getItem("mcp-url") || "http://localhost:8000/mcp");
  const [token, setToken] = useState("");
  const [showAuth, setShowAuth] = useState(false);

  const isConnected = status === "connected";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    localStorage.setItem("mcp-url", url);
    onConnect(url, token || undefined);
  }

  return (
    <div className="border-b border-border bg-card px-6 py-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${STATUS_STYLES[status]}`} />
          <span className="text-sm text-muted-foreground font-medium">
            {STATUS_LABELS[status]}
          </span>
        </div>

        <div className="h-5 w-px bg-border" />

        <label className="text-sm text-muted-foreground">Streamable HTTP</label>

        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://localhost:3001/mcp"
          disabled={isConnected}
          className="flex-1 min-w-[280px] bg-background border border-input rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />

        <button
          type="button"
          onClick={() => setShowAuth(!showAuth)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAuth ? "Hide Auth" : "Auth"}
        </button>

        {!isConnected ? (
          <button
            type="submit"
            disabled={status === "connecting"}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-4 py-1.5 rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Plug className="w-3.5 h-3.5" />
            Connect
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onConnect(url, token || undefined)}
              className="inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground text-sm font-medium px-3 py-1.5 rounded-md hover:bg-secondary/80 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Reconnect
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              className="inline-flex items-center gap-1.5 bg-destructive text-destructive-foreground text-sm font-medium px-3 py-1.5 rounded-md hover:bg-destructive/90 transition-colors"
            >
              <Unplug className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        )}
      </form>

      {showAuth && (
        <div className="mt-3">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Bearer token (optional)"
            disabled={isConnected}
            className="w-full max-w-sm bg-background border border-input rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
