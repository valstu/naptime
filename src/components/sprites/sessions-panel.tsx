"use client"

import { useState } from "react"
import { useSprites } from "@/contexts/sprites-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Layers,
  Plus,
  Terminal,
  Clock,
  Loader2,
  Play,
  RefreshCw,
} from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"
import type { Session } from "@/types/sprites"

interface SessionsPanelProps {
  spriteName: string
}

function getSessionStatus(session: Session): "active" | "detached" | "completed" {
  if (session.status) return session.status
  // API uses isActive boolean
  return session.isActive ? "active" : "completed"
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
  if (session.created_at) return session.created_at
  if (session.created) return new Date(session.created * 1000).toISOString()
  return new Date().toISOString()
}

export function SessionsPanel({ spriteName }: SessionsPanelProps) {
  const { sessions, createSession, fetchSessions } = useSprites()
  const [isCreating, setIsCreating] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      await createSession(spriteName)
    } catch (err) {
      console.error("Failed to create session:", err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchSessions(spriteName)
    } catch (err) {
      console.error("Failed to refresh sessions:", err)
    } finally {
      setIsRefreshing(false)
    }
  }

  const activeSessions = sessions.filter(s => {
    const status = getSessionStatus(s)
    return status === "active" || status === "detached"
  })
  const completedSessions = sessions.filter(s => getSessionStatus(s) === "completed")

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Sessions
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Manage detachable command sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            New Session
          </Button>
        </div>
      </div>

      {/* Info box */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <pre className="text-xs text-muted-foreground font-mono">
{`┌─────────────────────────────────────────────────────┐
│  Sessions allow long-running processes that can be  │
│  detached and reattached. Perfect for:              │
│                                                     │
│  • Background builds and test runs                  │
│  • Development servers                              │
│  • Interactive debugging sessions                   │
└─────────────────────────────────────────────────────┘`}
          </pre>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Active Sessions ({activeSessions.length})
          </h3>
          {activeSessions.map((session) => (
            <Card key={session.id} className="hover:border-border/80 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Terminal className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-mono text-sm truncate">
                        {session.command || "shell"}
                      </span>
                      <Badge variant={getSessionStatusVariant(session)}>
                        {getSessionStatus(session)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Started {formatRelativeTime(getSessionCreatedAt(session))}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                      ID: {session.id}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Attach
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Completed Sessions */}
      {completedSessions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Completed ({completedSessions.length})
          </h3>
          {completedSessions.slice(0, 5).map((session) => (
            <Card key={session.id} className="opacity-60">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Terminal className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-sm truncate">
                      {session.command || "shell"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatRelativeTime(getSessionCreatedAt(session))}
                  </div>
                  <Badge variant="stopped">completed</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {sessions.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Layers className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No sessions</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Create a session to run persistent commands
            </p>
          </CardContent>
        </Card>
      )}

      {/* ASCII decoration */}
      <div className="text-center pt-4">
        <pre className="text-[10px] text-muted-foreground/30 font-mono inline-block">
{`
   ┌─────────────────────┐
   │  SESSION MANAGER    │
   ├─────────────────────┤
   │  > attach           │
   │  > detach           │
   │  > list             │
   └─────────────────────┘
`}
        </pre>
      </div>
    </div>
  )
}
