import { useState, useEffect, useRef } from "react";
import {
  Megaphone, CheckCircle2, AlertTriangle, Clock, Star,
  Bell, Loader2, Inbox, MessageSquare, FileText,
} from "lucide-react";
import { supabase, apiFetch } from "../lib/supabase";
import { DT, FT, withAlpha } from "./cinematic-tokens";

/* ─── Types ─── */
type NotifType = "announcement" | "approved" | "revision" | "deadline" | "grade" | "feedback";

interface Notification {
  id: number;
  type: NotifType;
  title: string;
  detail: string;
  time: string;
  read: boolean;
}

/* ─── Icon/Color per type (using DT tokens) ─── */
const TYPE_CONFIG: Record<NotifType, { icon: React.ReactNode; bg: string; color: string }> = {
  announcement: { icon: <Megaphone size={16} />, bg: DT.stiBlue, color: DT.textPri },
  approved: { icon: <CheckCircle2 size={16} />, bg: withAlpha(DT.success, 0.18), color: DT.success },
  revision: { icon: <AlertTriangle size={16} />, bg: withAlpha(DT.warning, 0.18), color: DT.warning },
  deadline: { icon: <Clock size={16} />, bg: withAlpha(DT.red, 0.18), color: DT.red },
  grade: { icon: <Star size={16} />, bg: withAlpha(DT.yellow, 0.18), color: DT.yellow },
  feedback: { icon: <MessageSquare size={16} />, bg: withAlpha(DT.blue, 0.18), color: DT.blue },
};

/* ─── Time formatting ─── */
function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ─── Use shared DT tokens (imported above) ─── */
const DS = DT;

/* ════════════════════════════════════════════
   Shared notification cache — single source of truth
   used by both NotificationCenter and useNotificationCount
   ════════════════════════════════════════════ */
type Listener = (n: Notification[]) => void;
const listeners = new Set<Listener>();
let cachedNotifs: Notification[] = [];
let pollTimer: ReturnType<typeof setInterval> | null = null;
let isFetching = false;

async function doFetch() {
  if (isFetching) return;          // dedupe concurrent calls
  isFetching = true;
  try {
    const { notifications } = await apiFetch<{ notifications: Notification[] }>(
      "/notifications",
    );
    cachedNotifs = notifications || [];
    listeners.forEach(l => l(cachedNotifs));
  } catch {
    // Silently ignore — network blips, component unmounts, etc.
  } finally {
    isFetching = false;
  }
}

function startPolling() {
  if (pollTimer) return;
  doFetch();
  pollTimer = setInterval(doFetch, 45000);
}

function stopPollingIfIdle() {
  if (listeners.size === 0 && pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function subscribe(fn: Listener) {
  listeners.add(fn);
  startPolling();
  fn(cachedNotifs); // give cached data immediately
  return () => { listeners.delete(fn); stopPollingIfIdle(); };
}

/* ─── Component ─── */
interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [notifs, setNotifs] = useState<Notification[]>(cachedNotifs);
  const [loading, setLoading] = useState(cachedNotifs.length === 0);
  const ref = useRef<HTMLDivElement>(null);

  /* Subscribe to shared cache */
  useEffect(() => {
    return subscribe((n) => { setNotifs(n); setLoading(false); });
  }, []);

  /* Refresh when panel opens */
  useEffect(() => { if (open) doFetch(); }, [open]);

  const unreadCount = notifs.filter((n) => !n.read).length;
  const filtered = tab === "unread" ? notifs.filter((n) => !n.read) : notifs;

  const markAllRead = async () => {
    // Optimistic update
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    cachedNotifs = cachedNotifs.map(n => ({ ...n, read: true }));
    listeners.forEach(l => l(cachedNotifs));
    try {
      await apiFetch("/notifications/read-all", { method: "PUT" });
    } catch { /* revert on next poll */ }
  };

  const markOneRead = async (id: number) => {
    // Optimistic
    const updated = cachedNotifs.map(n => n.id === id ? { ...n, read: true } : n);
    cachedNotifs = updated;
    setNotifs(updated);
    listeners.forEach(l => l(updated));
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PUT" });
    } catch { /* revert on next poll */ }
  };

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute top-[60px] right-0 z-50"
      style={{
        width: "380px",
        fontFamily: "var(--font-body)",
        animation: "notifSlideIn 200ms ease-out",
      }}
    >
      <style>{`
        @keyframes notifSlideIn {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="rounded-[20px] overflow-hidden" style={{
        background: `linear-gradient(180deg, ${DS.raised} 0%, ${DS.base} 100%)`,
        border: `1px solid ${DS.borderSub}`,
        boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
      }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${DS.borderHair}` }}>
          <div className="flex items-center gap-2">
            <Bell size={16} style={{ color: DS.blue }} />
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 700, color: DS.textPri }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 700, background: DS.blueDim, color: DS.blue }}>
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="transition cursor-pointer hover:opacity-80"
              style={{ fontSize: "12px", fontWeight: 600, color: DS.blue }}>
              Mark all read
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex" style={{ borderBottom: `1px solid ${DS.borderHair}` }}>
          {(["all", "unread"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-3 transition cursor-pointer relative"
              style={{ fontSize: "13px", fontWeight: tab === t ? 600 : 400, color: tab === t ? DS.blue : DS.textTer }}>
              {t === "all" ? "All" : `Unread (${unreadCount})`}
              {tab === t && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-t" style={{ background: DS.blue }} />
              )}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="py-12 px-5 text-center">
              <Loader2 size={24} className="animate-spin mx-auto" style={{ color: DS.blue }} />
              <p className="mt-2" style={{ fontSize: 13, color: DS.textTer }}>Loading...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 px-5 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: DS.blueDim }}>
                <CheckCircle2 size={24} style={{ color: DS.blue }} />
              </div>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: "15px", fontWeight: 700, color: DS.textPri }}>All caught up!</p>
              <p className="mt-1" style={{ fontSize: "13px", color: DS.textTer }}>No new notifications right now.</p>
            </div>
          ) : (
            filtered.map((n, i) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.announcement;
              return (
                <div key={n.id}
                  onClick={() => { if (!n.read) markOneRead(n.id); }}
                  className="flex items-start gap-3 px-5 py-3.5 transition cursor-pointer relative"
                  style={{
                    borderBottom: `1px solid ${DS.borderHair}`,
                    background: !n.read ? "rgba(77,143,255,0.04)" : "transparent",
                    animation: `notifRowIn 200ms ease-out ${i * 30}ms both`,
                  }}
                >
                  <style>{`
                    @keyframes notifRowIn {
                      from { opacity: 0; transform: translateX(8px); }
                      to { opacity: 1; transform: translateX(0); }
                    }
                  `}</style>

                  {/* Unread dot */}
                  {!n.read && (
                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: DS.blue }} />
                  )}

                  {/* Icon circle */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                    {cfg.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{
                      fontFamily: "var(--font-heading)", fontSize: "13px",
                      fontWeight: !n.read ? 700 : 600, color: DS.textPri,
                    }}>
                      {n.title}
                    </p>
                    <p className="line-clamp-2 mt-0.5" style={{ fontSize: "12px", lineHeight: 1.4, color: DS.textSec }}>
                      {n.detail}
                    </p>
                    <span style={{ fontSize: "11px", color: DS.textDis, marginTop: 2, display: "block" }}>
                      {timeAgo(n.time)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Hook to get unread count from anywhere ─── */
export function useNotificationCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    return subscribe((notifs) => {
      setCount(notifs.filter(n => !n.read).length);
    });
  }, []);

  return count;
}