"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useSprites } from "@/contexts/sprites-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, Loader2, Trash2, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface TerminalLine {
  id: string
  type: "command" | "stdout" | "stderr" | "error" | "system"
  content: string
  timestamp: Date
}

interface SpriteTerminalProps {
  spriteName: string
}

export function SpriteTerminal({ spriteName }: SpriteTerminalProps) {
  const { getClient, refreshSprite } = useSprites()
  const [command, setCommand] = useState("")
  const [history, setHistory] = useState<TerminalLine[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addLine = useCallback((type: TerminalLine["type"], content: string) => {
    setHistory(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
    }])
  }, [])

  // Scroll to bottom when history changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [history])

  // Welcome message
  useEffect(() => {
    addLine("system", `┌─────────────────────────────────────────────────────┐`)
    addLine("system", `│  SPRITES TERMINAL - ${spriteName.padEnd(30)}│`)
    addLine("system", `├─────────────────────────────────────────────────────┤`)
    addLine("system", `│  Type commands below to execute in your sprite      │`)
    addLine("system", `│  The sprite will wake up automatically if sleeping  │`)
    addLine("system", `└─────────────────────────────────────────────────────┘`)
    addLine("system", "")
  }, [spriteName, addLine])

  const executeCommand = async () => {
    if (!command.trim() || isExecuting) return

    const client = getClient()
    if (!client) {
      addLine("error", "Error: Not authenticated")
      return
    }

    const cmd = command.trim()
    setCommand("")
    setCommandHistory(prev => [...prev, cmd])
    setHistoryIndex(-1)

    addLine("command", `$ ${cmd}`)
    setIsExecuting(true)

    try {
      const result = await client.exec(spriteName, { command: cmd })

      if (result.stdout) {
        result.stdout.split("\n").forEach(line => {
          if (line) addLine("stdout", line)
        })
      }

      if (result.stderr) {
        result.stderr.split("\n").forEach(line => {
          if (line) addLine("stderr", line)
        })
      }

      if (result.exit_code !== 0) {
        addLine("system", `Process exited with code ${result.exit_code}`)
      }

      // Refresh sprite status after command
      refreshSprite(spriteName).catch(() => {})
    } catch (err) {
      addLine("error", `Error: ${err instanceof Error ? err.message : "Command failed"}`)
    } finally {
      setIsExecuting(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      executeCommand()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
        setHistoryIndex(newIndex)
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || "")
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || "")
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setCommand("")
      }
    }
  }

  const clearHistory = () => {
    setHistory([])
  }

  const copyOutput = async () => {
    const text = history
      .map(line => {
        if (line.type === "command") return line.content
        if (line.type === "system") return `# ${line.content}`
        return line.content
      })
      .join("\n")

    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getLineColor = (type: TerminalLine["type"]) => {
    switch (type) {
      case "command":
        return "text-primary"
      case "stdout":
        return "text-foreground"
      case "stderr":
        return "text-warning"
      case "error":
        return "text-error"
      case "system":
        return "text-muted-foreground"
      default:
        return "text-foreground"
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 bg-active rounded-full" />
          <span>Terminal</span>
          <span className="text-border">│</span>
          <span className="tabular-nums">{history.length} lines</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={copyOutput}
            disabled={history.length === 0}
          >
            {copied ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={clearHistory}
            disabled={history.length === 0}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Terminal output */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="font-mono text-sm space-y-0.5">
          {history.map(line => (
            <div key={line.id} className={cn("whitespace-pre-wrap break-all", getLineColor(line.type))}>
              {line.content}
            </div>
          ))}
          {isExecuting && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Executing...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4 bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-primary font-mono text-sm shrink-0">$</span>
          <Input
            ref={inputRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            className="flex-1 bg-background border-input-border font-mono text-sm"
            disabled={isExecuting}
            autoFocus
          />
          <Button
            onClick={executeCommand}
            disabled={isExecuting || !command.trim()}
            size="sm"
          >
            {isExecuting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Press Enter to execute • Use ↑↓ for command history
        </div>
      </div>
    </div>
  )
}
