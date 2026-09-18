"use client";

import { HardDrive, ShieldCheck, Share2, Wifi } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Hardcoded branding for personal use
  const appLogo = "/logo.svg";

  const features = [
    {
      icon: ShieldCheck,
      title: "Private by design",
      description: "Your files stay on your own server.",
    },
    {
      icon: Share2,
      title: "Share with ease",
      description: "Granular access for users and public links.",
    },
    {
      icon: Wifi,
      title: "Access anywhere",
      description: "Works from desktop and mobile browsers.",
    },
  ];

  return (
    <div
      className={cn(
        "relative min-h-dvh w-full overflow-y-auto",
        isDark ? "bg-[#0A0A0A]" : "bg-slate-50"
      )}
    >
      {/* Decorative background orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className={cn(
            "absolute -top-40 -left-32 h-96 w-96 rounded-full blur-3xl",
            isDark ? "bg-blue-600/25" : "bg-blue-400/30"
          )}
        />
        <div
          className={cn(
            "absolute -bottom-48 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl",
            isDark ? "bg-purple-600/20" : "bg-purple-400/25"
          )}
        />
        <div
          className={cn(
            "absolute top-1/3 right-1/4 h-72 w-72 rounded-full blur-3xl",
            isDark ? "bg-cyan-500/15" : "bg-cyan-300/20"
          )}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-dvh w-full">
        <div className="m-auto grid w-full max-w-5xl items-center gap-10 p-4 sm:p-6 lg:grid-cols-2 lg:gap-16 lg:p-10">
          {/* Branding panel — desktop only */}
          <div className="hidden lg:flex flex-col gap-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden">
                {appLogo ? (
                  <img src={appLogo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
                    <HardDrive className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
              <span
                className={cn(
                  "text-2xl font-bold tracking-tight",
                  isDark ? "text-white" : "text-white"
                )}
              >
                Ravaa Drive
              </span>
            </div>

            <h1
              className={cn(
                "text-4xl font-bold leading-tight tracking-tight",
                isDark ? "text-white" : "text-white"
              )}
            >
              Your personal cloud,
              <span className="block bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                on your own server.
              </span>
            </h1>

            <p
              className={cn(
                "text-base leading-relaxed",
                isDark ? "text-zinc-400" : "text-zinc-500"
              )}
            >
              Store, organize, and share files with full control over your data.
            </p>

            <ul className="space-y-4">
              {features.map((feature) => (
                <li key={feature.title} className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      isDark
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-blue-500/10 text-blue-600"
                    )}
                  >
                    <feature.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        isDark ? "text-zinc-200" : "text-zinc-200"
                      )}
                    >
                      {feature.title}
                    </p>
                    <p
                      className={cn(
                        "text-sm",
                        isDark ? "text-zinc-500" : "text-zinc-500"
                      )}
                    >
                      {feature.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Form panel */}
          <div className="w-full max-w-md mx-auto lg:mx-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
