# CLAUDE.md — MCP Inspector Lite

## Project Overview

MCP Inspector Lite is a minimal, ergonomic web UI for inspecting MCP (Model Context Protocol) servers. Built as a simpler alternative to the official `@modelcontextprotocol/inspector`, it focuses on three tabs: **Tools**, **Resources**, and **Prompts**.

---

## Architecture

```
mcp-inspector/
├── src/
│   ├── hooks/
│   │   └── useMcpClient.ts     # MCP client state + SDK integration
│   ├── components/
│   │   ├── ConnectionPanel.tsx  # URL input, status badge, connect/disconnect
│   │   ├── ToolsPanel.tsx       # List + JSON Schema form + Run
│   │   ├── ResourcesPanel.tsx   # List + content viewer
│   │   └── PromptsPanel.tsx     # List + args form + Get
│   ├── App.tsx                  # Root layout, tab switching
│   └── index.css                # Tailwind v4 theme tokens
├── vite.config.ts               # Dev server + MCP proxy plugin
└── .claude/launch.json          # Preview config (port 5173)
```

**Transport** : Streamable HTTP only (the SDK's `StreamableHTTPClientTransport`).
**Proxy** : All MCP requests go through `/mcp-proxy` — a Vite middleware that forwards to the real server and adds CORS headers. This avoids CORS issues without touching the target server.

---

## Stack

| Layer | Choice |
|-------|--------|
| Build | Vite 8 + `@vitejs/plugin-react` |
| UI | React 19 + TypeScript |
| Styles | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Icons | `lucide-react` |
| MCP | `@modelcontextprotocol/sdk` (official TS SDK) |
| Path alias | `@/` → `src/` |

---

## Running Locally

```bash
npm install
npm run dev          # http://localhost:5173
```

The proxy is built-in — no separate server needed. Point the URL field at any Streamable HTTP MCP server (e.g. `http://localhost:8000/mcp`).

---

## Key Implementation Details

### Proxy plugin (`vite.config.ts`)
The `mcpProxyPlugin` registers a Vite dev-server middleware at `/mcp-proxy`. The client sets `X-MCP-Target` to the real MCP URL; the middleware strips CORS and forwards the request. Forwarded headers: `content-type`, `authorization`, `accept`, `mcp-session-id`.

### `useMcpClient` hook
- Wraps `StreamableHTTPClientTransport` with a custom `fetch` option that reroutes all requests through `/mcp-proxy`.
- On connect: calls `listTools()`, `listResources()`, `listPrompts()` in parallel via `Promise.allSettled` (failures are silently ignored — server may not expose all three).
- Exposes: `connect`, `disconnect`, `callTool`, `readResource`, `getPrompt`.

### Auto-generated tool forms (`ToolsPanel.tsx`)
Forms are built directly from the tool's `inputSchema` (JSON Schema). Supported field types: `string`, `number`/`integer`, `boolean`, `enum`, `object`/`array` (textarea with JSON parse). Default values are pre-filled.

---

## Tested Against

- **mcp-riot** (`/Users/seb/Documents/CodeRepo/mcp-riot`) — FastMCP server on `http://localhost:8000/mcp`. 9 tools, 1 resource, 3 prompts.

---

## Out of Scope (v1)

- SSE / stdio transports
- Sampling, roots, notifications/subscribe
- Call history / request log
- Authentication flows beyond Bearer token
