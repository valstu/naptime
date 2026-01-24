import { NextRequest } from "next/server"
import { proxyRequest } from "../../../proxy"

type RouteParams = { params: Promise<{ name: string }> }

// GET /api/sprites/[name]/sessions - List sessions (via exec endpoint)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { name } = await params
  // Sprites API returns sessions via the exec endpoint
  return proxyRequest(request, `/sprites/${encodeURIComponent(name)}/exec`)
}
