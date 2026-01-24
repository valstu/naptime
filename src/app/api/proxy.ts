import { NextRequest, NextResponse } from "next/server"

const SPRITES_API = "https://api.sprites.dev/v1"

export async function proxyRequest(
  request: NextRequest,
  path: string,
  options: RequestInit = {}
): Promise<NextResponse> {
  const token = request.headers.get("authorization")

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = `${SPRITES_API}${path}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    const text = await response.text()

    if (!response.ok) {
      return NextResponse.json(
        { error: text || response.statusText },
        { status: response.status }
      )
    }

    if (!text) {
      return NextResponse.json({})
    }

    try {
      const data = JSON.parse(text)
      return NextResponse.json(data)
    } catch {
      return new NextResponse(text, {
        status: response.status,
        headers: { "Content-Type": "text/plain" },
      })
    }
  } catch (error) {
    console.error("Proxy error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Proxy request failed" },
      { status: 500 }
    )
  }
}

export async function proxyStreamRequest(
  request: NextRequest,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = request.headers.get("authorization")

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = `${SPRITES_API}${path}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json(
        { error: text || response.statusText },
        { status: response.status }
      )
    }

    // Stream the response back
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": "application/x-ndjson",
        "Transfer-Encoding": "chunked",
      },
    })
  } catch (error) {
    console.error("Proxy stream error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Proxy request failed" },
      { status: 500 }
    )
  }
}
