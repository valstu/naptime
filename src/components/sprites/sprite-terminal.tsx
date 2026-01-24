"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSprites } from "@/contexts/sprites-context"
import { Button } from "@/components/ui/button"
import { RotateCcw, Maximize2, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SpriteTerminalProps {
  spriteName: string
}

export function SpriteTerminal({ spriteName }: SpriteTerminalProps) {
  const { getClient } = useSprites()
  const terminalRef = useRef<HTMLDivElement>(null)
  const terminalInstance = useRef<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    const client = getClient()
    if (!client || !terminalRef.current) {
      setError("Not authenticated or terminal not ready")
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      // Dynamically import ghostty-web (it uses WASM)
      const { init, Terminal } = await import("ghostty-web")
      await init()

      // Clean up existing terminal
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

      // Get WebSocket URL with terminal size
      const wsUrl = client.getExecWebSocketUrl(spriteName, {
        command: "/bin/bash",
        tty: true,
        rows: term.rows || 24,
        cols: term.cols || 80,
      })

      // Write welcome message
      term.write("\x1b[38;5;208m") // Orange color
      term.write("┌─────────────────────────────────────────────────────┐\r\n")
      term.write(`│  SPRITES TERMINAL - ${spriteName.padEnd(30)}│\r\n`)
      term.write("├─────────────────────────────────────────────────────┤\r\n")
      term.write("│  Connecting to sprite...                            │\r\n")
      term.write("└─────────────────────────────────────────────────────┘\r\n")
      term.write("\x1b[0m") // Reset color
      term.write("\r\n")

      // Connect WebSocket
      const ws = new WebSocket(wsUrl)
      ws.binaryType = "arraybuffer"
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        setIsConnecting(false)
        term.write("\x1b[32m● Connected\x1b[0m\r\n\r\n")
        term.focus()
      }

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          // Binary data - decode and write to terminal
          const text = new TextDecoder().decode(event.data)
          term.write(text)
        } else if (typeof event.data === "string") {
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === "stdout" || msg.type === "stderr" || msg.output) {
              term.write(msg.data || msg.output)
            } else if (msg.type === "exit") {
              term.write(`\r\n\x1b[33m● Process exited with code ${msg.exit_code || msg.code}\x1b[0m\r\n`)
              setIsConnected(false)
            } else if (msg.error) {
              term.write(`\r\n\x1b[31m● Error: ${msg.error}\x1b[0m\r\n`)
            }
          } catch {
            // If not JSON, write raw data
            term.write(event.data)
          }
        }
      }

      ws.onerror = (e) => {
        console.error("WebSocket error:", e)
        setError("WebSocket connection failed - check console for details")
        setIsConnecting(false)
        term.write("\r\n\x1b[31m● Connection error\x1b[0m\r\n")
      }

      ws.onclose = (e) => {
        setIsConnected(false)
        setIsConnecting(false)
        term.write(`\r\n\x1b[33m● Disconnected (code: ${e.code})\x1b[0m\r\n`)
      }

      // Handle terminal input - send raw data
      term.onData((data: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data)
        }
      })

      // Handle terminal resize
      const resizeObserver = new ResizeObserver(() => {
        if (term.cols && term.rows && ws.readyState === WebSocket.OPEN) {
          // Try to send resize - some APIs expect JSON, some expect special format
          try {
            ws.send(JSON.stringify({
              type: "resize",
              cols: term.cols,
              rows: term.rows,
            }))
          } catch {
            // Ignore resize errors
          }
        }
      })

      if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current)
      }

    } catch (err) {
      console.error("Terminal init error:", err)
      setError(err instanceof Error ? err.message : "Failed to initialize terminal")
      setIsConnecting(false)
    }
  }, [getClient, spriteName])

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

  // Handle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
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

      {/* Terminal container */}
      <div
        ref={terminalRef}
        className="flex-1 p-2 overflow-hidden"
        style={{ backgroundColor: "#0c0c0c" }}
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
          <span>Interactive shell • Type commands directly</span>
        ) : (
          <span>Click reconnect to start a new session</span>
        )}
      </div>
    </div>
  )
}
