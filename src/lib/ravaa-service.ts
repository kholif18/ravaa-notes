/**
 * Ravaa Service — Central Authentication Configuration
 * Phase 7.2: Application Registration (server-only)
 *
 * Jangan import file ini di Client Components.
 * Client secret tidak boleh masuk browser bundle.
 */

export type RavaaServiceConfig = {
  url: string;
  clientId: string;
  clientSecret: string;
};

function assertServerOnly() {
  if (typeof window !== "undefined") {
    throw new Error("ravaa-service config is server-only — do not import in Client Components");
  }
}

/**
 * Apakah Ravaa Service sudah terkonfigurasi (semua env ada)?
 * Aman untuk dipanggil di server saja. Tidak log secret.
 */
export function isRavaaServiceConfigured(): boolean {
  assertServerOnly();
  const url = process.env.RAVAA_SERVICE_URL;
  const clientId = process.env.RAVAA_CLIENT_ID;
  const clientSecret = process.env.RAVAA_CLIENT_SECRET;
  return Boolean(url && clientId && clientSecret);
}

/**
 * Ambil konfigurasi Ravaa Service.
 * Throw jika env belum lengkap — jangan fallback ke default agar misconfig cepat ketahuan.
 * Tidak pernah mengembalikan secret ke client atau menulisnya ke log.
 */
export function getRavaaServiceConfig(): RavaaServiceConfig {
  assertServerOnly();

  const url = process.env.RAVAA_SERVICE_URL?.trim();
  const clientId = process.env.RAVAA_CLIENT_ID?.trim();
  const clientSecret = process.env.RAVAA_CLIENT_SECRET?.trim();

  if (!url) {
    throw new Error("RAVAA_SERVICE_URL is not set. Set it in .env (e.g. http://localhost:2711)");
  }
  if (!clientId) {
    throw new Error("RAVAA_CLIENT_ID is not set. Register application via Ravaa Service first.");
  }
  if (!clientSecret) {
    throw new Error("RAVAA_CLIENT_SECRET is not set. Check .env — secret is server-only.");
  }

  // Validasi URL format ringan
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    throw new Error(`RAVAA_SERVICE_URL is not a valid URL: ${url}`);
  }

  return { url, clientId, clientSecret };
}

/**
 * Hanya URL — untuk health check atau fetch tanpa secret.
 */
export function getRavaaServiceUrl(): string {
  assertServerOnly();
  const url = process.env.RAVAA_SERVICE_URL?.trim();
  if (!url) throw new Error("RAVAA_SERVICE_URL is not set");
  return url.replace(/\/$/, "");
}
