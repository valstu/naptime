import { NextRequest } from "next/server"
import { proxyRequest } from "../../../proxy"

type RouteParams = { params: Promise<{ name: string }> }

// POST /api/sprites/[name]/exec - Execute command
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { name } = await params
  const body = await request.text()
  return proxyRequest(request, `/sprites/${encodeURIComponent(name)}/exec`, {
    method: "POST",
    body,
  })
}
