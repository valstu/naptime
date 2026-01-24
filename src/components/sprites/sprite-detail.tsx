"use client"

import { useEffect } from "react"
import { useSprites } from "@/contexts/sprites-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SpriteTerminal } from "./sprite-terminal"
import { CheckpointsPanel } from "./checkpoints-panel"
import { NetworkPolicyPanel } from "./network-policy-panel"
import { UrlSettingsPanel } from "./url-settings-panel"
import { SessionsPanel } from "./sessions-panel"
import {
  Terminal,
  Camera,
  Shield,
  Globe,
  Layers,
  ExternalLink,
  Trash2,
  RefreshCw,
  Info,
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
import { formatBytes, formatRelativeTime } from "@/lib/utils"
import type { SpriteStatus } from "@/types/sprites"

function getStatusBadgeVariant(status: SpriteStatus) {
  switch (status) {
    case "running":
      return "running"
    case "sleeping":
      return "sleeping"
    case "starting":
      return "warning"
    case "stopping":
      return "warning"
    case "stopped":
    default:
      return "stopped"
  }
}

export function SpriteDetail() {
  const {
    selectedSprite,
    deleteSprite,
    refreshSprite,
    fetchCheckpoints,
    fetchNetworkPolicy,
    fetchUrlSettings,
    fetchSessions,
  } = useSprites()

  useEffect(() => {
    if (selectedSprite) {
      fetchCheckpoints(selectedSprite.name)
      fetchNetworkPolicy(selectedSprite.name)
      fetchUrlSettings(selectedSprite.name)
      fetchSessions(selectedSprite.name)
    }
  }, [selectedSprite, fetchCheckpoints, fetchNetworkPolicy, fetchUrlSettings, fetchSessions])

  if (!selectedSprite) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <pre className="text-muted-foreground/30 text-xs font-mono mb-4">
{`
   ╭──────────────────────────────╮
   │                              │
   │   SELECT A SPRITE TO VIEW   │
   │                              │
   │   ← Choose from the list    │
   │      or create a new one    │
   │                              │
   ╰──────────────────────────────╯
`}
          </pre>
          <p className="text-sm text-muted-foreground">
            Select a sprite from the sidebar to view details and manage it
          </p>
        </div>
      </div>
    )
  }

  const handleDelete = async () => {
    await deleteSprite(selectedSprite.name)
  }

  const handleRefresh = async () => {
    await refreshSprite(selectedSprite.name)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-lg font-medium">{selectedSprite.name}</h1>
              <Badge variant={getStatusBadgeVariant(selectedSprite.status)}>
                {selectedSprite.status === "running" && (
                  <span className="inline-block w-1.5 h-1.5 bg-current rounded-full mr-1.5 status-pulse" />
                )}
                {selectedSprite.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {selectedSprite.url && (
                <a
                  href={selectedSprite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  <Globe className="h-3 w-3" />
                  {selectedSprite.url.replace("https://", "")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <span className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                Created {formatRelativeTime(selectedSprite.created_at)}
              </span>
              {selectedSprite.storage_used_bytes && (
                <span>Storage: {formatBytes(selectedSprite.storage_used_bytes)}</span>
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
                    Are you sure you want to delete &quot;{selectedSprite.name}&quot;? This action
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

      {/* Tabs */}
      <Tabs defaultValue="terminal" className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border px-4">
          <TabsList className="bg-transparent">
            <TabsTrigger value="terminal" className="gap-2">
              <Terminal className="h-4 w-4" />
              Terminal
            </TabsTrigger>
            <TabsTrigger value="checkpoints" className="gap-2">
              <Camera className="h-4 w-4" />
              Checkpoints
            </TabsTrigger>
            <TabsTrigger value="network" className="gap-2">
              <Shield className="h-4 w-4" />
              Network
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <Globe className="h-4 w-4" />
              URL
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-2">
              <Layers className="h-4 w-4" />
              Sessions
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="terminal" className="flex-1 overflow-hidden m-0 mt-0 p-0">
          <SpriteTerminal spriteName={selectedSprite.name} />
        </TabsContent>

        <TabsContent value="checkpoints" className="flex-1 overflow-auto m-0 p-4">
          <CheckpointsPanel spriteName={selectedSprite.name} />
        </TabsContent>

        <TabsContent value="network" className="flex-1 overflow-auto m-0 p-4">
          <NetworkPolicyPanel spriteName={selectedSprite.name} />
        </TabsContent>

        <TabsContent value="url" className="flex-1 overflow-auto m-0 p-4">
          <UrlSettingsPanel spriteName={selectedSprite.name} />
        </TabsContent>

        <TabsContent value="sessions" className="flex-1 overflow-auto m-0 p-4">
          <SessionsPanel spriteName={selectedSprite.name} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
