import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/ravaa_token=([^;]+)/);
  const token = m ? decodeURIComponent(m[1]) : null;
  if (token) {
    try {
      const svcUrl = (process.env.RAVAA_SERVICE_URL || "http://localhost:2711").replace(/\/$/, "");
      await fetch(`${svcUrl}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    } catch {}
  }
  const res = NextResponse.json({ success: true });
  res.cookies.set("ravaa_token", "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set("token", "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set("refreshToken", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
