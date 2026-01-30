import { NextRequest, NextResponse } from "next/server"

type RouteParams = { params: Promise<{ name: string }> }

const SPRITES_API = "https://api.sprites.dev/v1"

// GET /api/sprites/[name]/sessions - List sessions (via exec endpoint)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { name } = await params
  const token = request.headers.get("authorization")

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Sessions are listed via /exec/sessions endpoint
    const response = await fetch(`${SPRITES_API}/sprites/${encodeURIComponent(name)}/exec/sessions`, {
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      // Return empty sessions array instead of error for 404
      if (response.status === 404) {
        return NextResponse.json([])
      }
      const text = await response.text()
      return NextResponse.json(
        { error: text || response.statusText },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Handle various response formats
    if (Array.isArray(data)) {
      return NextResponse.json(data)
    }
    if (data.sessions && Array.isArray(data.sessions)) {
      return NextResponse.json(data.sessions)
    }

    // Return empty array if format is unexpected
    return NextResponse.json([])
  } catch (error) {
    console.error("Sessions fetch error:", error)
    // Return empty array on error to prevent UI crashes
    return NextResponse.json([])
  }
}
