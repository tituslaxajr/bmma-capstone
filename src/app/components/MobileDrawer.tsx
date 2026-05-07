import { useEffect, useRef, useCallback } from "react";
import { X, LogOut } from "lucide-react";
import { withAlpha } from "./cinematic-tokens";

interface DrawerItem { icon: React.ReactNode; label: string; }
interface DrawerSection { label: string | null; items: number[]; }

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  role: string;
  avatarUrl?: string;
  items: DrawerItem[];
  sections: DrawerSection[];
  activeIndex: number;
  onNavigate: (index: number) => void;
  onLogout: () => void;
  badges?: Record<number, number>;
}

const ROLE_ACCENT: Record<string, string> = {
  Student: "#4D8FFF",
  Panelist: "#A78BFA",
  Adviser: "#4ADE80",
  Coordinator: "#F87171",
};

export function MobileDrawer({
  open, onClose, userName, role, avatarUrl, items, sections, activeIndex, onNavigate, onLogout, badges,
}: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const accent = ROLE_ACCENT[role] ?? "#4D8FFF";

  /* ── Body scroll lock ── */
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  /* ── Focus management: capture trigger, focus drawer on open, restore on close ── */
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
      requestAnimationFrame(() => {
        drawerRef.current?.focus();
      });
    } else if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [open]);

  /* ── Escape key ── */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /* ── Focus trap ── */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !drawerRef.current) return;

    const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ background: "rgba(4,6,12,0.70)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${role} navigation menu`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`fixed top-0 left-0 bottom-0 z-50 w-[280px] flex flex-col transition-transform duration-300 ease-out outline-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ fontFamily: "var(--font-body)", background: "#0C0F1A", borderRight: "1px solid rgba(255,255,255,0.06)", boxShadow: open ? "0 0 60px rgba(0,0,0,0.5)" : "none" }}
      >
        {/* Header / User card */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: accent }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 700, color: "#07090F" }}>
                  {userName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </span>
              )}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 700, color: "#EEF0F6" }}>
                {userName}
              </div>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full"
                style={{ fontSize: "11px", fontWeight: 500, background: withAlpha(accent, 0.08), color: accent }}
              >
                {role}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-lg transition cursor-pointer hover:bg-[rgba(255,255,255,0.05)]"
            style={{ color: "rgba(238,240,246,0.45)" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label={`${role} navigation`}>
          {sections.map((section, si) => (
            <div key={si} role="group" aria-label={section.label || undefined}>
              {section.label && (
                <div className="px-3 pt-4 pb-1" aria-hidden="true">
                  <span style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(238,240,246,0.30)" }}>
                    {section.label}
                  </span>
                </div>
              )}
              {section.items.map((idx) => {
                const item = items[idx];
                if (!item) return null;
                const active = idx === activeIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => { onNavigate(idx); onClose(); }}
                    aria-current={active ? "page" : undefined}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer mb-0.5"
                    style={{
                      background: active ? withAlpha(accent, 0.07) : "transparent",
                      color: active ? accent : "rgba(238,240,246,0.55)",
                    }}
                  >
                    <span aria-hidden="true" style={{ color: active ? accent : "rgba(238,240,246,0.45)" }}>{item.icon}</span>
                    <span style={{ fontSize: "14px", fontWeight: active ? 600 : 400 }}>{item.label}</span>
                    {badges?.[idx] && badges[idx] > 0 ? (
                      <span
                        className="ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5"
                        style={{ fontSize: "11px", fontWeight: 700, background: withAlpha(accent, 0.12), color: accent }}
                        aria-label={`${badges[idx]} notification${badges[idx] > 1 ? "s" : ""}`}
                      >
                        {badges[idx]}
                      </span>
                    ) : active ? (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: accent }} aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => { onLogout(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer"
            style={{ color: "#F87171" }}
          >
            <LogOut size={18} aria-hidden="true" />
            <span style={{ fontSize: "14px", fontWeight: 500 }}>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
