"use client"

import { useState } from "react"
import { useSprites } from "@/contexts/sprites-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  Shield,
  Plus,
  Trash2,
  Save,
  Loader2,
  Check,
  X,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { PolicyRule } from "@/types/sprites"

interface NetworkPolicyPanelProps {
  spriteName: string
}

export function NetworkPolicyPanel({ spriteName }: NetworkPolicyPanelProps) {
  const {
    networkPolicy,
    updateNetworkPolicy,
    deleteNetworkPolicy,
  } = useSprites()
  const [rules, setRules] = useState<PolicyRule[]>(networkPolicy?.rules || [])
  const [isSaving, setIsSaving] = useState(false)
  const [newDomain, setNewDomain] = useState("")
  const [newAction, setNewAction] = useState<"allow" | "deny">("allow")
  const [hasChanges, setHasChanges] = useState(false)

  const handleAddRule = () => {
    if (!newDomain.trim()) return

    const rule: PolicyRule = {
      domain: newDomain.trim(),
      action: newAction,
    }

    setRules(prev => [...prev, rule])
    setNewDomain("")
    setHasChanges(true)
  }

  const handleRemoveRule = (index: number) => {
    setRules(prev => prev.filter((_, i) => i !== index))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateNetworkPolicy(spriteName, { rules })
      setHasChanges(false)
    } catch (err) {
      console.error("Failed to update network policy:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = async () => {
    try {
      await deleteNetworkPolicy(spriteName)
      setRules([])
      setHasChanges(false)
    } catch (err) {
      console.error("Failed to clear network policy:", err)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddRule()
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Network Policy
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Control outbound network access using DNS-based filtering
          </p>
        </div>
        <div className="flex items-center gap-2">
          {rules.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-error hover:text-error">
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Network Policy</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all network policy rules and allow unrestricted
                    outbound access. Are you sure?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClear}>
                    Clear Policy
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Warning box */}
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-warning font-medium">Important</p>
              <p className="text-muted-foreground mt-1">
                When network rules are set, UDP traffic is blocked entirely.
                This will break services that require UDP (e.g., Tailscale).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add new rule */}
      <Card>
        <CardContent className="p-4">
          <Label className="mb-3 block">Add Rule</Label>
          <div className="flex items-center gap-2">
            <Select value={newAction} onValueChange={(v: "allow" | "deny") => setNewAction(v)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allow">
                  <span className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-success" />
                    Allow
                  </span>
                </SelectItem>
                <SelectItem value="deny">
                  <span className="flex items-center gap-2">
                    <X className="h-3 w-3 text-error" />
                    Deny
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., github.com or *.npmjs.org"
              className="flex-1"
            />
            <Button onClick={handleAddRule} disabled={!newDomain.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Use * for wildcards (e.g., *.example.com matches all subdomains)
          </p>
        </CardContent>
      </Card>

      {/* Rules list */}
      <Card>
        <CardContent className="p-0">
          {rules.length === 0 ? (
            <div className="py-8 text-center">
              <Shield className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No rules configured</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                All outbound connections are currently allowed
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              <div className="px-4 py-2 bg-muted/30 text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center">
                <span className="w-20">Action</span>
                <span className="flex-1">Domain</span>
                <span className="w-16"></span>
              </div>
              {rules.map((rule, index) => (
                <div
                  key={`${rule.domain}-${index}`}
                  className="px-4 py-3 flex items-center hover:bg-muted/30 transition-colors"
                >
                  <div className="w-20">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium",
                      rule.action === "allow"
                        ? "bg-success/10 text-success border border-success/30"
                        : "bg-error/10 text-error border border-error/30"
                    )}>
                      {rule.action === "allow" ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      {rule.action}
                    </span>
                  </div>
                  <span className="flex-1 font-mono text-sm">{rule.domain}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-16 text-muted-foreground hover:text-error"
                    onClick={() => handleRemoveRule(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preset bundles */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <Label className="mb-3 block">Quick Presets</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRules([
                  { action: "allow", domain: "github.com" },
                  { action: "allow", domain: "*.github.com" },
                  { action: "allow", domain: "*.githubusercontent.com" },
                ])
                setHasChanges(true)
              }}
            >
              GitHub Only
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRules([
                  { action: "allow", domain: "registry.npmjs.org" },
                  { action: "allow", domain: "*.npmjs.org" },
                  { action: "allow", domain: "registry.yarnpkg.com" },
                ])
                setHasChanges(true)
              }}
            >
              NPM/Yarn
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRules([
                  { action: "allow", domain: "pypi.org" },
                  { action: "allow", domain: "files.pythonhosted.org" },
                ])
                setHasChanges(true)
              }}
            >
              PyPI
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
