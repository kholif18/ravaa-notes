"use client";

import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  /** Max width: sm = 24rem, md = 28rem, lg = 32rem */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function Modal({ children, onClose, size = "md", className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pointerDownTargetRef = useRef<EventTarget | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Track where pointer-down berasal — kalau mulai di dalam modal
  // (misal textarea, input, select) lalu pointer digeser keluar & dilepas
  // di overlay, modal TIDAK boleh tertutup.
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerDownTargetRef.current = e.target;
  }, []);

  // Close on backdrop click — hanya kalau pointer-down JUGA di overlay
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (
        e.target === overlayRef.current &&
        pointerDownTargetRef.current === overlayRef.current
      ) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <div
      ref={overlayRef}
      onPointerDown={handlePointerDown}
      onClick={handleBackdropClick}
      data-modal-overlay="true"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div
        className={cn(
          "bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full flex flex-col max-h-[90vh]",
          sizeClasses[size],
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Compact modal header with title and close button */
export function ModalHeader({
  title,
  subtitle,
  onClose,
  icon,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-400 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors shrink-0 ml-2"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/** Scrollable modal body */
export function ModalBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex-1 overflow-y-auto min-h-0", className)}>
      {children}
    </div>
  );
}

/** Compact modal footer */
export function ModalFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 px-4 py-2.5 border-t border-slate-700 shrink-0",
        className
      )}
    >
      {children}
    </div>
  );
}
