import { NextRequest } from "next/server"
import { proxyRequest } from "../../../../proxy"

type RouteParams = { params: Promise<{ name: string }> }

// GET /api/sprites/[name]/policy/network - Get network policy
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { name } = await params
  return proxyRequest(request, `/sprites/${encodeURIComponent(name)}/policy/network`)
}

// POST /api/sprites/[name]/policy/network - Update network policy
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { name } = await params
  const body = await request.text()
  return proxyRequest(request, `/sprites/${encodeURIComponent(name)}/policy/network`, {
    method: "POST",
    body,
  })
}

// DELETE /api/sprites/[name]/policy/network - Delete network policy
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { name } = await params
  return proxyRequest(request, `/sprites/${encodeURIComponent(name)}/policy/network`, {
    method: "DELETE",
  })
}
