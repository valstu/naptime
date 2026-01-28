"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSprites } from "@/contexts/sprites-context"
import { Button } from "@/components/ui/button"
import { RotateCcw, Maximize2, Minimize2, Unplug } from "lucide-react"
import { cn } from "@/lib/utils"

interface SpriteTerminalProps {
  spriteName: string
  sessionId?: number  // Optional - attach to existing session
  detachable?: boolean  // Create a persistent session
  onSessionCreated?: (sessionId: number) => void  // Callback when new session is created
}

function getWebSocketProxyUrl(
  spriteName: string,
  token: string,
  options: {
    command?: string
    tty?: boolean
    rows?: number
    cols?: number
    detachable?: boolean
    sessionId?: number
  }
): string {
  const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:"
  const host = typeof window !== "undefined" ? window.location.host : "localhost:3000"

  // If attaching to existing session, use different URL format
  if (options.sessionId) {
    const params = new URLSearchParams()
    params.set("token", token)
    return `${protocol}//${host}/ws/exec/${encodeURIComponent(spriteName)}/${options.sessionId}?${params.toString()}`
  }

  // New session
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

  if (options.detachable) {
    params.set("detachable", "true")
  }

  return `${protocol}//${host}/ws/exec/${encodeURIComponent(spriteName)}?${params.toString()}`
}

