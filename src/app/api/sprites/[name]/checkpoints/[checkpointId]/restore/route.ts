import { NextRequest } from "next/server"
import { proxyStreamRequest } from "../../../../../proxy"

type RouteParams = { params: Promise<{ name: string; checkpointId: string }> }

// POST /api/sprites/[name]/checkpoints/[checkpointId]/restore - Restore checkpoint
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { name, checkpointId } = await params
  return proxyStreamRequest(
    request,
    `/sprites/${encodeURIComponent(name)}/checkpoints/${encodeURIComponent(checkpointId)}/restore`,
    { method: "POST" }
  )
}
