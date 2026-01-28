import { NextRequest, NextResponse } from "next/server"

const SPRITES_API_BASE = "https://api.sprites.dev/v1"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; sessionId: string }> }
) {
  const { name, sessionId } = await params
  const authHeader = request.headers.get("authorization")

  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const response = await fetch(
      `${SPRITES_API_BASE}/sprites/${encodeURIComponent(name)}/exec/${sessionId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: authHeader,
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: error || "Failed to delete session" },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete session:", error)
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    )
  }
}