export function SpriteTerminal({
  spriteName,
  sessionId: initialSessionId,
  detachable = true,  // Default to detachable sessions
  onSessionCreated
}: SpriteTerminalProps) {
  const { token } = useSprites()
  const terminalRef = useRef<HTMLDivElement>(null)
  const terminalInstance = useRef<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const sessionIdRef = useRef<number | undefined>(initialSessionId)
  const isConnectedRef = useRef(false)
  const isMountedRef = useRef(true)

  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [displaySessionId, setDisplaySessionId] = useState<number | undefined>(initialSessionId)

  // Stable connect function - doesn't depend on changing state
  const connect = useCallback(async (attachToSession?: number) => {
    if (!token || !terminalRef.current) {
      setError("Not authenticated or terminal not ready")
      return
    }

    // Prevent double connections
    if (isConnectedRef.current) {
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      // Dynamically import ghostty-web (it uses WASM)
      const { init, Terminal } = await import("ghostty-web")
      await init()

      // Check if component is still mounted after async operations
      if (!isMountedRef.current || !terminalRef.current) {
        return
      }

      // Clean up existing
      if (terminalInstance.current) {
        try {
          terminalInstance.current.dispose()
        } catch {
          // Ignore dispose errors
        }
      }
      if (wsRef.current) {
        wsRef.current.close()
      }

      // Clear the container
      terminalRef.current.innerHTML = ""

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

      const rows = 24
      const cols = 80

      // Use provided session or the one from ref
      const sessionToAttach = attachToSession ?? sessionIdRef.current

      // Get WebSocket URL through our proxy
      const wsUrl = getWebSocketProxyUrl(spriteName, token, {
        command: "/bin/bash",
        tty: true,
        rows,
        cols,
        detachable,
        sessionId: sessionToAttach,
      })

      // Write welcome message
      term.write("\x1b[38;5;208m") // Orange color
      term.write("┌─────────────────────────────────────────────────────┐\r\n")
      term.write(`│  SPRITES TERMINAL - ${spriteName.padEnd(30)}│\r\n`)
      term.write("├─────────────────────────────────────────────────────┤\r\n")
      if (sessionToAttach) {
        term.write(`│  Attaching to session ${String(sessionToAttach).padEnd(28)}│\r\n`)
      } else {
        term.write(`│  Creating ${detachable ? "persistent" : "ephemeral"} session...                   │\r\n`)
      }
      term.write("└─────────────────────────────────────────────────────┘\r\n")
      term.write("\x1b[0m") // Reset color
      term.write("\r\n")

      // Connect WebSocket
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        isConnectedRef.current = true
        setIsConnected(true)
        setIsConnecting(false)
        term.write("\x1b[32m● Connected\x1b[0m\r\n\r\n")
        term.focus()
      }

      ws.onmessage = (event) => {
        // Handle both binary and text data
        if (event.data instanceof ArrayBuffer) {
          const text = new TextDecoder().decode(event.data)
          term.write(text)
        } else if (event.data instanceof Blob) {
          event.data.text().then((text) => {
            term.write(text)
          })
        } else if (typeof event.data === "string") {
          // Try to parse as JSON for control messages
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === "session_info") {
              // Store session ID in ref (doesn't trigger re-render)
              sessionIdRef.current = msg.session_id
              setDisplaySessionId(msg.session_id)
              onSessionCreated?.(msg.session_id)
            } else if (msg.type === "exit") {
              term.write(`\r\n\x1b[33m● Process exited with code ${msg.exit_code || msg.code || 0}\x1b[0m\r\n`)
              isConnectedRef.current = false
              setIsConnected(false)
            } else if (msg.type === "port") {
              // Port notification
              term.write(`\r\n\x1b[36m● Port ${msg.port} available\x1b[0m\r\n`)
            } else if (msg.error) {
              term.write(`\r\n\x1b[31m● Error: ${msg.error}\x1b[0m\r\n`)
            }
          } catch {
            // Not JSON, write directly to terminal (this is actual shell output)
            term.write(event.data)
          }
        }
      }

      ws.onerror = () => {
        setError("WebSocket connection failed")
        setIsConnecting(false)
        term.write("\r\n\x1b[31m● Connection error\x1b[0m\r\n")
      }

      ws.onclose = (e) => {
        isConnectedRef.current = false
        setIsConnected(false)
        setIsConnecting(false)
        if (e.code !== 1000) {
          term.write(`\r\n\x1b[33m● Disconnected (code: ${e.code})\x1b[0m\r\n`)
          if (sessionIdRef.current && detachable) {
            term.write("\x1b[90mSession preserved - click reconnect to resume\x1b[0m\r\n")
          }
        }
      }

      // Handle terminal input - send as binary (Sprites API expects binary stdin)
      term.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          const encoder = new TextEncoder()
          ws.send(encoder.encode(data))
        }
      })

    } catch (err) {
      console.error("[Terminal] Init error:", err)
      setError(err instanceof Error ? err.message : "Failed to initialize terminal")
      setIsConnecting(false)
    }
  }, [token, spriteName, detachable, onSessionCreated])  // Note: sessionId removed from deps

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    isConnectedRef.current = false
    setIsConnected(false)
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    // Reconnect to same session if we have one, otherwise create new
    setTimeout(() => connect(sessionIdRef.current), 100)
  }, [disconnect, connect])

  const newSession = useCallback(() => {
    disconnect()
    sessionIdRef.current = undefined
    setDisplaySessionId(undefined)
    setTimeout(() => connect(), 100)
  }, [disconnect, connect])

  // Connect on mount only (empty deps to prevent reconnect loops)
  useEffect(() => {
    isMountedRef.current = true

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!isConnectedRef.current && isMountedRef.current) {
        connect()
      }
    }, 100)

    return () => {
      isMountedRef.current = false
      clearTimeout(timer)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (terminalInstance.current) {
        try {
          terminalInstance.current.dispose()
        } catch {
          // Ignore dispose errors on unmount
        }
        terminalInstance.current = null
      }
    }
  }, [])  // Empty deps - only run on mount/unmount

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
          {displaySessionId && (
            <>
              <span className="text-border">│</span>
              <span className="font-mono text-muted-foreground/70">#{displaySessionId}</span>
            </>
          )}
          <span className="text-border">│</span>
          <span className="font-mono">{spriteName}</span>
        </div>
        <div className="flex items-center gap-1">
          {displaySessionId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={newSession}
              disabled={isConnecting}
              title="New session"
            >
              <Unplug className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={reconnect}
            disabled={isConnecting}
            title={displaySessionId ? "Reconnect to session" : "Reconnect"}
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
        className="flex-1 overflow-hidden w-full ghostty-terminal"
        style={{ backgroundColor: "#0c0c0c" }}
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
          <span>Interactive shell • {detachable ? "Session persists on disconnect" : "Ephemeral session"}</span>
        ) : displaySessionId ? (
          <span>Session #{displaySessionId} • Click reconnect to resume</span>
        ) : (
          <span>Click reconnect to start a new session</span>
        )}
      </div>
    </div>
  )
}
