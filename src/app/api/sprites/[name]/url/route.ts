import { NextRequest } from "next/server"
import { proxyRequest } from "../../../proxy"

type RouteParams = { params: Promise<{ name: string }> }

// GET /api/sprites/[name]/url - Get URL settings
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { name } = await params
  return proxyRequest(request, `/sprites/${encodeURIComponent(name)}/url`)
}

// POST /api/sprites/[name]/url - Update URL settings
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { name } = await params
  const body = await request.text()
  return proxyRequest(request, `/sprites/${encodeURIComponent(name)}/url`, {
    method: "POST",
    body,
  })
}
