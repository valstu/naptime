import { createServer, IncomingMessage } from "http"
import { parse } from "url"
import next from "next"
import { WebSocketServer, WebSocket } from "ws"

const dev = process.env.NODE_ENV !== "production"
const hostname = process.env.HOSTNAME || "localhost"
const port = parseInt(process.env.PORT || "3000", 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

const SPRITES_API_WS = "wss://api.sprites.dev"

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || "", true)
    handle(req, res, parsedUrl)
  })

  // Create WebSocket server attached to the HTTP server
  const wss = new WebSocketServer({ noServer: true })

  // Handle WebSocket upgrade requests
  server.on("upgrade", (request: IncomingMessage, socket, head) => {
    const { pathname, query } = parse(request.url || "", true)

    // Only handle /ws/exec/* paths
    if (pathname?.startsWith("/ws/exec/")) {
      const spriteName = pathname.replace("/ws/exec/", "")
      const token = query.token as string

      if (!spriteName || !token) {
        socket.write("HTTP/1.1 400 Bad Request\r\n\r\n")
        socket.destroy()
        return
      }

      wss.handleUpgrade(request, socket, head, (clientWs) => {
        handleExecProxy(clientWs, spriteName, token, query)
      })
    } else {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n")
      socket.destroy()
    }
  })

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> WebSocket proxy enabled at ws://${hostname}:${port}/ws/exec/[spriteName]`)
  })
})

function handleExecProxy(
  clientWs: WebSocket,
  spriteName: string,
  token: string,
  query: Record<string, string | string[] | undefined>
) {
  // Build the Sprites API WebSocket URL with query params
  const params = new URLSearchParams()

  // Command path
  const command = (query.path as string) || "/bin/bash"
  params.set("path", command)

  // Command args
  const cmds = query.cmd
  if (Array.isArray(cmds)) {
    cmds.forEach((cmd) => params.append("cmd", cmd))
  } else if (cmds) {
    params.append("cmd", cmds)
  } else {
    params.append("cmd", command)
  }

  // Other params
  if (query.stdin) params.set("stdin", query.stdin as string)
  if (query.tty) params.set("tty", query.tty as string)
  if (query.rows) params.set("rows", query.rows as string)
  if (query.cols) params.set("cols", query.cols as string)

  const spritesWsUrl = `${SPRITES_API_WS}/v1/sprites/${encodeURIComponent(spriteName)}/exec?${params.toString()}`

  console.log(`[WS Proxy] Connecting to ${spritesWsUrl.replace(token, "***")}`)

  // Connect to Sprites API with Authorization header
  const spritesWs = new WebSocket(spritesWsUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  let isConnected = false

  spritesWs.on("open", () => {
    isConnected = true
    console.log(`[WS Proxy] Connected to Sprites API for ${spriteName}`)
  })

  spritesWs.on("message", (data, isBinary) => {
    // Forward message from Sprites API to client
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data, { binary: isBinary })
    }
  })

  spritesWs.on("close", (code, reason) => {
    console.log(`[WS Proxy] Sprites connection closed: ${code} ${reason.toString()}`)
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(code, reason.toString())
    }
  })

  spritesWs.on("error", (err) => {
    console.error(`[WS Proxy] Sprites connection error:`, err.message)
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1011, "Upstream error")
    }
  })

  // Forward messages from client to Sprites API
  clientWs.on("message", (data, isBinary) => {
    if (spritesWs.readyState === WebSocket.OPEN) {
      spritesWs.send(data, { binary: isBinary })
    }
  })

  clientWs.on("close", (code, reason) => {
    console.log(`[WS Proxy] Client disconnected: ${code}`)
    if (spritesWs.readyState === WebSocket.OPEN) {
      spritesWs.close()
    }
  })

  clientWs.on("error", (err) => {
    console.error(`[WS Proxy] Client error:`, err.message)
    if (spritesWs.readyState === WebSocket.OPEN) {
      spritesWs.close()
    }
  })
}
