import { startHttpServer } from './http'
import { dataDir } from './store'

const args = process.argv.slice(2)
const portArg = args.find((a) => a.startsWith('--port='))
const port = portArg ? parseInt(portArg.split('=')[1]) || 45677 : 45677

console.error(`[apichat] Data dir: ${dataDir}`)

// Single HTTP server serves both frontend API and MCP Streamable HTTP
startHttpServer(port)
