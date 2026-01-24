"use client"

import { useState } from "react"
import { AsciiHeader } from "./ascii-header"
import { Sidebar } from "./sidebar"
import { CreateSpriteDialog } from "@/components/sprites/create-sprite-dialog"
import { useSprites } from "@/contexts/sprites-context"
import { LoginForm } from "@/components/sprites/login-form"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated } = useSprites()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AsciiHeader />
        <div className="flex-1 flex items-center justify-center p-4">
          <LoginForm />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AsciiHeader />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onCreateClick={() => setCreateDialogOpen(true)} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
      <CreateSpriteDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  )
}
