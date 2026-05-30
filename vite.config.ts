import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import http from 'http'
import https from 'https'

const FORWARDED_REQUEST_HEADERS = ['content-type', 'authorization', 'accept', 'mcp-session-id']
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'mcp-session-id', 'cache-control']

function mcpProxyPlugin(): Plugin {
  return {
    name: 'mcp-proxy',
    configureServer(server) {
      server.middlewares.use('/mcp-proxy', (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-MCP-Target, mcp-session-id',
          })
          res.end()
          return
        }

        const targetUrl = req.headers['x-mcp-target'] as string
        if (!targetUrl) {
          res.writeHead(400)
          res.end(JSON.stringify({ error: 'Missing X-MCP-Target header' }))
          return
        }

        const parsed = new URL(targetUrl)
        const mod = parsed.protocol === 'https:' ? https : http

        const upstreamHeaders: Record<string, string> = {}
        for (const key of FORWARDED_REQUEST_HEADERS) {
          const val = req.headers[key]
          if (val) upstreamHeaders[key] = val as string
        }

        // GET requests to MCP endpoints are always SSE — force the required Accept header
        if (req.method === 'GET') {
          upstreamHeaders['accept'] = 'text/event-stream'
        }

        const chunks: Buffer[] = []
        req.on('data', (chunk: Buffer) => chunks.push(chunk))
        req.on('end', () => {
          const body = Buffer.concat(chunks)

          const proxyReq = mod.request(
            {
              hostname: parsed.hostname,
              port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
              path: parsed.pathname + parsed.search,
              method: req.method,
              headers: { ...upstreamHeaders, ...(body.length > 0 ? { 'content-length': String(body.length) } : {}) },
            },
            (proxyRes) => {
              const responseHeaders: Record<string, string> = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Expose-Headers': 'mcp-session-id',
              }
              for (const key of FORWARDED_RESPONSE_HEADERS) {
                const val = proxyRes.headers[key]
                if (val) responseHeaders[key] = val as string
              }

              res.writeHead(proxyRes.statusCode ?? 200, responseHeaders)
              proxyRes.pipe(res)
            }
          )

          proxyReq.on('error', (err) => {
            if (!res.headersSent) {
              res.writeHead(502)
              res.end(JSON.stringify({ error: String(err) }))
            }
          })

          if (body.length > 0) proxyReq.write(body)
          proxyReq.end()
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), mcpProxyPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
