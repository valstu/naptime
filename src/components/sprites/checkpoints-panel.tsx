"use client"

import { useState } from "react"
import { useSprites } from "@/contexts/sprites-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import {
  Camera,
  RotateCcw,
  Trash2,
  Plus,
  Loader2,
  Clock,
  HardDrive,
} from "lucide-react"
import { formatBytes, formatDate, formatRelativeTime } from "@/lib/utils"
import type { Checkpoint } from "@/types/sprites"

interface CheckpointsPanelProps {
  spriteName: string
}

export function CheckpointsPanel({ spriteName }: CheckpointsPanelProps) {
  const {
    checkpoints,
    createCheckpoint,
    restoreCheckpoint,
    deleteCheckpoint,
    fetchCheckpoints,
  } = useSprites()
  const [isCreating, setIsCreating] = useState(false)
  const [isRestoring, setIsRestoring] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [checkpointName, setCheckpointName] = useState("")

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      await createCheckpoint(spriteName, checkpointName || undefined)
      setCheckpointName("")
      setCreateDialogOpen(false)
    } catch (err) {
      console.error("Failed to create checkpoint:", err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleRestore = async (checkpoint: Checkpoint) => {
    setIsRestoring(checkpoint.id)
    try {
      await restoreCheckpoint(spriteName, checkpoint.id)
    } catch (err) {
      console.error("Failed to restore checkpoint:", err)
    } finally {
      setIsRestoring(null)
    }
  }

  const handleDelete = async (checkpoint: Checkpoint) => {
    try {
      await deleteCheckpoint(spriteName, checkpoint.id)
    } catch (err) {
      console.error("Failed to delete checkpoint:", err)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Checkpoints
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Capture and restore filesystem state snapshots
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Checkpoint
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Checkpoint</DialogTitle>
              <DialogDescription>
                Create a point-in-time snapshot of your sprite&apos;s filesystem
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="checkpoint-name">Name (optional)</Label>
              <Input
                id="checkpoint-name"
                value={checkpointName}
                onChange={(e) => setCheckpointName(e.target.value)}
                placeholder="e.g., before-migration"
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Create
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info box */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <pre className="text-xs text-muted-foreground font-mono">
{`┌─────────────────────────────────────────────────────┐
│  Checkpoints capture your complete filesystem state │
│  • Creation takes ~300ms with no interruption       │
│  • Copy-on-write keeps incremental checkpoints small│
│  • Last 5 checkpoints mounted at /.sprite/checkpoints│
└─────────────────────────────────────────────────────┘`}
          </pre>
        </CardContent>
      </Card>

      {/* Checkpoints list */}
      {checkpoints.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Camera className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No checkpoints yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Create a checkpoint to save your current state
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {checkpoints.map((checkpoint) => (
            <Card key={checkpoint.id} className="hover:border-border/80 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Camera className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium truncate">
                        {checkpoint.name || checkpoint.id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(checkpoint.created_at)}
                      </span>
                      {checkpoint.size_bytes && (
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          {formatBytes(checkpoint.size_bytes)}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                      ID: {checkpoint.id}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isRestoring === checkpoint.id}
                        >
                          {isRestoring === checkpoint.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Restore Checkpoint</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will restore your sprite to the state captured at{" "}
                            {formatDate(checkpoint.created_at)}. Any changes made after
                            this checkpoint will be lost.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRestore(checkpoint)}>
                            Restore
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-error hover:text-error">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Checkpoint</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this checkpoint? This action
                            cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(checkpoint)}
                            className="bg-error text-white hover:bg-error/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
