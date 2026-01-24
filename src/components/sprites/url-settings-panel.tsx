"use client"

import { useState } from "react"
import { useSprites } from "@/contexts/sprites-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Globe,
  Lock,
  Key,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { UrlSettings } from "@/types/sprites"

interface UrlSettingsPanelProps {
  spriteName: string
}

type AuthMode = "public" | "private" | "token" | "sprite"

const AUTH_OPTIONS: { value: AuthMode; label: string; description: string; icon: typeof Globe }[] = [
  {
    value: "public",
    label: "Public",
    description: "Anyone can access your sprite's URL",
    icon: Globe,
  },
  {
    value: "sprite",
    label: "Authenticated",
    description: "Requires sprite authentication",
    icon: Lock,
  },
]

export function UrlSettingsPanel({ spriteName }: UrlSettingsPanelProps) {
  const { urlSettings, updateUrlSettings, selectedSprite } = useSprites()
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedAuth, setSelectedAuth] = useState<AuthMode>(
    (urlSettings?.auth || urlSettings?.url_auth || "sprite") as AuthMode
  )

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateUrlSettings(spriteName, { auth: selectedAuth })
    } catch (err) {
      console.error("Failed to update URL settings:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const copyUrl = async () => {
    if (selectedSprite?.url) {
      await navigator.clipboard.writeText(selectedSprite.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const hasChanges = selectedAuth !== urlSettings?.auth

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            URL Settings
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Configure how your sprite&apos;s URL can be accessed
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Save
        </Button>
      </div>

      {/* Current URL */}
      {selectedSprite?.url && (
        <Card>
          <CardContent className="p-4">
            <Label className="mb-2 block">Sprite URL</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted border border-border px-3 py-2 font-mono text-sm truncate">
                {selectedSprite.url}
              </div>
              <Button variant="outline" size="sm" onClick={copyUrl}>
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={selectedSprite.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auth mode selection */}
      <Card>
        <CardContent className="p-4">
          <Label className="mb-3 block">Access Mode</Label>
          <Select value={selectedAuth} onValueChange={(v: AuthMode) => setSelectedAuth(v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUTH_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="h-4 w-4" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Selected option description */}
          <div className="mt-4 space-y-3">
            {AUTH_OPTIONS.map((option) => {
              const isSelected = selectedAuth === option.value
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedAuth(option.value)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 text-left transition-colors border",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "p-2",
                    isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className={cn(
                      "font-medium text-sm",
                      isSelected ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {option.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary shrink-0 mt-1" />
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Info box */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-info shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Your sprite&apos;s URL allows external access to any HTTP server
                running inside on port 8080.
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Serve web apps and APIs</li>
                <li>Accept webhooks from external services</li>
                <li>Share your work with others</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ASCII decoration */}
      <div className="text-center pt-4">
        <pre className="text-[10px] text-muted-foreground/30 font-mono inline-block">
{`
    ┌──────────────────┐
    │   🌐  HTTP/S     │
    │   ════════════   │
    │   :8080 → URL    │
    └──────────────────┘
`}
        </pre>
      </div>
    </div>
  )
}
