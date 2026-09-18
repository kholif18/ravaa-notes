"use client";
import { useState, useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "default";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Hapus",
  cancelText = "Batal",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0A0A0A]/60 backdrop-blur-md" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border bg-white/10 dark:bg-[#1A1A1A]/40 backdrop-blur-xl border-white/20 dark:border-white/[0.04]/50 shadow-2xl p-6 animate-in fade-in zoom-in-95">
        <button onClick={onCancel} className="absolute right-3 top-3 p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${variant === "danger" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}`}>
            {variant === "danger" ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">{title}</h3>
            {description && <p className="text-sm text-zinc-400 mt-1">{description}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm rounded-xl border border-white/[0.04] bg-white/5 hover:bg-white/10 text-white disabled:opacity-50">
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm rounded-xl font-medium disabled:opacity-50 flex items-center gap-2 ${variant === "danger" ? "bg-red-500/90 hover:bg-red-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
          >
            {loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

interface PromptDialogProps {
  open: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({ open, title, placeholder, defaultValue = "", confirmText = "Buat", cancelText = "Batal", onSubmit, onCancel }: PromptDialogProps) {
  const [value, setValue] = useState("");
  useEffect(() => { if (open) setValue(defaultValue); }, [open, defaultValue]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0A0A0A]/60 backdrop-blur-md" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border bg-white/10 dark:bg-[#1A1A1A]/40 backdrop-blur-xl border-white/20 dark:border-white/[0.04]/50 shadow-2xl p-6">
        <h3 className="font-semibold text-white">{title}</h3>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSubmit(value); if (e.key === "Escape") onCancel(); }}
          placeholder={placeholder}
          className="mt-3 w-full px-3 py-2.5 rounded-xl border bg-white/5 border-white/[0.04] text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-xl border border-white/[0.04] bg-white/5 hover:bg-white/10 text-white">Batal</button>
          <button onClick={() => onSubmit(value)} disabled={!value.trim()} className="px-4 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">Buat</button>
        </div>
      </div>
    </div>
  );
}
