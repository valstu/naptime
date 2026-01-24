"use client"

import { useState } from "react"
import { useSprites } from "@/contexts/sprites-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Key, ExternalLink } from "lucide-react"

const ASCII_BOX = `
╔══════════════════════════════════════════╗
║                                          ║
║    ▓▓▓  SPRITES CONTROL PANEL  ▓▓▓      ║
║                                          ║
║    Hardware-isolated Linux sandboxes     ║
║    Checkpoint & Restore                  ║
║    Scale to Zero                         ║
║                                          ║
╚══════════════════════════════════════════╝
`.trim()

export function LoginForm() {
  const { setToken, fetchSprites } = useSprites()
  const [token, setTokenInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) {
      setError("Token is required")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setToken(token.trim())
      await fetchSprites()
    } catch (err) {
      setError("Invalid token or API error")
      setTokenInput("")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <pre className="text-[8px] leading-[8px] text-primary font-mono mb-4 select-none">
          {ASCII_BOX}
        </pre>
        <CardTitle className="text-foreground">Authentication Required</CardTitle>
        <CardDescription>
          Enter your Sprites API token to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">API Token</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="token"
                type="password"
                placeholder="spr_..."
                value={token}
                onChange={(e) => setTokenInput(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-xs text-error">{error}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Connecting..." : "Connect"}
          </Button>
          <div className="text-center">
            <a
              href="https://sprites.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Get an API token at sprites.dev
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </form>

        {/* ASCII decoration */}
        <div className="mt-6 pt-4 border-t border-border">
          <pre className="text-[10px] leading-tight text-muted-foreground/30 text-center font-mono">
{`
    .---.
   /     \\
   \\.@-@./
   /\`\\_/\`\\
  //  _  \\\\
 | \\     )|_
/\`\\_\`>  <_/ \\
\\__/'---'\\__/
`}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
