// @ts-nocheck — SHELL cangkang per-app login ala Google
import { NextRequest, NextResponse } from "next/server";
import { isSecureRequest } from "@/lib/cookie";
import { getRavaaServiceConfig } from "@/lib/ravaa-service";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const rl = rateLimit(`ravaa-login:${ip}`, 60_000, 20);
    if (!rl.allowed) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }
    const body = await request.json();
    const identifier = (body.identifier || body.email || "").toString().trim();
    const password = (body.password || "").toString();
    if (!identifier || !password) {
      return NextResponse.json({ success: false, error: "Identifier dan password wajib" }, { status: 400 });
    }
    let cfg;
    try { cfg = getRavaaServiceConfig(); } catch {
      return NextResponse.json({ success: false, error: "Ravaa Service not configured" }, { status: 503 });
    }
    const url = cfg.url.replace(/\/$/, "");
    const res = await fetch(`${url}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = (data as any)?.error;
      return NextResponse.json({ success: false, error: err?.message || "Login failed", code: err?.code, details: err?.details }, { status: res.status });
    }
    const ravaaUser = (data as any).user;
    const accessToken = (data as any).accessToken as string;
    const refreshToken = (data as any).refreshToken as string | undefined;
    if (!ravaaUser || !accessToken) {
      return NextResponse.json({ success: false, error: "Invalid response from service" }, { status: 502 });
    }
    const response = NextResponse.json({ success: true, data: { user: ravaaUser, source: "ravaa", accessToken } });
    response.cookies.set("ravaa_token", accessToken, { httpOnly: true, secure: isSecureRequest(request.headers), sameSite: "lax", path: "/", maxAge: 60 * 15 });
    if (refreshToken) {
      response.cookies.set("refreshToken", refreshToken, { httpOnly: true, secure: isSecureRequest(request.headers), sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
    }
    response.cookies.set("token", accessToken, { httpOnly: true, secure: isSecureRequest(request.headers), sameSite: "lax", path: "/", maxAge: 60 * 15 });
    return response;
  } catch (e) {
    console.error("Ravaa login error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
