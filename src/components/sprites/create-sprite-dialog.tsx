"use client"

import { useState } from "react"
import { useSprites } from "@/contexts/sprites-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Box, Loader2 } from "lucide-react"

interface CreateSpriteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateSpriteDialog({ open, onOpenChange }: CreateSpriteDialogProps) {
  const { createSprite, selectSprite } = useSprites()
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Name is required")
      return
    }

    // Validate name format
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(trimmedName)) {
      setError("Name must be lowercase letters, numbers, and hyphens only")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const sprite = await createSprite(trimmedName)
      selectSprite(sprite)
      setName("")
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sprite")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName("")
      setError(null)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="h-4 w-4 text-primary" />
            Create New Sprite
          </DialogTitle>
          <DialogDescription>
            Create a new hardware-isolated Linux sandbox
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sprite-name">Sprite Name</Label>
              <Input
                id="sprite-name"
                placeholder="my-sprite"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase())}
                autoFocus
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only
              </p>
              {error && (
                <p className="text-xs text-error">{error}</p>
              )}
            </div>

            {/* Specs preview */}
            <div className="p-3 bg-muted border border-border text-xs space-y-1">
              <div className="text-muted-foreground uppercase tracking-wider mb-2">
                Specifications
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPU</span>
                <span className="text-foreground tabular-nums">8 vCPUs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Memory</span>
                <span className="text-foreground tabular-nums">8192 MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Storage</span>
                <span className="text-foreground tabular-nums">100 GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Idle timeout</span>
                <span className="text-foreground tabular-nums">30s</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Sprite"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
