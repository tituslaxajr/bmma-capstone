/**
 * Shared UI primitives used across all portal pages.
 * Import these instead of copy-pasting into every file.
 */
import { useState, useRef, useEffect } from "react";
import type { ReactNode, CSSProperties, FocusEvent } from "react";
import { Loader2 } from "lucide-react";
import { DT, FT } from "../cinematic-tokens";

/* ═══ Intersection Observer Hook ═══ */
export function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ═══ Fade-In-Up Wrapper ═══ */
export function Fade({
  delay = 0,
  children,
  className = "",
}: {
  delay?: number;
  children: ReactNode;
  className?: string;
}) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        filter: visible ? "blur(0)" : "blur(4px)",
        transition: `all 450ms ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ═══ Common Styles ═══ */
export const cardBg = `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`;

export const inputStyle: CSSProperties = {
  background: DT.raised,
  border: `1px solid ${DT.borderDef}`,
  color: DT.textPri,
  fontSize: 13,
  fontFamily: FT.b,
  outline: "none",
  transition: "border-color 200ms",
  padding: "10px 14px",
  borderRadius: 12,
  width: "100%",
};

export const focusIn = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = DT.blue;
};
export const focusOut = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = DT.borderDef;
};

export const sectionBg: CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: `1px solid ${DT.borderHair}`,
  borderRadius: 12,
  padding: 16,
};

/* ═══ Standard Modal Backdrop ═══ */
export const modalBackdrop: CSSProperties = {
  background: "rgba(4,6,12,0.80)",
  backdropFilter: "blur(8px)",
};

/* ═══ Standard Page Heading ═══ */
export const pageHeading: CSSProperties = {
  fontFamily: FT.h,
  fontSize: "clamp(26px, 4vw, 32px)",
  fontWeight: 700,
  color: DT.textPri,
  letterSpacing: "-0.02em",
};

/* ═══ Full-Page Loading Spinner ═══ */
export function PageSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-32" style={{ fontFamily: FT.b }}>
      <Loader2 size={28} className="animate-spin" style={{ color: DT.blue }} />
      <span className="ml-3" style={{ fontSize: 14, color: DT.textSec }}>{label}</span>
    </div>
  );
}

/* ═══ Time Ago ═══ */
export function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}