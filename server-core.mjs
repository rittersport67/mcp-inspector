import http from 'http'
import https from 'https'
import fs from 'fs'
import path from 'path'

const MIME = {
  '.html':  'text/html',
  '.js':    'application/javascript',
  '.css':   'text/css',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.ico':   'image/x-icon',
  '.json':  'application/json',
  '.woff2': 'font/woff2',
}

const FORWARDED_REQ = ['content-type', 'authorization', 'accept', 'mcp-session-id']
const FORWARDED_RES = ['content-type', 'mcp-session-id', 'cache-control']

function proxyMcp(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-MCP-Target, mcp-session-id',
    })
    res.end()
    return
  }

  const targetUrl = req.headers['x-mcp-target']
  if (!targetUrl) {
    res.writeHead(400)
    res.end(JSON.stringify({ error: 'Missing X-MCP-Target header' }))
    return
  }

  const parsed = new URL(targetUrl)
  const mod = parsed.protocol === 'https:' ? https : http
  const upstreamHeaders = {}
  for (const key of FORWARDED_REQ) {
    if (req.headers[key]) upstreamHeaders[key] = req.headers[key]
  }

  const chunks = []
  req.on('data', chunk => chunks.push(chunk))
  req.on('end', () => {
    const body = Buffer.concat(chunks)
    if (body.length > 0) upstreamHeaders['content-length'] = String(body.length)

    const proxyReq = mod.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: req.method,
        headers: upstreamHeaders,
      },
      proxyRes => {
        const responseHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'mcp-session-id',
        }
        for (const key of FORWARDED_RES) {
          if (proxyRes.headers[key]) responseHeaders[key] = proxyRes.headers[key]
        }
        res.writeHead(proxyRes.statusCode ?? 200, responseHeaders)
        proxyRes.pipe(res)
      }
    )

    proxyReq.on('error', err => {
      if (!res.headersSent) {
        res.writeHead(502)
        res.end(JSON.stringify({ error: String(err) }))
      }
    })

    if (body.length > 0) proxyReq.write(body)
    proxyReq.end()
  })
}

function serveStatic(distDir, req, res) {
  let filePath = path.join(distDir, req.url === '/' ? 'index.html' : req.url)
  if (!fs.existsSync(filePath)) filePath = path.join(distDir, 'index.html')

  const ext = path.extname(filePath)
  const contentType = MIME[ext] || 'application/octet-stream'

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return }
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(data)
  })
}

/**
 * Creates and starts the MCP Inspector HTTP server.
 * @param {object} opts
 * @param {string} opts.distDir  - Absolute path to the built `dist/` folder
 * @param {number} opts.port     - Port to listen on
 * @param {function} [opts.onReady] - Called with the port once the server is listening
 */
export function createServer({ distDir, port, onReady }) {
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/mcp-proxy')) {
      proxyMcp(req, res)
    } else {
      serveStatic(distDir, req, res)
    }
  })

  server.listen(port, '127.0.0.1', () => {
    onReady?.(port)
  })

  return server
}
