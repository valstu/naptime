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

    // Only handle /ws/exec/* paths - let Next.js handle everything else (including HMR)
    // Format: /ws/exec/{spriteName} or /ws/exec/{spriteName}/{sessionId}
    if (pathname?.startsWith("/ws/exec/")) {
      const pathParts = pathname.replace("/ws/exec/", "").split("/")
      const spriteName = pathParts[0]
      const sessionId = pathParts[1] // Optional - for attaching to existing session
      const token = query.token as string

      if (!spriteName || !token) {
        socket.write("HTTP/1.1 400 Bad Request\r\n\r\n")
        socket.destroy()
        return
      }

      wss.handleUpgrade(request, socket, head, (clientWs) => {
        handleExecProxy(clientWs, spriteName, token, query, sessionId)
      })
    }
    // Don't handle other WebSocket upgrades - let Next.js handle them (HMR, etc.)
  })

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})

function handleExecProxy(
  clientWs: WebSocket,
  spriteName: string,
  token: string,
  query: Record<string, string | string[] | undefined>,
  sessionId?: string
) {
  let spritesWsUrl: string

  if (sessionId) {
    // Attach to existing session
    spritesWsUrl = `${SPRITES_API_WS}/v1/sprites/${encodeURIComponent(spriteName)}/exec/${sessionId}`
    console.log(`[WS] Attaching to session ${sessionId} on ${spriteName}`)
  } else {
    // New session - build URL with query params
    const params = new URLSearchParams()

    const command = (query.path as string) || "/bin/bash"
    params.set("path", command)

    const cmds = query.cmd
    if (Array.isArray(cmds)) {
      cmds.forEach((cmd) => params.append("cmd", cmd))
    } else if (cmds) {
      params.append("cmd", cmds)
    } else {
      params.append("cmd", command)
    }

    if (query.stdin) params.set("stdin", query.stdin as string)
    if (query.tty) params.set("tty", query.tty as string)
    if (query.rows) params.set("rows", query.rows as string)
    if (query.cols) params.set("cols", query.cols as string)
    if (query.detachable) params.set("detachable", query.detachable as string)

    // Set TERM for color support (zsh handles this cleanly)
    params.append("env", "TERM=xterm-256color")
    params.append("env", "COLORTERM=truecolor")

    spritesWsUrl = `${SPRITES_API_WS}/v1/sprites/${encodeURIComponent(spriteName)}/exec?${params.toString()}`
    console.log(`[WS] New session on ${spriteName}`)
  }

  // Connect to Sprites API with Authorization header
  const spritesWs = new WebSocket(spritesWsUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const messageBuffer: { data: any; isBinary: boolean }[] = []

  spritesWs.on("open", () => {
    // Send any buffered messages
    if (messageBuffer.length > 0) {
      messageBuffer.forEach(({ data, isBinary }) => {
        spritesWs.send(data, { binary: isBinary })
      })
      messageBuffer.length = 0
    }
  })

  spritesWs.on("message", (data, isBinary) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data, { binary: isBinary })
    }
  })

  spritesWs.on("close", (code, reason) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(code, reason.toString())
    }
  })

  spritesWs.on("error", (err) => {
    console.error(`[WS] Error:`, err.message)
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1011, "Upstream error")
    }
  })

  spritesWs.on("unexpected-response", (req, res) => {
    console.error(`[WS] Sprites API error: ${res.statusCode}`)
    let body = ""
    res.on("data", (chunk) => { body += chunk })
    res.on("end", () => {
      if (body) console.error(`[WS] Response: ${body}`)
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(1011, `Upstream error: ${res.statusCode}`)
      }
    })
  })

  clientWs.on("message", (data, isBinary) => {
    if (spritesWs.readyState === WebSocket.OPEN) {
      spritesWs.send(data, { binary: isBinary })
    } else if (spritesWs.readyState === WebSocket.CONNECTING) {
      messageBuffer.push({ data, isBinary })
    }
  })

  clientWs.on("close", () => {
    if (spritesWs.readyState === WebSocket.OPEN) {
      spritesWs.close()
    }
  })

  clientWs.on("error", (err) => {
    console.error(`[WS] Client error:`, err.message)
    if (spritesWs.readyState === WebSocket.OPEN) {
      spritesWs.close()
    }
  })
}
