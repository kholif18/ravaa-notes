"use client";

import { useState, useRef, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/providers/theme-provider";

const MenuCloseContext = createContext<(() => void) | null>(null);

const MENU_WIDTH = 144; // w-36
const MENU_MARGIN = 8; // min distance from viewport edges

/**
 * Shared fixed-position menu container with outside-click and scroll close.
 * Used by both `ContextMenu` (trigger-based) and `MenuAt` (cursor-based).
 */
function MenuPanel({
  onClose,
  children,
  className,
  style,
}: {
  onClose: () => void;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleScroll() {
      onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  return (
    <MenuCloseContext.Provider value={onClose}>
      <div
        ref={menuRef}
        className={cn(
          "fixed z-[100] w-36 rounded-xl py-1.5 border backdrop-blur-xl",
          isDark
            ? "bg-slate-800/70 border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            : "bg-white/70 border-slate-200/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
          className
        )}
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </MenuCloseContext.Provider>
  );
}

interface ContextMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ContextMenu({ trigger, children, className }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const menuHeight = menuRef.current?.offsetHeight || 200;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    const shouldFlip = spaceBelow < menuHeight + 8 && spaceAbove > spaceBelow;

    const top = shouldFlip ? rect.top - menuHeight - 4 : rect.bottom + 4;
    let left = rect.left;
    // Prevent overflow right edge
    if (left + MENU_WIDTH > viewportWidth - MENU_MARGIN) {
      left = viewportWidth - MENU_WIDTH - MENU_MARGIN;
    }
    // Prevent overflow left edge
    if (left < MENU_MARGIN) {
      left = MENU_MARGIN;
    }
    setCoords({ top, left });
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => updatePosition());
    }
  }, [open, updatePosition]);

  const closeMenu = useCallback(() => setOpen(false), []);

  return (
    <div
      ref={triggerRef}
      className="inline-flex"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
    >
      {trigger}
      {open && (
        <MenuPanel onClose={closeMenu} className={className} style={{ top: coords.top, left: coords.left }}>
          <div ref={menuRef}>{children}</div>
        </MenuPanel>
      )}
    </div>
  );
}

interface MenuAtProps {
  /** Cursor/touch coordinates in viewport space. */
  x: number;
  y: number;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Menu rendered at fixed coordinates (right-click cursor or long-press touch
 * point), clamped to the viewport so it never overflows the screen.
 */
export function MenuAt({ x, y, onClose, children, className }: MenuAtProps) {
  const [coords, setCoords] = useState({ top: y, left: x });

  // Clamp after the menu has been laid out (rAF → measure → clamp).
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const el = document.getElementById("ravaa-menu-at") as HTMLDivElement | null;
      const width = el?.offsetWidth || MENU_WIDTH;
      const height = el?.offsetHeight || 200;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      setCoords({
        top: Math.min(y, Math.max(MENU_MARGIN, viewportHeight - height - MENU_MARGIN)),
        left: Math.min(x, Math.max(MENU_MARGIN, viewportWidth - width - MENU_MARGIN)),
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [x, y]);

  return (
    <MenuPanel
      onClose={onClose}
      className={className}
      style={{ top: coords.top, left: coords.left }}
    >
      <div id="ravaa-menu-at">{children}</div>
    </MenuPanel>
  );
}

interface ContextMenuItemProps {
  onClick: () => void;
  children: ReactNode;
  variant?: "default" | "danger";
  className?: string;
}

export function ContextMenuItem({ onClick, children, variant = "default", className }: ContextMenuItemProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const closeMenu = useContext(MenuCloseContext);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        onClick();
        closeMenu?.();
      }}
      className={cn(
        "w-[calc(100%-8px)] mx-1 px-3 py-1.5 text-left text-xs flex items-center gap-2 rounded-lg transition-colors",
        variant === "danger"
          ? "text-red-400 hover:bg-red-500/10"
          : isDark
          ? "text-slate-300 hover:bg-white/10"
          : "text-slate-600 hover:bg-black/5",
        className
      )}
    >
      {children}
    </button>
  );
}