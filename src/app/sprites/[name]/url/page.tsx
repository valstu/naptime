"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { useSprites } from "@/contexts/sprites-context"
import { UrlSettingsPanel } from "@/components/sprites/url-settings-panel"

export default function UrlPage() {
  const params = useParams()
  const spriteName = params.name as string
  const { fetchUrlSettings, isAuthenticated } = useSprites()

  useEffect(() => {
    if (isAuthenticated && spriteName) {
      fetchUrlSettings(spriteName)
    }
  }, [isAuthenticated, spriteName, fetchUrlSettings])

  return (
    <div className="p-4 h-full overflow-auto">
      <UrlSettingsPanel spriteName={spriteName} />
    </div>
  )
}
