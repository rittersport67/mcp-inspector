import { useState, useCallback, useRef } from "react";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { LoggingMessageNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import type {
  Tool,
  Resource,
  Prompt,
  ResourceContents,
  PromptMessage,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface McpState {
  status: ConnectionStatus;
  error: string | null;
  tools: Tool[];
  resources: Resource[];
  prompts: Prompt[];
}

export interface LogEntry {
  id: number;
  timestamp: Date;
  level: string;
  logger?: string;
  data: unknown;
}

function createProxiedFetch(targetUrl: string, authToken?: string): typeof globalThis.fetch {
  return (input, init) => {
    const proxyUrl = new URL("/mcp-proxy", window.location.origin);

    const headers = new Headers(init?.headers);
    headers.set("X-MCP-Target", targetUrl);
    if (authToken) {
      headers.set("Authorization", `Bearer ${authToken}`);
    }

    void input;
    return globalThis.fetch(proxyUrl.toString(), {
      ...init,
      headers,
    });
  };
}

export function useMcpClient() {
  const [state, setState] = useState<McpState>({
    status: "disconnected",
    error: null,
    tools: [],
    resources: [],
    prompts: [],
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);

  const clientRef = useRef<Client | null>(null);

  const connect = useCallback(async (url: string, authToken?: string) => {
    if (clientRef.current) {
      try { await clientRef.current.close(); } catch { /* ignore */ }
    }

    setState((s) => ({ ...s, status: "connecting", error: null }));
    setLogs([]);

    try {
      const transport = new StreamableHTTPClientTransport(new URL(url), {
        fetch: createProxiedFetch(url, authToken),
      });

      const client = new Client(
        { name: "mcp-inspector-lite", version: "1.0.0" },
        { capabilities: {} }
      );

      client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
        setLogs((prev) => [
          ...prev,
          {
            id: logIdRef.current++,
            timestamp: new Date(),
            level: notification.params.level,
            logger: notification.params.logger,
            data: notification.params.data,
          },
        ]);
      });

      await client.connect(transport);
      clientRef.current = client;

      // Request debug-level logs from the server (silently skip if not supported)
      client.setLoggingLevel("debug").catch(() => {});

      const [toolsRes, resourcesRes, promptsRes] = await Promise.allSettled([
        client.listTools(),
        client.listResources(),
        client.listPrompts(),
      ]);

      setState({
        status: "connected",
        error: null,
        tools: toolsRes.status === "fulfilled" ? toolsRes.value.tools : [],
        resources: resourcesRes.status === "fulfilled" ? resourcesRes.value.resources : [],
        prompts: promptsRes.status === "fulfilled" ? promptsRes.value.prompts : [],
      });
    } catch (err) {
      clientRef.current = null;
      setState({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
        tools: [],
        resources: [],
        prompts: [],
      });
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (clientRef.current) {
      try { await clientRef.current.close(); } catch { /* ignore */ }
      clientRef.current = null;
    }
    setState({ status: "disconnected", error: null, tools: [], resources: [], prompts: [] });
    setLogs([]);
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  const callTool = useCallback(async (name: string, args: Record<string, unknown>): Promise<CallToolResult> => {
    if (!clientRef.current) throw new Error("Not connected");
    return clientRef.current.callTool({ name, arguments: args }) as Promise<CallToolResult>;
  }, []);

  const readResource = useCallback(async (uri: string): Promise<ResourceContents[]> => {
    if (!clientRef.current) throw new Error("Not connected");
    const result = await clientRef.current.readResource({ uri });
    return result.contents;
  }, []);

  const getPrompt = useCallback(async (name: string, args: Record<string, string>): Promise<PromptMessage[]> => {
    if (!clientRef.current) throw new Error("Not connected");
    const result = await clientRef.current.getPrompt({ name, arguments: args });
    return result.messages;
  }, []);

  return { ...state, logs, clearLogs, connect, disconnect, callTool, readResource, getPrompt };
}
