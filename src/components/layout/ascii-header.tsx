"use client"

import { useSprites } from "@/contexts/sprites-context"
import { Button } from "@/components/ui/button"
import { LogOut, Settings } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const ASCII_LOGO = `
 ██████╗██████╗ ██████╗ ██╗████████╗███████╗███████╗
██╔════╝██╔══██╗██╔══██╗██║╚══██╔══╝██╔════╝██╔════╝
╚█████╗ ██████╔╝██████╔╝██║   ██║   █████╗  ███████╗
 ╚═══██╗██╔═══╝ ██╔══██╗██║   ██║   ██╔══╝  ╚════██║
██████╔╝██║     ██║  ██║██║   ██║   ███████╗███████║
╚═════╝ ╚═╝     ╚═╝  ╚═╝╚═╝   ╚═╝   ╚══════╝╚══════╝
`.trim()

const ASCII_LOGO_SMALL = `▓▓ SPRITES`

export function AsciiHeader() {
  const { isAuthenticated, logout, sprites } = useSprites()

  const runningCount = sprites.filter(s => s.status === "running").length
  const sleepingCount = sprites.filter(s => s.status === "sleeping").length

  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <pre className="text-[6px] leading-[6px] text-primary font-mono select-none">
                {ASCII_LOGO}
              </pre>
            </div>
            <div className="md:hidden text-primary font-bold tracking-wider">
              {ASCII_LOGO_SMALL}
            </div>
          </div>

          {/* Status bar */}
          {isAuthenticated && (
            <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-active rounded-full status-pulse" />
                <span>{runningCount} running</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-sleeping rounded-full" />
                <span>{sleepingCount} sleeping</span>
              </div>
              <div className="text-border">│</div>
              <div className="tabular-nums">{sprites.length} total</div>
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <>
              <div className="hidden sm:block text-xs text-muted-foreground px-2 py-1 bg-muted border border-border">
                v1.0.0
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>
                    <span className="text-xs text-muted-foreground">API: api.sprites.dev</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Decorative line */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </header>
  )
}
