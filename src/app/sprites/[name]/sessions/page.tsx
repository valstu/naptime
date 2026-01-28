"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { useSprites } from "@/contexts/sprites-context"
import { SpriteTerminal } from "@/components/sprites/sprite-terminal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Terminal,
  Clock,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  X,
} from "lucide-react"
import { formatRelativeTime, cn } from "@/lib/utils"
import type { Session } from "@/types/sprites"

function getSessionStatus(session: Session): "active" | "detached" | "completed" {
  if (session.status) return session.status
  // API returns is_active (snake_case)
  const isActive = session.isActive ?? (session as any).is_active
  return isActive ? "active" : "detached"
}

function getSessionStatusVariant(session: Session) {
  const status = getSessionStatus(session)
  switch (status) {
    case "active":
      return "running"
    case "detached":
      return "sleeping"
    case "completed":
      return "stopped"
    default:
      return "outline"
  }
}

function getSessionCreatedAt(session: Session): string {
  try {
    if (session.created_at) return session.created_at
    if (session.created) {
      // Handle both ISO string and Unix timestamp
      if (typeof session.created === 'string') return session.created
      if (typeof session.created === 'number' && session.created > 0) {
        return new Date(session.created * 1000).toISOString()
      }
    }
    return new Date().toISOString()
  } catch {
    return new Date().toISOString()
  }
}

export default function SessionsPage() {
  const params = useParams()
  const spriteName = params.name as string
  const { sessions, fetchSessions, isAuthenticated, token } = useSprites()

  const [activeSessionId, setActiveSessionId] = useState<number | string | undefined>()
  const [terminalKey, setTerminalKey] = useState(0)
  const [sessionsExpanded, setSessionsExpanded] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (isAuthenticated && spriteName) {
      fetchSessions(spriteName)
    }
  }, [isAuthenticated, spriteName, fetchSessions])

  const handleAttach = useCallback((sessionId: number | string) => {
    setActiveSessionId(sessionId)
    setTerminalKey(k => k + 1)
  }, [])

  const handleSessionCreated = useCallback((sessionId: number | string) => {
    setActiveSessionId(sessionId)
    fetchSessions(spriteName)
  }, [fetchSessions, spriteName])

  const handleNewTerminal = useCallback(() => {
    setActiveSessionId(undefined)
    setTerminalKey(k => k + 1)
  }, [])

  const handleRefreshSessions = async () => {
    setIsRefreshing(true)
    try {
      await fetchSessions(spriteName)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDeleteSession = async (sessionId: number | string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`/api/sprites/${spriteName}/sessions/${sessionId}`, {
        method: "DELETE",
      })
      await fetchSessions(spriteName)
    } catch (err) {
      console.error("Failed to delete session:", err)
    }
  }

  // Show all sessions - API will reject if not attachable
  const attachableSessions = sessions

  return (
    <div className="flex flex-col h-full">
      {/* Terminal - takes most space */}
      <div className="flex-1 min-h-0">
        <SpriteTerminal
          key={terminalKey}
          spriteName={spriteName}
          sessionId={activeSessionId}
          detachable={true}
          onSessionCreated={handleSessionCreated}
        />
      </div>

      {/* Sessions panel - collapsible */}
      <div className="border-t border-border bg-card shrink-0">
        <button
          onClick={() => setSessionsExpanded(!sessionsExpanded)}
          className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {sessionsExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Sessions
            {attachableSessions.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {attachableSessions.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={handleRefreshSessions}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleNewTerminal}
            >
              New Terminal
            </Button>
          </div>
        </button>

        {sessionsExpanded && (
          <div className="px-4 pb-4 max-h-48 overflow-y-auto">
            {attachableSessions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No active sessions.
              </p>
            ) : (
              <div className="space-y-1">
                {attachableSessions.map((session) => {
                  const status = getSessionStatus(session)
                  const isCurrent = activeSessionId === session.id

                  return (
                    <div
                      key={session.id}
                      onClick={() => handleAttach(session.id)}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded border transition-colors group cursor-pointer",
                        isCurrent
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/30",
                      )}
                    >
                      <Terminal className={cn(
                        "h-4 w-4 shrink-0",
                        isCurrent ? "text-primary" : "text-muted-foreground"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs truncate">
                            {session.command || "shell"}
                          </span>
                          <Badge variant={getSessionStatusVariant(session)} className="text-[10px]">
                            {status}
                          </Badge>
                          {isCurrent && (
                            <Badge variant="outline" className="text-[10px]">
                              current
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {formatRelativeTime(getSessionCreatedAt(session))}
                          <span className="font-mono">#{session.id}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-error/20 hover:text-error"
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        title="Delete session"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
