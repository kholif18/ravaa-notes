// @ts-nocheck
/**
 * Ravaa Service — Token Verification (Phase 7.3)
 * Server-only helper untuk memvalidasi Ravaa access token di Ravaa Drive.
 *
 * Strategi: Introspection via Ravaa Service `GET /api/v1/me`
 * - Tidak perlu share JWT secret antar service
 * - Memanfaatkan authMiddleware Ravaa Service yang sudah mengecek:
 *   issuer, audience, expiration, session revoked, user isActive
 * - Drive hanya forward Bearer token ke Ravaa Service
 *
 * Jangan import di Client Components.
 */

import { getRavaaServiceUrl, isRavaaServiceConfigured } from "./ravaa-service";

export type RavaaUser = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RavaaVerifyResult =
  | { valid: true; user: RavaaUser; raw: unknown }
  | { valid: false; error: string; status: number };

function assertServerOnly() {
  if (typeof window !== "undefined") {
    throw new Error("ravaa-auth is server-only");
  }
}

/**
 * Ekstrak Ravaa token dari Request.
 * Prioritas: Authorization Bearer > cookie "ravaa_token" > cookie "token" (fallback jika Drive sudah pakai Ravaa token di cookie token)
 */
export function extractRavaaToken(request: Request | { headers: Headers; cookies?: any }): string | null {
  assertServerOnly();

  // Headers
  const headers = (request as any).headers as Headers;
  if (headers) {
    const auth = headers.get("authorization") || headers.get("Authorization");
    if (auth?.startsWith("Bearer ")) {
      const t = auth.slice(7).trim();
      if (t) return t;
    }
  }

  // NextRequest cookies (Next.js)
  const cookies = (request as any).cookies;
  if (cookies && typeof cookies.get === "function") {
    // cek ravaa_token dulu, lalu token (jika Drive sudah migrasi)
    const ravaa = cookies.get("ravaa_token")?.value;
    if (ravaa) return ravaa;
    // fallback: cek token jika isinya Ravaa JWT (akan di-verify, gagal cepat jika Drive JWT)
    // tapi kita tidak menebak — hanya jika header tidak ada
  }

  return null;
}

/**
 * Verifikasi Ravaa access token via introspection.
 * Melakukan fetch ke Ravaa Service GET /api/v1/me dengan Bearer token.
 * Return valid:true jika 200, valid:false jika 401/403/500 atau network error.
 *
 * Tidak pernah log token atau Authorization header.
 */
export async function verifyRavaaToken(token: string): Promise<RavaaVerifyResult> {
  assertServerOnly();

  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return { valid: false, error: "Token required", status: 401 };
  }

  if (!isRavaaServiceConfigured()) {
    return { valid: false, error: "Ravaa Service not configured (RAVAA_SERVICE_URL/CLIENT_ID/SECRET)", status: 503 };
  }

  const url = `${getRavaaServiceUrl()}/api/v1/me`;

  // Timeout 5s agar tidak hang
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (res.ok) {
      const data = (await res.json()) as { user: RavaaUser };
      if (!data.user || !data.user.id) {
        return { valid: false, error: "Invalid response from Ravaa Service", status: 502 };
      }
      return { valid: true, user: data.user, raw: data };
    }

    // Ravaa Service mengembalikan 401 untuk invalid/expired/revoked, 423 untuk locked
    const text = await res.text().catch(() => "");
    let message = `Ravaa Service rejected token (${res.status})`;
    try {
      const j = JSON.parse(text);
      if (j?.error?.message) message = j.error.message;
      else if (j?.error?.code) message = j.error.code;
    } catch {
      // ignore
    }

    return { valid: false, error: message, status: res.status };
  } catch (e: any) {
    if (e?.name === "AbortError") {
      return { valid: false, error: "Ravaa Service timeout", status: 504 };
    }
    return { valid: false, error: "Failed to reach Ravaa Service", status: 502 };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Helper untuk API Route Drive yang ingin mendukung kedua auth:
 * 1. Coba Ravaa token dulu (jika ada)
 * 2. Fallback ke legacy Drive token (lib/auth.ts getServerAuth)
 *
 * Return Ravaa user jika valid, atau legacy user, atau null.
 */
export async function getServerAuthWithRavaa(request: Request): Promise<
  | { source: "ravaa"; user: RavaaUser }
  | { source: "legacy"; user: import("./auth").AuthUser }
  | { source: "none"; user: null }
> {
  assertServerOnly();

  const ravaaToken = extractRavaaToken(request);
  if (ravaaToken) {
    const result = await verifyRavaaToken(ravaaToken);
    if (result.valid) {
      return { source: "ravaa", user: result.user };
    }
    // jika Ravaa token ada tapi invalid, jangan fallback ke legacy (security: token yang dikirim adalah Ravaa, bukan Drive)
    // tapi untuk Phase 7.3 (dual auth), kita fallback hanya jika tidak ada Ravaa token sama sekali
    // jadi jika ada Ravaa token tapi invalid → treat as unauthenticated
    return { source: "none", user: null };
  }

  // Fallback legacy Drive
  try {
    const { getServerAuth } = await import("./auth");
    // getServerAuth reads cookies/headers itself, but we already extracted Ravaa token
    // untuk konsistensi, panggil tanpa argumen (akan baca cookies/headers lagi)
    const legacyUser = await (getServerAuth as any)();
    if (legacyUser) {
      return { source: "legacy", user: legacyUser };
    }
  } catch {
    // ignore
  }

  return { source: "none", user: null };
}
