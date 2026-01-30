"use client"

import { useEffect } from "react"
import { useParams, usePathname } from "next/navigation"
import Link from "next/link"
import { useSprites } from "@/contexts/sprites-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Terminal,
  Camera,
  Shield,
  Globe,
  RefreshCw,
  Trash2,
  Info,
  ArrowLeft,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { formatBytes, formatRelativeTime, cn } from "@/lib/utils"
import type { SpriteStatus } from "@/types/sprites"
import { useRouter } from "next/navigation"

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

const tabs = [
  { id: "sessions", label: "Terminal", icon: Terminal, href: "sessions" },
  { id: "checkpoints", label: "Checkpoints", icon: Camera, href: "checkpoints" },
  { id: "network", label: "Network", icon: Shield, href: "network" },
  { id: "url", label: "URL", icon: Globe, href: "url" },
]

export default function SpriteLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const spriteName = params.name as string

  const { sprites, refreshSprite, deleteSprite, isAuthenticated, fetchSprites } = useSprites()
  const sprite = sprites.find(s => s.name === spriteName)

  useEffect(() => {
    if (isAuthenticated && sprites.length === 0) {
      fetchSprites()
    }
  }, [isAuthenticated, sprites.length, fetchSprites])

  const handleDelete = async () => {
    await deleteSprite(spriteName)
    router.push("/sprites")
  }

  const handleRefresh = async () => {
    await refreshSprite(spriteName)
  }

  // Get current tab from pathname
  const currentTab = pathname.split("/").pop() || "sessions"

  if (!sprite) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Loading sprite...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/sprites"
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-lg font-medium">{sprite.name}</h1>
              <Badge variant={getStatusBadgeVariant(sprite.status)}>
                {sprite.status === "running" && (
                  <span className="inline-block w-1.5 h-1.5 bg-current rounded-full mr-1.5 status-pulse" />
                )}
                {sprite.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground ml-7">
              {sprite.url && (
                <a
                  href={sprite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <Globe className="h-3 w-3" />
                  {sprite.url.replace("https://", "")}
                </a>
              )}
              <span className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                Created {formatRelativeTime(sprite.created_at)}
              </span>
              {sprite.storage_used_bytes && (
                <span>Storage: {formatBytes(sprite.storage_used_bytes)}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-error hover:text-error">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Sprite</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{sprite.name}&quot;? This action
                    cannot be undone. All data, checkpoints, and configurations will be
                    permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-error text-white hover:bg-error/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border px-4">
        <nav className="flex gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = currentTab === tab.id
            return (
              <Link
                key={tab.id}
                href={`/sprites/${spriteName}/${tab.href}`}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
