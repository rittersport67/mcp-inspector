import path from 'path'
import { fileURLToPath } from 'url'
import { createServer } from './server-core.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, 'dist')
const port = Number(process.env.PORT) || 4173

createServer({
  distDir,
  port,
  onReady: (p) => console.log(`MCP Inspector running at http://localhost:${p}`),
})
