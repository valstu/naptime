"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSprites } from "@/contexts/sprites-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RotateCcw, Maximize2, Minimize2, Play, Loader2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SpriteTerminalProps {
  spriteName: string
}

interface CommandOutput {
  command: string
  stdout: string
  stderr: string
  exitCode: number
  timestamp: Date
}

// Check if we're running with WebSocket proxy support (custom server)
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
  const { getClient, token } = useSprites()
  const terminalRef = useRef<HTMLDivElement>(null)
  const terminalInstance = useRef<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Terminal state
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useWebSocket, setUseWebSocket] = useState(true)

  // Command executor fallback state
  const [command, setCommand] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [history, setHistory] = useState<CommandOutput[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const connectWebSocket = useCallback(async () => {
    if (!token || !terminalRef.current) {
      setError("Not authenticated or terminal not ready")
      setUseWebSocket(false)
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

      // Get WebSocket URL through our proxy
      const wsUrl = getWebSocketProxyUrl(spriteName, token, {
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
      term.write("│  Connecting via WebSocket proxy...                  │\r\n")
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
        setIsConnecting(false)
        term.write("\r\n\x1b[31m● WebSocket connection failed\x1b[0m\r\n")
        term.write("\x1b[33m● Falling back to command executor mode\x1b[0m\r\n")
        setUseWebSocket(false)
        setError("WebSocket proxy not available - using command executor")
      }

      ws.onclose = (e) => {
        setIsConnected(false)
        setIsConnecting(false)
        if (e.code !== 1000) {
          term.write(`\r\n\x1b[33m● Disconnected (code: ${e.code})\x1b[0m\r\n`)
        }
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
      setUseWebSocket(false)
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
    setUseWebSocket(true)
    setTimeout(connectWebSocket, 100)
  }, [disconnect, connectWebSocket])

  // Command executor functions
  const runCommand = useCallback(async () => {
    const client = getClient()
    if (!client || !command.trim()) return

    setIsRunning(true)
    setError(null)

    try {
      const parts = command.trim().split(/\s+/)
      const cmd = parts[0]
      const args = parts.slice(1)

      const result = await client.exec(spriteName, {
        command: cmd,
        args: args.length > 0 ? args : undefined,
      })

      setHistory(prev => [...prev, {
        command: command.trim(),
        stdout: result.stdout || "",
        stderr: result.stderr || "",
        exitCode: result.exit_code,
        timestamp: new Date(),
      }])

      setCommand("")
      setHistoryIndex(-1)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Command failed"
      setHistory(prev => [...prev, {
        command: command.trim(),
        stdout: "",
        stderr: errorMessage,
        exitCode: 1,
        timestamp: new Date(),
      }])
      setError(errorMessage)
    } finally {
      setIsRunning(false)
      setTimeout(() => {
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight
        }
      }, 10)
    }
  }, [getClient, spriteName, command])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      runCommand()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const commandHistory = history.map(h => h.command)
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setCommand(commandHistory[commandHistory.length - 1 - newIndex])
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        const commandHistory = history.map(h => h.command)
        setCommand(commandHistory[commandHistory.length - 1 - newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setCommand("")
      }
    }
  }

  const clearHistory = () => {
    setHistory([])
    setError(null)
  }

  // Try WebSocket connection on mount
  useEffect(() => {
    if (useWebSocket) {
      connectWebSocket()
    } else {
      inputRef.current?.focus()
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (terminalInstance.current) {
        terminalInstance.current.dispose()
      }
    }
  }, [connectWebSocket, useWebSocket])

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Render WebSocket terminal
  if (useWebSocket) {
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

  // Render command executor fallback
  return (
    <div className={cn(
      "flex flex-col bg-background",
      isFullscreen ? "fixed inset-0 z-50" : "h-full"
    )}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">{spriteName}</span>
          <span className="text-border">│</span>
          <span>Command Executor</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={reconnect}
            title="Try WebSocket again"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={clearHistory}
            title="Clear history"
          >
            <Trash2 className="h-3 w-3" />
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

      {/* Output area */}
      <div
        ref={terminalRef}
        className="flex-1 p-4 overflow-auto font-mono text-sm"
        style={{ backgroundColor: "#0c0c0c" }}
      >
        {/* Welcome message */}
        <div className="text-[#ff6b00] mb-4">
          <pre className="leading-tight text-xs">{`┌─────────────────────────────────────────────────────┐
│  SPRITES COMMAND EXECUTOR                           │
├─────────────────────────────────────────────────────┤
│  WebSocket proxy not available (Vercel/serverless)  │
│  Using HTTP exec API instead (non-interactive)      │
│  Deploy on Fly.io for full terminal support         │
└─────────────────────────────────────────────────────┘`}</pre>
        </div>

        {/* Command history */}
        {history.map((entry, i) => (
          <div key={i} className="mb-4">
            <div className="flex items-center gap-2 text-[#00d4aa]">
              <span className="text-[#ff6b00]">$</span>
              <span>{entry.command}</span>
            </div>
            {entry.stdout && (
              <pre className="text-[#e8e8e8] whitespace-pre-wrap mt-1 ml-4">{entry.stdout}</pre>
            )}
            {entry.stderr && (
              <pre className="text-[#ff4444] whitespace-pre-wrap mt-1 ml-4">{entry.stderr}</pre>
            )}
            <div className={cn(
              "text-xs mt-1 ml-4",
              entry.exitCode === 0 ? "text-[#00d4aa]" : "text-[#ff4444]"
            )}>
              exit code: {entry.exitCode}
            </div>
          </div>
        ))}

        {isRunning && (
          <div className="flex items-center gap-2 text-[#ffb800]">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Running...</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-error/10 border-t border-error/30 text-error text-xs">
          {error}
        </div>
      )}

      {/* Command input */}
      <div className="p-2 border-t border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-[#ff6b00] font-mono text-sm">$</span>
          <Input
            ref={inputRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command (e.g., ls -la, cat /etc/os-release)"
            className="flex-1 font-mono text-sm bg-background border-border"
            disabled={isRunning}
          />
          <Button
            size="sm"
            onClick={runCommand}
            disabled={isRunning || !command.trim()}
            className="gap-1"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run
          </Button>
        </div>
      </div>

      {/* Status bar */}
      <div className="px-4 py-1 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <span>Non-interactive mode • Deploy on Fly.io for interactive terminal</span>
      </div>
    </div>
  )
}
