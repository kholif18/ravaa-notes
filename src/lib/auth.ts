export async function getUserFromRavaa(token: string) {
  const url = (process.env.RAVAA_SERVICE_URL || "http://localhost:3000").replace(/\/$/, "");
  const res = await fetch(`${url}/api/v1/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.user || null;
}
export function getTokenFromHeader(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/ravaa_token=([^;]+)/);
  if (m) return decodeURIComponent(m[1]);
  return null;
}
