import { NextRequest } from "next/server"
import { proxyRequest } from "../../../proxy"

type RouteParams = { params: Promise<{ name: string }> }

// GET /api/sprites/[name]/sessions - List sessions
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { name } = await params
  return proxyRequest(request, `/sprites/${encodeURIComponent(name)}/sessions`)
}

// POST /api/sprites/[name]/sessions - Create session
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { name } = await params
  return proxyRequest(request, `/sprites/${encodeURIComponent(name)}/sessions`, {
    method: "POST",
  })
}
