import type {
  Sprite,
  SpriteConfig,
  Checkpoint,
  NetworkPolicy,
  ExecOptions,
  ExecResult,
  Session,
  ListOptions,
  PaginatedResponse,
  ProgressEvent,
  UrlSettings,
} from "@/types/sprites"

// Use local API proxy to avoid CORS issues
const API_BASE = "/api"

export class SpritesApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message?: string
  ) {
    super(message || `API Error: ${status} ${statusText}`)
    this.name = "SpritesApiError"
  }
}

export class SpritesClient {
  private token: string
  private baseUrl: string

  constructor(token: string, baseUrl?: string) {
    this.token = token
    this.baseUrl = baseUrl || API_BASE
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: HeadersInit = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      throw new SpritesApiError(response.status, response.statusText, errorText)
    }

    // Handle empty responses
    const text = await response.text()
    if (!text) return {} as T

    return JSON.parse(text)
  }

  private async streamRequest(
    path: string,
    options: RequestInit = {}
  ): Promise<AsyncGenerator<ProgressEvent>> {
    const url = `${this.baseUrl}${path}`
    const headers: HeadersInit = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      throw new SpritesApiError(response.status, response.statusText, errorText)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("No response body")
    }

    const decoder = new TextDecoder()

    return (async function* () {
      let buffer = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.trim()) {
            try {
              yield JSON.parse(line) as ProgressEvent
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      }

      if (buffer.trim()) {
        try {
          yield JSON.parse(buffer) as ProgressEvent
        } catch {
          // Skip invalid JSON
        }
      }
    })()
  }

  // =====================================
  // Sprite Management
  // =====================================

  async createSprite(name: string, config?: Partial<SpriteConfig>): Promise<Sprite> {
    return this.request<Sprite>("/sprites", {
      method: "POST",
      body: JSON.stringify({ name, ...config }),
    })
  }

  async getSprite(name: string): Promise<Sprite> {
    return this.request<Sprite>(`/sprites/${encodeURIComponent(name)}`)
  }

  async listSprites(options?: ListOptions): Promise<{ sprites: Sprite[]; cursor?: string; has_more?: boolean }> {
    const params = new URLSearchParams()
    if (options?.prefix) params.set("prefix", options.prefix)
    if (options?.limit) params.set("limit", options.limit.toString())
    if (options?.cursor) params.set("cursor", options.cursor)

    const query = params.toString()
    return this.request<{ sprites: Sprite[]; cursor?: string; has_more?: boolean }>(`/sprites${query ? `?${query}` : ""}`)
  }

  async listAllSprites(prefix?: string): Promise<Sprite[]> {
    const allSprites: Sprite[] = []
    let cursor: string | undefined

    do {
      const response = await this.listSprites({ prefix, cursor })
      // API returns sprites array, not items
      const spriteList = response.sprites || []
      allSprites.push(...spriteList)
      cursor = response.cursor
    } while (cursor)

    return allSprites
  }

  async deleteSprite(name: string): Promise<void> {
    await this.request(`/sprites/${encodeURIComponent(name)}`, {
      method: "DELETE",
    })
  }

  async upgradeSprite(name: string): Promise<Sprite> {
    return this.request<Sprite>(`/sprites/${encodeURIComponent(name)}/upgrade`, {
      method: "POST",
    })
  }

  // =====================================
  // Command Execution
  // =====================================

  async exec(name: string, options: ExecOptions): Promise<ExecResult> {
    return this.request<ExecResult>(`/sprites/${encodeURIComponent(name)}/exec`, {
      method: "POST",
      body: JSON.stringify(options),
    })
  }

  getExecWebSocketUrl(name: string): string {
    // WebSocket connections go direct to the API
    return `wss://api.sprites.dev/v1/sprites/${encodeURIComponent(name)}/exec?token=${this.token}`
  }

  // =====================================
  // Sessions
  // =====================================

  async createSession(name: string): Promise<Session> {
    return this.request<Session>(`/sprites/${encodeURIComponent(name)}/sessions`, {
      method: "POST",
    })
  }

  async listSessions(name: string): Promise<Session[]> {
    const response = await this.request<{ sessions: Session[] }>(
      `/sprites/${encodeURIComponent(name)}/sessions`
    )
    return response.sessions || []
  }

  getSessionWebSocketUrl(name: string, sessionId: string): string {
    return `wss://api.sprites.dev/v1/sprites/${encodeURIComponent(name)}/sessions/${sessionId}?token=${this.token}`
  }

  // =====================================
  // Checkpoints
  // =====================================

  async listCheckpoints(name: string): Promise<Checkpoint[]> {
    const response = await this.request<{ checkpoints: Checkpoint[] }>(
      `/sprites/${encodeURIComponent(name)}/checkpoints`
    )
    return response.checkpoints || []
  }

  async getCheckpoint(name: string, checkpointId: string): Promise<Checkpoint> {
    return this.request<Checkpoint>(
      `/sprites/${encodeURIComponent(name)}/checkpoints/${encodeURIComponent(checkpointId)}`
    )
  }

  async createCheckpoint(
    name: string,
    checkpointName?: string
  ): Promise<AsyncGenerator<ProgressEvent>> {
    return this.streamRequest(`/sprites/${encodeURIComponent(name)}/checkpoints`, {
      method: "POST",
      body: JSON.stringify({ name: checkpointName }),
    })
  }

  async restoreCheckpoint(
    name: string,
    checkpointId: string
  ): Promise<AsyncGenerator<ProgressEvent>> {
    return this.streamRequest(
      `/sprites/${encodeURIComponent(name)}/checkpoints/${encodeURIComponent(checkpointId)}/restore`,
      { method: "POST" }
    )
  }

  async deleteCheckpoint(name: string, checkpointId: string): Promise<void> {
    await this.request(
      `/sprites/${encodeURIComponent(name)}/checkpoints/${encodeURIComponent(checkpointId)}`,
      { method: "DELETE" }
    )
  }

  // =====================================
  // Network Policy
  // =====================================

  async getNetworkPolicy(name: string): Promise<NetworkPolicy> {
    return this.request<NetworkPolicy>(`/sprites/${encodeURIComponent(name)}/policy/network`)
  }

  async updateNetworkPolicy(name: string, policy: NetworkPolicy): Promise<NetworkPolicy> {
    return this.request<NetworkPolicy>(`/sprites/${encodeURIComponent(name)}/policy/network`, {
      method: "POST",
      body: JSON.stringify(policy),
    })
  }

  async deleteNetworkPolicy(name: string): Promise<void> {
    await this.request(`/sprites/${encodeURIComponent(name)}/policy/network`, {
      method: "DELETE",
    })
  }

  // =====================================
  // URL Settings
  // =====================================

  async getUrlSettings(name: string): Promise<UrlSettings> {
    return this.request<UrlSettings>(`/sprites/${encodeURIComponent(name)}/url`)
  }

  async updateUrlSettings(name: string, settings: UrlSettings): Promise<UrlSettings> {
    return this.request<UrlSettings>(`/sprites/${encodeURIComponent(name)}/url`, {
      method: "POST",
      body: JSON.stringify(settings),
    })
  }

  // =====================================
  // Port Tunneling
  // =====================================

  getPortTunnelWebSocketUrl(name: string, port: number): string {
    return `wss://api.sprites.dev/v1/sprites/${encodeURIComponent(name)}/tunnel/${port}?token=${this.token}`
  }
}

// Singleton instance for client-side usage
let clientInstance: SpritesClient | null = null

export function getSpritesClient(): SpritesClient {
  if (!clientInstance) {
    const token = typeof window !== "undefined"
      ? localStorage.getItem("sprites_token") || ""
      : ""
    clientInstance = new SpritesClient(token)
  }
  return clientInstance
}

export function setSpritesToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("sprites_token", token)
  }
  clientInstance = new SpritesClient(token)
}

export function clearSpritesToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("sprites_token")
  }
  clientInstance = null
}
