"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useSprites } from "@/contexts/sprites-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Box, Plus, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SpriteStatus } from "@/types/sprites"

function getStatusBadgeVariant(status: SpriteStatus) {
  switch (status) {
    case "running":
      return "running"
    case "sleeping":
      return "sleeping"
    case "starting":
    case "stopping":
      return "warning"
    case "stopped":
    default:
      return "stopped"
  }
}

export default function SpritesPage() {
  const { sprites, isLoading, isAuthenticated, fetchSprites } = useSprites()

  useEffect(() => {
    if (isAuthenticated) {
      fetchSprites()
    }
  }, [isAuthenticated, fetchSprites])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium">Sprites</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSprites}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {sprites.length === 0 ? (
        <div className="text-center py-12">
          <Box className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-sm font-medium mb-2">No sprites yet</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Create your first sprite to get started
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sprites.map(sprite => (
            <Link
              key={sprite.name}
              href={`/sprites/${sprite.name}/sessions`}
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg border border-border",
                "bg-card hover:bg-muted/50 transition-colors"
              )}
            >
              <Box className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{sprite.name}</div>
                {sprite.url && (
                  <div className="text-xs text-muted-foreground truncate">
                    {sprite.url.replace("https://", "")}
                  </div>
                )}
              </div>
              <Badge variant={getStatusBadgeVariant(sprite.status)}>
                {sprite.status === "running" && (
                  <span className="inline-block w-1.5 h-1.5 bg-current rounded-full mr-1.5 status-pulse" />
                )}
                {sprite.status}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
