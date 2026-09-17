"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff, HardDrive, Loader2, Lock, Mail, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";

type LoginMode = "ravaa" | "legacy";

function getSafeRedirect(raw: string | null): string {
  if (!raw) return "/drive";
  // Only allow internal relative paths: must start with "/" and not "//", no scheme, no backslash
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes(":") || raw.includes("\\")) {
    return "/drive";
  }
  try {
    // Use URL to ensure it's same-origin and not external
    const url = new URL(raw, "http://localhost");
    // If raw contains origin (e.g. https://evil.com), pathname will be "/" and origin will differ
    if (url.origin !== "http://localhost") return "/drive";
    // Reconstruct safe path + search + hash
    return url.pathname + url.search + url.hash;
  } catch {
    return "/drive";
  }
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawFrom = searchParams.get("from");
  const from = getSafeRedirect(rawFrom);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const appName = "Ravaa Notes";
  const appLogo = "/logo.svg";
  const [mode, setMode] = useState<LoginMode>("ravaa");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [ravaaPassword, setRavaaPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRavaaPassword, setShowRavaaPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const togglePassword = useCallback(() => setShowPassword((p) => !p), []);
  const toggleRavaaPassword = useCallback(() => setShowRavaaPassword((p) => !p), []);
  const handleLegacySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!data.success) {
        setError(data.error || "Login failed");
        return;
      }
      router.replace(from);
      router.refresh();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRavaaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);
    setFieldErrors({});
    const newFieldErrors: Record<string, string> = {};
    if (!identifier.trim()) newFieldErrors.identifier = "Username atau email wajib diisi";
    if (!ravaaPassword) newFieldErrors.password = "Password wajib diisi";
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/ravaa/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password: ravaaPassword }),
      });
      const data = await response.json();
      if (!data.success) {
        if (data.details) {
          const mapped: Record<string, string> = {};
          for (const [k, v] of Object.entries(data.details as Record<string, string[]>)) {
            const key = k === "identifier" ? "identifier" : k === "currentPassword" ? "password" : k;
            mapped[key] = Array.isArray(v) ? v[0] : String(v);
          }
          if (mapped.identifier || mapped.password) {
            setFieldErrors(mapped);
            return;
          }
        }
        if (data.code === "RAVAA_USER_NOT_MAPPED") {
          setError("Login Ravaa tidak dapat digunakan untuk akun ini. Silakan hubungi administrator jika akun Anda seharusnya memiliki akses ke Ravaa Drive.");
          return;
        }
        if (data.code === "RAVAA_EMAIL_UNVERIFIED") {
          setError("Email Ravaa belum diverifikasi. Silakan verifikasi email di Ravaa Account terlebih dahulu.");
          return;
        }
        if (data.code === "RAVAA_IDENTITY_CONFLICT") {
          setError("Konflik identitas. Hubungi administrator.");
          return;
        }
        const msg = (data.error || "Login failed").toLowerCase();
        if (msg.includes("tidak ditemukan") || msg.includes("not found")) {
          setFieldErrors({ identifier: "Username atau email tidak ditemukan" });
          return;
        }
        if (msg.includes("password salah") || msg.includes("password")) {
          setFieldErrors({ password: "Password salah" });
          return;
        }
        setError(data.error || "Login failed");
        return;
      }
      router.replace(from);
      router.refresh();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputBase = cn(
    "w-full rounded-xl border pl-11 pr-4 py-3 text-sm transition-all duration-200",
    "focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500",
    isDark
      ? "bg-slate-900/60 border-slate-700/60 text-white placeholder-slate-500"
      : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
  );
  const inputError = "border-red-500 focus:border-red-500 focus:ring-red-500/60";

  return (
    <div
      className={cn(
        "w-full rounded-2xl sm:rounded-3xl border p-6 sm:p-8 shadow-xl backdrop-blur-xl",
        isDark ? "bg-slate-900/70 border-slate-700/50 shadow-black/30" : "bg-white/80 border-slate-200/60 shadow-slate-200/60"
      )}
    >
      <div className="mb-6 flex flex-col items-center gap-3 lg:hidden">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden">
          {appLogo ? (
            <img src={appLogo} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
              <HardDrive className="h-7 w-7 text-white" />
            </div>
          )}
        </div>
        <div className="text-center">
          <h1 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>{appName}</h1>
          <p className={cn("text-sm mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>Kelola catatan dengan satu akun Ravaa.</p>
        </div>
      </div>

      <div className="mb-6 hidden lg:block">
        <h1 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>Welcome back</h1>
        <p className={cn("text-sm mt-1", isDark ? "text-slate-400" : "text-slate-500")}>Sign in to access your notes</p>
      </div>

      {/* Drive login — tiap app login sendiri (ala Google), tapi token pusat via ravaa-service */}
      <p className={cn("text-xs mb-3 text-center", isDark ? "text-slate-400" : "text-slate-500")}>Login dengan akun Ravaa yang sama di semua aplikasi</p>
      <div className={cn("mb-6 flex rounded-xl p-1", isDark ? "bg-slate-800" : "bg-slate-100")}>
        <button
          type="button"
          onClick={() => {
            setMode("ravaa");
            setError(null);
            setFieldErrors({});
          }}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
            mode === "ravaa"
              ? isDark
                ? "bg-slate-700 text-white shadow"
                : "bg-white text-slate-900 shadow"
              : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-500 hover:text-slate-900"
          )}
        >
          <Shield className="h-4 w-4" />
          Ravaa Account
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("legacy");
            setError(null);
            setFieldErrors({});
          }}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
            mode === "legacy"
              ? isDark
                ? "bg-slate-700 text-white shadow"
                : "bg-white text-slate-900 shadow"
              : isDark
                ? "text-slate-400 hover:text-white"
                : "text-slate-500 hover:text-slate-900"
          )}
        >
          <User className="h-4 w-4" />
          Drive Legacy
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className={cn(
            "mb-5 flex items-start gap-2.5 rounded-xl border p-3 text-sm",
            isDark ? "bg-red-500/10 border-red-500/30 text-red-300" : "bg-red-50 border-red-200 text-red-600"
          )}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {mode === "ravaa" ? (
        <form onSubmit={handleRavaaSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="identifier" className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
              Email atau Username (Ravaa)
            </label>
            <div className="relative">
              <Mail className={cn("pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2", isDark ? "text-slate-500" : "text-slate-400")} />
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (fieldErrors.identifier) setFieldErrors((p) => ({ ...p, identifier: "" }));
                }}
                required
                autoFocus
                autoComplete="username"
                placeholder="admin atau admin@ravaa.my.id"
                className={cn(inputBase, fieldErrors.identifier && inputError, isDark ? "bg-slate-900/60" : "bg-white")}
              />
            </div>
            {fieldErrors.identifier && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.identifier}</p>}
          </div>

          <div>
            <label htmlFor="ravaa-password" className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
              Password (Ravaa)
            </label>
            <div className="relative">
              <Lock className={cn("pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2", isDark ? "text-slate-500" : "text-slate-400")} />
              <input
                id="ravaa-password"
                type={showRavaaPassword ? "text" : "password"}
                value={ravaaPassword}
                onChange={(e) => {
                  setRavaaPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: "" }));
                }}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className={cn(inputBase, "pr-12", fieldErrors.password && inputError, isDark ? "bg-slate-900/60" : "bg-white")}
              />
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  toggleRavaaPassword();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleRavaaPassword();
                  }
                }}
                aria-label={showRavaaPassword ? "Hide password" : "Show password"}
                className={cn(
                  "absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 transition-colors touch-manipulation",
                  isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                )}
              >
                {showRavaaPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
            {fieldErrors.password && <p className="mt-1.5 text-xs text-red-500">{fieldErrors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white",
              "bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/25",
              "transition-all duration-200 active:scale-[0.98] hover:from-blue-500 hover:to-indigo-500",
              "disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 touch-manipulation"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Masuk dengan Ravaa...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Masuk dengan Ravaa
              </>
            )}
          </button>

          <p className={cn("text-center text-xs", isDark ? "text-slate-500" : "text-slate-400")}>
            Hanya untuk akun terhubung (admin@ravaa.my.id). Akun belum terhubung? Hubungi administrator.
          </p>
        </form>
      ) : (
        <form onSubmit={handleLegacySubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="email" className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
              Email (Drive Legacy)
            </label>
            <div className="relative">
              <Mail className={cn("pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2", isDark ? "text-slate-500" : "text-slate-400")} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className={cn(inputBase, isDark ? "bg-slate-900/60" : "bg-white")}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-slate-200" : "text-slate-700")}>
              Password
            </label>
            <div className="relative">
              <Lock className={cn("pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2", isDark ? "text-slate-500" : "text-slate-400")} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className={cn(inputBase, "pr-12", isDark ? "bg-slate-900/60" : "bg-white")}
              />
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  togglePassword();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    togglePassword();
                  }
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className={cn(
                  "absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 transition-colors touch-manipulation",
                  isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                )}
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white",
              "bg-gradient-to-r from-slate-600 to-slate-700 shadow-lg",
              "transition-all duration-200 active:scale-[0.98] hover:from-slate-500 hover:to-slate-600",
              "disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 touch-manipulation"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in (Legacy)"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
