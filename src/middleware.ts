import { NextRequest, NextResponse } from "next/server";
import { isSecureRequest } from "@/lib/cookie";

const publicPaths = ["/login", "/api/auth/login", "/api/auth/token", "/api/auth/ravaa", "/shared", "/api/shared", "/s", "/api/shared", "/api/settings", "/office", "/api/wopi"];

async function verifyShellAuth(request: NextRequest): Promise<boolean> {
  // Shell: token ada di cookie ravaa_token atau Authorization Bearer
  // Kita tidak verify signature lokal (Drive secret), tapi forward ke ravaa-service via fetch di route
  // Di middleware, kita cuma cek keberadaan token + fallback verify lokal untuk transisi
  const token = request.cookies.get("ravaa_token")?.value || request.cookies.get("token")?.value
    || request.headers.get("authorization")?.replace("Bearer ", "")?.trim();
  if (!token) return false;
  // Untuk performa middleware (edge), kita cek format JWT saja (3 parts) tanpa verify signature
  // Verifikasi real dilakukan di getServerAuth() (introspect). Fail-open di middleware: ada token = allow, route akan 401 jika invalid
  return token.split(".").length === 3;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Allow file APIs with share token
  if (pathname.match(/^\/api\/files\/[^/]+\/(raw|download|content)/)) {
    const url = new URL(request.url);
    if (url.searchParams.has("token")) {
      return NextResponse.next();
    }
  }

  // Allow anonymous upload / create via an edit-shared public link. The
  // query token is REQUIRED — without it these routes still demand login.
  // Each route handler independently re-validates the token (existence,
  // expiry, "edit" permission, folder inside the shared tree), so this
  // bypass alone grants nothing.
  if (
    pathname === "/api/files/upload" ||
    pathname === "/api/files/upload-folder" ||
    pathname === "/api/files/create" ||
    pathname === "/api/folders"
  ) {
    const url = new URL(request.url);
    if (url.searchParams.has("token")) {
      return NextResponse.next();
    }
  }

  // SHELL — tiap app login sendiri (ala Google): Drive punya /login sendiri, tapi token pusat via ravaa-service
  const hasToken = await verifyShellAuth(request);
  if (!hasToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
