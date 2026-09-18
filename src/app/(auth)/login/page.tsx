import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-slate-200 bg-white/80 p-6 sm:p-8 shadow-xl dark:border-white/[0.04]/50 dark:bg-[#141414]/70">
          <div className="animate-pulse space-y-5">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-200 dark:bg-[#232323]" />
            <div className="mx-auto h-5 w-40 rounded-md bg-slate-200 dark:bg-[#232323]" />
            <div className="space-y-4 pt-2">
              <div className="h-4 w-16 rounded bg-slate-200 dark:bg-[#232323]" />
              <div className="h-11 rounded-xl bg-slate-200 dark:bg-[#232323]" />
              <div className="h-4 w-16 rounded bg-slate-200 dark:bg-[#232323]" />
              <div className="h-11 rounded-xl bg-slate-200 dark:bg-[#232323]" />
              <div className="h-12 rounded-xl bg-slate-200 dark:bg-[#232323]" />
            </div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
