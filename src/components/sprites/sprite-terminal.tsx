"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSprites } from "@/contexts/sprites-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Play, Loader2, Maximize2, Minimize2, Trash2 } from "lucide-react"
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

export function SpriteTerminal({ spriteName }: SpriteTerminalProps) {
  const { getClient } = useSprites()
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [command, setCommand] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [history, setHistory] = useState<CommandOutput[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)

  const runCommand = useCallback(async () => {
    const client = getClient()
    if (!client || !command.trim()) return

    setIsRunning(true)
    setError(null)

    try {
      // Parse command into parts
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
      // Scroll to bottom
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

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

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
          <span className="font-mono">{spriteName}</span>
          <span className="text-border">│</span>
          <span>Command Executor</span>
        </div>
        <div className="flex items-center gap-1">
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
│  Enter commands below to run on the sprite.         │
│  Note: This is non-interactive (no stdin).          │
│  Use ↑/↓ arrows to navigate command history.        │
└─────────────────────────────────────────────────────┘`}</pre>
        </div>

        {/* Command history */}
        {history.map((entry, i) => (
          <div key={i} className="mb-4">
            {/* Command prompt */}
            <div className="flex items-center gap-2 text-[#00d4aa]">
              <span className="text-[#ff6b00]">$</span>
              <span>{entry.command}</span>
            </div>

            {/* stdout */}
            {entry.stdout && (
              <pre className="text-[#e8e8e8] whitespace-pre-wrap mt-1 ml-4">{entry.stdout}</pre>
            )}

            {/* stderr */}
            {entry.stderr && (
              <pre className="text-[#ff4444] whitespace-pre-wrap mt-1 ml-4">{entry.stderr}</pre>
            )}

            {/* Exit code */}
            <div className={cn(
              "text-xs mt-1 ml-4",
              entry.exitCode === 0 ? "text-[#00d4aa]" : "text-[#ff4444]"
            )}>
              exit code: {entry.exitCode}
            </div>
          </div>
        ))}

        {/* Running indicator */}
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
        <span>Non-interactive mode • WebSocket terminal requires server-side proxy</span>
      </div>
    </div>
  )
}
