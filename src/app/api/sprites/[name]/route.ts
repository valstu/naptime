import { NextRequest } from "next/server"
import { proxyRequest } from "../../proxy"

type RouteParams = { params: Promise<{ name: string }> }

// GET /api/sprites/[name] - Get sprite
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { name } = await params
  return proxyRequest(request, `/sprites/${encodeURIComponent(name)}`)
}

// PUT /api/sprites/[name] - Update sprite
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { name } = await params
  const body = await request.text()
  return proxyRequest(request, `/sprites/${encodeURIComponent(name)}`, {
    method: "PUT",
    body,
  })
}

// DELETE /api/sprites/[name] - Delete sprite
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { name } = await params
  return proxyRequest(request, `/sprites/${encodeURIComponent(name)}`, {
    method: "DELETE",
  })
}
