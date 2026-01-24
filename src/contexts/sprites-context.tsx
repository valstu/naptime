"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import { SpritesClient, getSpritesClient, setSpritesToken, clearSpritesToken } from "@/lib/api/sprites-client"
import type { Sprite, Checkpoint, NetworkPolicy, Session, UrlSettings } from "@/types/sprites"

interface SpritesContextValue {
  // Auth state
  token: string | null
  isAuthenticated: boolean
  setToken: (token: string) => void
  logout: () => void

  // Sprites state
  sprites: Sprite[]
  isLoading: boolean
  error: string | null
  selectedSprite: Sprite | null

  // Sprite actions
  fetchSprites: () => Promise<void>
  createSprite: (name: string) => Promise<Sprite>
  deleteSprite: (name: string) => Promise<void>
  selectSprite: (sprite: Sprite | null) => void
  refreshSprite: (name: string) => Promise<Sprite>

  // Checkpoint actions
  checkpoints: Checkpoint[]
  fetchCheckpoints: (spriteName: string) => Promise<void>
  createCheckpoint: (spriteName: string, name?: string) => Promise<void>
  restoreCheckpoint: (spriteName: string, checkpointId: string) => Promise<void>
  deleteCheckpoint: (spriteName: string, checkpointId: string) => Promise<void>

  // Network policy actions
  networkPolicy: NetworkPolicy | null
  fetchNetworkPolicy: (spriteName: string) => Promise<void>
  updateNetworkPolicy: (spriteName: string, policy: NetworkPolicy) => Promise<void>
  deleteNetworkPolicy: (spriteName: string) => Promise<void>

  // URL settings actions
  urlSettings: UrlSettings | null
  fetchUrlSettings: (spriteName: string) => Promise<void>
  updateUrlSettings: (spriteName: string, settings: UrlSettings) => Promise<void>

  // Sessions actions
  sessions: Session[]
  fetchSessions: (spriteName: string) => Promise<void>
  createSession: (spriteName: string) => Promise<Session>

  // Client
  getClient: () => SpritesClient | null
}

const SpritesContext = createContext<SpritesContextValue | null>(null)

