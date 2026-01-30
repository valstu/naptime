import { NextRequest } from "next/server"
import { proxyRequest, proxyStreamRequest } from "../../../proxy"

type RouteParams = { params: Promise<{ name: string }> }

// GET /api/sprites/[name]/checkpoints - List checkpoints
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { name } = await params
  return proxyRequest(request, `/sprites/${encodeURIComponent(name)}/checkpoints`)
}

// POST /api/sprites/[name]/checkpoints - Create checkpoint
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { name } = await params
  const body = await request.text()
  return proxyStreamRequest(request, `/sprites/${encodeURIComponent(name)}/checkpoints`, {
    method: "POST",
    body,
  })
}
