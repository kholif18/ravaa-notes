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
  const trusted = process.env.TRUSTED_PROXY === "1" || process.env.CF_TRUSTED === "1";
  const proto = headers.get("x-forwarded-proto");
  if (proto) {
    if (!trusted) {
      // Jangan trust header jika tidak di belakang proxy tepercaya → cegah spoof
      return process.env.NODE_ENV === "production";
    }
    const first = proto.split(",")[0].trim().toLowerCase();
    if (first === "https") return true;
    if (first === "http") return false;
    return false;
  }
  return process.env.NODE_ENV === "production";
}