export function SpritesProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null)
  const [sprites, setSprites] = useState<Sprite[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSprite, setSelectedSprite] = useState<Sprite | null>(null)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [networkPolicy, setNetworkPolicy] = useState<NetworkPolicy | null>(null)
  const [urlSettings, setUrlSettings] = useState<UrlSettings | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])

  // Initialize token from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedToken = localStorage.getItem("sprites_token")
      if (savedToken) {
        setTokenState(savedToken)
        setSpritesToken(savedToken)
      }
    }
  }, [])

  const setToken = useCallback((newToken: string) => {
    setTokenState(newToken)
    setSpritesToken(newToken)
  }, [])

  const logout = useCallback(() => {
    setTokenState(null)
    clearSpritesToken()
    setSprites([])
    setSelectedSprite(null)
    setCheckpoints([])
    setNetworkPolicy(null)
    setUrlSettings(null)
    setSessions([])
  }, [])

  const getClient = useCallback((): SpritesClient | null => {
    if (!token) return null
    return getSpritesClient()
  }, [token])

  const fetchSprites = useCallback(async () => {
    const client = getClient()
    if (!client) return

    setIsLoading(true)
    setError(null)
    try {
      const allSprites = await client.listAllSprites()
      setSprites(allSprites)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sprites")
    } finally {
      setIsLoading(false)
    }
  }, [getClient])

  const createSprite = useCallback(async (name: string): Promise<Sprite> => {
    const client = getClient()
    if (!client) throw new Error("Not authenticated")

    const sprite = await client.createSprite(name)
    setSprites(prev => [...prev, sprite])
    return sprite
  }, [getClient])

  const deleteSprite = useCallback(async (name: string): Promise<void> => {
    const client = getClient()
    if (!client) throw new Error("Not authenticated")

    await client.deleteSprite(name)
    setSprites(prev => prev.filter(s => s.name !== name))
    if (selectedSprite?.name === name) {
      setSelectedSprite(null)
    }
  }, [getClient, selectedSprite])

  const selectSprite = useCallback((sprite: Sprite | null) => {
    setSelectedSprite(sprite)
    setCheckpoints([])
    setNetworkPolicy(null)
    setUrlSettings(null)
    setSessions([])
  }, [])

  const refreshSprite = useCallback(async (name: string): Promise<Sprite> => {
    const client = getClient()
    if (!client) throw new Error("Not authenticated")

    const sprite = await client.getSprite(name)
    setSprites(prev => prev.map(s => s.name === name ? sprite : s))
    if (selectedSprite?.name === name) {
      setSelectedSprite(sprite)
    }
    return sprite
  }, [getClient, selectedSprite])

  // Checkpoint actions
  const fetchCheckpoints = useCallback(async (spriteName: string) => {
    const client = getClient()
    if (!client) return

    try {
      const checkpointList = await client.listCheckpoints(spriteName)
      setCheckpoints(checkpointList)
    } catch (err) {
      console.error("Failed to fetch checkpoints:", err)
    }
  }, [getClient])

  const createCheckpoint = useCallback(async (spriteName: string, name?: string) => {
    const client = getClient()
    if (!client) throw new Error("Not authenticated")

    const stream = await client.createCheckpoint(spriteName, name)
    for await (const event of stream) {
      if (event.type === "error") {
        throw new Error(event.error)
      }
    }
    await fetchCheckpoints(spriteName)
  }, [getClient, fetchCheckpoints])

  const restoreCheckpoint = useCallback(async (spriteName: string, checkpointId: string) => {
    const client = getClient()
    if (!client) throw new Error("Not authenticated")

    const stream = await client.restoreCheckpoint(spriteName, checkpointId)
    for await (const event of stream) {
      if (event.type === "error") {
        throw new Error(event.error)
      }
    }
  }, [getClient])

  const deleteCheckpoint = useCallback(async (spriteName: string, checkpointId: string) => {
    const client = getClient()
    if (!client) throw new Error("Not authenticated")

    await client.deleteCheckpoint(spriteName, checkpointId)
    setCheckpoints(prev => prev.filter(c => c.id !== checkpointId))
  }, [getClient])

  // Network policy actions
  const fetchNetworkPolicy = useCallback(async (spriteName: string) => {
    const client = getClient()
    if (!client) return

    try {
      const policy = await client.getNetworkPolicy(spriteName)
      setNetworkPolicy(policy)
    } catch (err) {
      // Policy might not exist
      setNetworkPolicy({ rules: [] })
    }
  }, [getClient])

  const updateNetworkPolicy = useCallback(async (spriteName: string, policy: NetworkPolicy) => {
    const client = getClient()
    if (!client) throw new Error("Not authenticated")

    const updated = await client.updateNetworkPolicy(spriteName, policy)
    setNetworkPolicy(updated)
  }, [getClient])

  const deleteNetworkPolicy = useCallback(async (spriteName: string) => {
    const client = getClient()
    if (!client) throw new Error("Not authenticated")

    await client.deleteNetworkPolicy(spriteName)
    setNetworkPolicy({ rules: [] })
  }, [getClient])

  // URL settings actions
  const fetchUrlSettings = useCallback(async (spriteName: string) => {
    const client = getClient()
    if (!client) return

    try {
      const settings = await client.getUrlSettings(spriteName)
      setUrlSettings(settings)
    } catch (err) {
      setUrlSettings({ auth: "private" })
    }
  }, [getClient])

  const updateUrlSettings = useCallback(async (spriteName: string, settings: UrlSettings) => {
    const client = getClient()
    if (!client) throw new Error("Not authenticated")

    const updated = await client.updateUrlSettings(spriteName, settings)
    setUrlSettings(updated)
  }, [getClient])

  // Sessions actions
  const fetchSessions = useCallback(async (spriteName: string) => {
    const client = getClient()
    if (!client) return

    try {
      const sessionList = await client.listSessions(spriteName)
      setSessions(sessionList)
    } catch (err) {
      console.error("Failed to fetch sessions:", err)
    }
  }, [getClient])

  const createSession = useCallback(async (spriteName: string): Promise<Session> => {
    const client = getClient()
    if (!client) throw new Error("Not authenticated")

    const session = await client.createSession(spriteName)
    setSessions(prev => [...prev, session])
    return session
  }, [getClient])

  const value: SpritesContextValue = {
    token,
    isAuthenticated: !!token,
    setToken,
    logout,
    sprites,
    isLoading,
    error,
    selectedSprite,
    fetchSprites,
    createSprite,
    deleteSprite,
    selectSprite,
    refreshSprite,
    checkpoints,
    fetchCheckpoints,
    createCheckpoint,
    restoreCheckpoint,
    deleteCheckpoint,
    networkPolicy,
    fetchNetworkPolicy,
    updateNetworkPolicy,
    deleteNetworkPolicy,
    urlSettings,
    fetchUrlSettings,
    updateUrlSettings,
    sessions,
    fetchSessions,
    createSession,
    getClient,
  }

  return (
    <SpritesContext.Provider value={value}>
      {children}
    </SpritesContext.Provider>
  )
}

export function useSprites() {
  const context = useContext(SpritesContext)
  if (!context) {
    throw new Error("useSprites must be used within a SpritesProvider")
  }
  return context
}
