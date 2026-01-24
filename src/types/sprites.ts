// Sprites API Types

export type SpriteStatus = "running" | "sleeping" | "stopped" | "starting" | "stopping"

export interface Sprite {
  name: string
  status: SpriteStatus
  url?: string
  created_at: string
  updated_at: string
  storage_used_bytes?: number
  cpu_cores?: number
  memory_mb?: number
  storage_gb?: number
}

export interface SpriteConfig {
  name: string
  url_settings?: UrlSettings
}

export interface UrlSettings {
  auth: "public" | "private" | "token"
}

export interface Checkpoint {
  id: string
  name?: string
  created_at: string
  size_bytes?: number
}

export interface NetworkPolicy {
  rules: PolicyRule[]
}

export interface PolicyRule {
  action: "allow" | "deny"
  domain: string
}

export interface ExecOptions {
  command: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  tty?: boolean
  tty_rows?: number
  tty_cols?: number
}

export interface ExecResult {
  exit_code: number
  stdout: string
  stderr: string
}

export interface Session {
  id: string
  created_at: string
  command: string
  status: "active" | "detached" | "completed"
}

export interface ListOptions {
  prefix?: string
  limit?: number
  cursor?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  cursor?: string
  has_more: boolean
}

// Progress events for checkpoint operations
export interface ProgressEvent {
  type: "progress" | "complete" | "error"
  message?: string
  progress?: number
  error?: string
}

// WebSocket message types
export interface WsMessage {
  type: "stdout" | "stderr" | "exit" | "error" | "resize" | "input" | "port_opened"
  data?: string
  exit_code?: number
  port?: number
}
