"use client"

import { useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { SpriteDetail } from "@/components/sprites/sprite-detail"
import { useSprites } from "@/contexts/sprites-context"

export default function Home() {
  const { isAuthenticated, fetchSprites } = useSprites()

  useEffect(() => {
    if (isAuthenticated) {
      fetchSprites()
    }
  }, [isAuthenticated, fetchSprites])

  return (
    <DashboardLayout>
      <SpriteDetail />
    </DashboardLayout>
  )
}
