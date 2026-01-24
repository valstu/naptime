"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSprites } from "@/contexts/sprites-context"
import { Button } from "@/components/ui/button"
import { RotateCcw, Maximize2, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SpriteTerminalProps {
  spriteName: string
}

function getWebSocketProxyUrl(spriteName: string, token: string, options: {
  command?: string
  tty?: boolean
  rows?: number
  cols?: number
}): string {
  const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:"
  const host = typeof window !== "undefined" ? window.location.host : "localhost:3000"

  const params = new URLSearchParams()
  params.set("token", token)

  const command = options.command || "/bin/bash"
  params.set("path", command)
  params.append("cmd", command)
  params.set("stdin", "true")

  if (options.tty !== false) {
    params.set("tty", "true")
    if (options.rows) params.set("rows", String(options.rows))
    if (options.cols) params.set("cols", String(options.cols))
  }

  return `${protocol}//${host}/ws/exec/${encodeURIComponent(spriteName)}?${params.toString()}`
}

export function SpriteTerminal({ spriteName }: SpriteTerminalProps) {
  const { token } = useSprites()
  const terminalRef = useRef<HTMLDivElement>(null)
  const terminalInstance = useRef<any>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    if (!token || !terminalRef.current) {
      setError("Not authenticated or terminal not ready")
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      // Dynamically import ghostty-web (it uses WASM)
      const { init, Terminal } = await import("ghostty-web")
      await init()

      // Clean up existing
      if (terminalInstance.current) {
        terminalInstance.current.dispose()
      }
      if (wsRef.current) {
        wsRef.current.close()
      }

      // Clear the container
      if (terminalRef.current) {
        terminalRef.current.innerHTML = ""
      }

      // Create terminal with our theme
      const term = new Terminal({
        fontSize: 14,
        fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
        theme: {
          background: "#0c0c0c",
          foreground: "#e8e8e8",
          cursor: "#ff6b00",
          cursorAccent: "#0c0c0c",
          black: "#1a1a1a",
          red: "#ff4444",
          green: "#00d4aa",
          yellow: "#ffb800",
          blue: "#4488ff",
          magenta: "#ff6b00",
          cyan: "#00d4aa",
          white: "#e8e8e8",
          brightBlack: "#666666",
          brightRed: "#ff6666",
          brightGreen: "#00ffbb",
          brightYellow: "#ffcc00",
          brightBlue: "#66aaff",
          brightMagenta: "#ff8533",
          brightCyan: "#00ffcc",
          brightWhite: "#ffffff",
        },
      })

      term.open(terminalRef.current)
      terminalInstance.current = term

      // Use fixed terminal size - ghostty-web doesn't report size until later
      const rows = 24
      const cols = 80

      // Get WebSocket URL through our proxy
      const wsUrl = getWebSocketProxyUrl(spriteName, token, {
        command: "/bin/bash",
        tty: true,
        rows,
        cols,
      })

      console.log("[Terminal] Using size:", cols, "x", rows)

      // Write welcome message
      term.write("\x1b[38;5;208m") // Orange color
      term.write("┌─────────────────────────────────────────────────────┐\r\n")
      term.write(`│  SPRITES TERMINAL - ${spriteName.padEnd(30)}│\r\n`)
      term.write("├─────────────────────────────────────────────────────┤\r\n")
      term.write("│  Connecting via WebSocket proxy...                  │\r\n")
      term.write("└─────────────────────────────────────────────────────┘\r\n")
      term.write("\x1b[0m") // Reset color
      term.write("\r\n")

      // Connect WebSocket - use text mode like ghostty-web demo
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log("[Terminal] WebSocket connected")
        setIsConnected(true)
        setIsConnecting(false)
        term.write("\x1b[32m● Connected\x1b[0m\r\n\r\n")
        term.focus()
      }

      ws.onmessage = (event) => {
        console.log("[Terminal] Received:", typeof event.data, event.data instanceof ArrayBuffer ? `ArrayBuffer(${event.data.byteLength})` : JSON.stringify(event.data).slice(0, 100))

        // Handle both binary and text data
        if (event.data instanceof ArrayBuffer) {
          const text = new TextDecoder().decode(event.data)
          console.log("[Terminal] Decoded ArrayBuffer:", JSON.stringify(text).slice(0, 100))
          term.write(text)
        } else if (event.data instanceof Blob) {
          event.data.text().then((text) => {
            console.log("[Terminal] Decoded Blob:", JSON.stringify(text).slice(0, 100))
            term.write(text)
          })
        } else if (typeof event.data === "string") {
          // Try to parse as JSON for control messages
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === "session_info") {
              // Session info - don't display, just log it
              console.log("[Terminal] Session info:", msg)
            } else if (msg.type === "exit") {
              term.write(`\r\n\x1b[33m● Process exited with code ${msg.exit_code || msg.code || 0}\x1b[0m\r\n`)
              setIsConnected(false)
            } else if (msg.type === "port") {
              // Port notification - don't display
              console.log("[Terminal] Port notification:", msg)
            } else if (msg.error) {
              term.write(`\r\n\x1b[31m● Error: ${msg.error}\x1b[0m\r\n`)
            } else {
              // Unknown JSON message type - log but don't display
              console.log("[Terminal] Unknown JSON message:", msg)
            }
          } catch {
            // Not JSON, write directly to terminal (this is actual shell output)
            term.write(event.data)
          }
        }
      }

      ws.onerror = (e) => {
        console.error("[Terminal] WebSocket error:", e)
        setError("WebSocket connection failed")
        setIsConnecting(false)
        term.write("\r\n\x1b[31m● Connection error\x1b[0m\r\n")
      }

      ws.onclose = (e) => {
        console.log("[Terminal] WebSocket closed:", e.code, e.reason)
        setIsConnected(false)
        setIsConnecting(false)
        if (e.code !== 1000) {
          term.write(`\r\n\x1b[33m● Disconnected (code: ${e.code})\x1b[0m\r\n`)
        }
      }

      // Handle terminal input - ghostty-web uses onData like xterm
      // Send as binary (Uint8Array) because Sprites API expects binary stdin
      term.onData((data: string) => {
        console.log("[Terminal] Input:", JSON.stringify(data))
        if (ws.readyState === WebSocket.OPEN) {
          // Convert string to binary - Sprites API expects binary frames for stdin
          const encoder = new TextEncoder()
          const binaryData = encoder.encode(data)
          ws.send(binaryData)
        }
      })

    } catch (err) {
      console.error("[Terminal] Init error:", err)
      setError(err instanceof Error ? err.message : "Failed to initialize terminal")
      setIsConnecting(false)
    }
  }, [token, spriteName])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    setTimeout(connect, 100)
  }, [disconnect, connect])

  // Connect on mount
  useEffect(() => {
    connect()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (terminalInstance.current) {
        terminalInstance.current.dispose()
      }
    }
  }, [connect])

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Click to focus terminal
  const handleContainerClick = () => {
    terminalInstance.current?.focus()
  }

  return (
    <div className={cn(
      "flex flex-col bg-background",
      isFullscreen ? "fixed inset-0 z-50" : "h-full"
    )}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={cn(
            "inline-block w-2 h-2 rounded-full",
            isConnected ? "bg-active status-pulse" : isConnecting ? "bg-warning" : "bg-muted-foreground"
          )} />
          <span>
            {isConnected ? "Connected" : isConnecting ? "Connecting..." : "Disconnected"}
          </span>
          <span className="text-border">│</span>
          <span className="font-mono">{spriteName}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={reconnect}
            disabled={isConnecting}
            title="Reconnect"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Terminal container - click to focus */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-hidden"
        style={{ backgroundColor: "#0c0c0c", padding: "8px", minHeight: "300px" }}
        onClick={handleContainerClick}
      />

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-error/10 border-t border-error/30 text-error text-xs">
          {error}
        </div>
      )}

      {/* Status bar */}
      <div className="px-4 py-1 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        {isConnected ? (
          <span>Interactive shell • Click terminal to focus • Type commands directly</span>
        ) : (
          <span>Click reconnect to start a new session</span>
        )}
      </div>
    </div>
  )
}
