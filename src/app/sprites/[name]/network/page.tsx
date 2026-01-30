"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import { useSprites } from "@/contexts/sprites-context"
import { NetworkPolicyPanel } from "@/components/sprites/network-policy-panel"

export default function NetworkPage() {
  const params = useParams()
  const spriteName = params.name as string
  const { fetchNetworkPolicy, isAuthenticated } = useSprites()

  useEffect(() => {
    if (isAuthenticated && spriteName) {
      fetchNetworkPolicy(spriteName)
    }
  }, [isAuthenticated, spriteName, fetchNetworkPolicy])

  return (
    <div className="p-4 h-full overflow-auto">
      <NetworkPolicyPanel spriteName={spriteName} />
    </div>
  )
}
