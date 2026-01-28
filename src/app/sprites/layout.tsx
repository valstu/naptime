"use client"

import { useEffect, useState } from "react"
import { useSprites } from "@/contexts/sprites-context"
import { AsciiHeader } from "@/components/layout/ascii-header"
import { Sidebar } from "@/components/layout/sidebar"
import { CreateSpriteDialog } from "@/components/sprites/create-sprite-dialog"
import { LoginForm } from "@/components/sprites/login-form"

export default function SpritesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, fetchSprites } = useSprites()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      fetchSprites()
    }
  }, [isAuthenticated, fetchSprites])

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
        <main className="flex-1 overflow-hidden">
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
