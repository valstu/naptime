import { NextRequest } from "next/server"
import { proxyRequest } from "../proxy"

// GET /api/sprites - List sprites
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.toString()
  return proxyRequest(request, `/sprites${query ? `?${query}` : ""}`)
}

// POST /api/sprites - Create sprite
export async function POST(request: NextRequest) {
  const body = await request.text()
  return proxyRequest(request, "/sprites", {
    method: "POST",
    body,
  })
}
