"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { useSprites } from "@/contexts/sprites-context"
import { CheckpointsPanel } from "@/components/sprites/checkpoints-panel"

export default function CheckpointsPage() {
  const params = useParams()
  const spriteName = params.name as string
  const { fetchCheckpoints, isAuthenticated } = useSprites()

  useEffect(() => {
    if (isAuthenticated && spriteName) {
      fetchCheckpoints(spriteName)
    }
  }, [isAuthenticated, spriteName, fetchCheckpoints])

  return (
    <div className="p-4 h-full overflow-auto">
      <CheckpointsPanel spriteName={spriteName} />
    </div>
  )
}
