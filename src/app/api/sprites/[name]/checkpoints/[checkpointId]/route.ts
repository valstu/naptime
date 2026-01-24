import { NextRequest } from "next/server"
import { proxyRequest } from "../../../../proxy"

type RouteParams = { params: Promise<{ name: string; checkpointId: string }> }

// GET /api/sprites/[name]/checkpoints/[checkpointId] - Get checkpoint
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { name, checkpointId } = await params
  return proxyRequest(
    request,
    `/sprites/${encodeURIComponent(name)}/checkpoints/${encodeURIComponent(checkpointId)}`
  )
}

// DELETE /api/sprites/[name]/checkpoints/[checkpointId] - Delete checkpoint
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { name, checkpointId } = await params
  return proxyRequest(
    request,
    `/sprites/${encodeURIComponent(name)}/checkpoints/${encodeURIComponent(checkpointId)}`,
    { method: "DELETE" }
  )
}
