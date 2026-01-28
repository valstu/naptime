"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSprites } from "@/contexts/sprites-context"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Box,
  RefreshCw,
  ChevronRight,
} from "lucide-react"
import type { Sprite, SpriteStatus } from "@/types/sprites"

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

function SpriteListItem({ sprite, isSelected }: {
  sprite: Sprite
  isSelected: boolean
}) {
  return (
    <Link
      href={`/sprites/${sprite.name}/sessions`}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
        "border-l-2 border-transparent",
        "hover:bg-muted/50",
        isSelected && "bg-muted border-l-primary"
      )}
    >
      <Box className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm truncate",
            isSelected ? "text-foreground" : "text-muted-foreground"
          )}>
            {sprite.name}
          </span>
        </div>
      </div>
      <Badge variant={getStatusBadgeVariant(sprite.status)} className="shrink-0">
        {sprite.status}
      </Badge>
      <ChevronRight className={cn(
        "h-4 w-4 shrink-0 transition-transform",
        isSelected ? "text-foreground" : "text-muted-foreground",
        isSelected && "translate-x-0.5"
      )} />
    </Link>
  )
}

interface SidebarProps {
  onCreateClick: () => void
}

export function Sidebar({ onCreateClick }: SidebarProps) {
  const pathname = usePathname()
  const { sprites, isLoading, fetchSprites } = useSprites()

  // Extract current sprite name from pathname
  const currentSpriteName = pathname.startsWith("/sprites/")
    ? decodeURIComponent(pathname.split("/")[2])
    : null

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Sprites
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={fetchSprites}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onCreateClick}
        >
          <Plus className="h-4 w-4" />
          New Sprite
        </Button>
      </div>

      {/* Sprite list */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {sprites.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <Box className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">
                No sprites yet
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Create your first sprite to get started
              </p>
            </div>
          ) : (
            sprites.map(sprite => (
              <SpriteListItem
                key={sprite.name}
                sprite={sprite}
                isSelected={currentSpriteName === sprite.name}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <div className="text-[10px] text-muted-foreground/50 font-mono">
          <pre className="leading-tight">{`
┌─────────────────────┐
│  powered by fly.io  │
│  firecracker vms    │
└─────────────────────┘
          `.trim()}</pre>
        </div>
      </div>
    </div>
  )
}
