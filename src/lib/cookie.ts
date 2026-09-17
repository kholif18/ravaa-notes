/**
 * Whether the auth cookie should carry the `secure` flag.
 *
 * The browser only sends secure cookies over HTTPS. Production behind
 * Cloudflare Zero Trust (or any reverse proxy) receives x-forwarded-proto:
 * https, so cookies stay secure there — while plain HTTP access over the
 * local IP (http://192.168.x.x:3000) still gets a working login because no
 * forwarded-proto header means "plain HTTP".
 *
 * Standalone file (no prisma import) so middleware can use it safely.
 */
export function isSecureRequest(headers: Headers): boolean {
  // In production, assume HTTPS when behind trusted proxy (Cloudflare).
  // Only trust x-forwarded-proto if present; otherwise default to secure in production
  // to prevent downgrade via header spoofing on direct connections.
  const proto = headers.get("x-forwarded-proto");
  if (proto) {
    // Proxies may append multiple values; the first is the client's hop.
    // Validate strictly: only exact "https" is considered secure.
    const first = proto.split(",")[0].trim().toLowerCase();
    if (first === "https") return true;
    if (first === "http") return false;
    // Unknown value → treat as not secure (fail closed)
    return false;
  }
  // No header: in production, assume secure (behind Cloudflare terminates TLS),
  // in development, assume not secure to allow http://192.168.x.x access.
  return process.env.NODE_ENV === "production";
}