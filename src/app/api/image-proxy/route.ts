import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) return new NextResponse("Missing url", { status: 400 });

    try {
        const res = await fetch(url);
        if (!res.ok) return new NextResponse("Fetch failed", { status: 502 });

        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get("content-type") || "image/jpeg";

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=86400",
                "Access-Control-Allow-Origin": "*",
            },
        });
    } catch (err) {
        console.error("Image proxy error:", err);
        return new NextResponse("Proxy error", { status: 500 });
    }
}