"use client";

import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = red confirm button (destructive), default = blue. */
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

/** Styled replacement for the browser's native `confirm()` dialog. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <Modal onClose={onCancel} size="sm">
      <ModalHeader
        title={title}
        onClose={onCancel}
        icon={<AlertTriangle className="w-4 h-4 text-amber-400" />}
      />
      <ModalBody className="px-4 py-3">
        {description && (
          <p className="text-sm text-slate-300 leading-relaxed">{description}</p>
        )}
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className={cn(
            "px-3 py-1.5 text-sm text-white rounded-lg transition-colors",
            variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
          )}
        >
          {confirmLabel}
        </button>
      </ModalFooter>
    </Modal>
  );
}