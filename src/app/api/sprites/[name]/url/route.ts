import { NextRequest, NextResponse } from "next/server"
import { proxyRequest } from "../../../proxy"

type RouteParams = { params: Promise<{ name: string }> }

const SPRITES_API = "https://api.sprites.dev/v1"

// GET /api/sprites/[name]/url - Get URL settings from sprite info
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { name } = await params
  const token = request.headers.get("authorization")

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Fetch sprite info which contains URL settings
    const response = await fetch(`${SPRITES_API}/sprites/${encodeURIComponent(name)}`, {
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json(
        { error: text || response.statusText },
        { status: response.status }
      )
    }

    const sprite = await response.json()

    // Extract URL-related info
    return NextResponse.json({
      url: sprite.url || null,
      url_auth: sprite.url_auth || null,
      hostname: sprite.hostname || null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch URL settings" },
      { status: 500 }
    )
  }
}

// PUT /api/sprites/[name]/url - Update URL settings
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { name } = await params
  const body = await request.text()

  // Update sprite with URL settings via PUT
  return proxyRequest(request, `/sprites/${encodeURIComponent(name)}`, {
    method: "PUT",
    body,
  })
}

// POST is alias for PUT for convenience
export async function POST(request: NextRequest, { params }: RouteParams) {
  return PUT(request, { params })
}
