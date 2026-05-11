import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Inbox,
  Loader2,
  Megaphone,
  MessageSquare,
  Star,
} from "lucide-react";
import { apiFetch } from "../lib/supabase";
import { DT, withAlpha } from "./cinematic-tokens";
import {
  type Notification,
  type NotifType,
  fetchNotifications,
  getCachedNotifications,
  subscribeNotifications,
  updateCachedNotifications,
} from "./notification-store";

const TYPE_CONFIG: Record<NotifType, { icon: React.ReactNode; bg: string; color: string }> = {
  announcement: { icon: <Megaphone size={16} />, bg: DT.stiBlue, color: DT.textPri },
  approved: { icon: <CheckCircle2 size={16} />, bg: withAlpha(DT.success, 0.18), color: DT.success },
  revision: { icon: <AlertTriangle size={16} />, bg: withAlpha(DT.warning, 0.18), color: DT.warning },
  deadline: { icon: <Clock size={16} />, bg: withAlpha(DT.red, 0.18), color: DT.red },
  grade: { icon: <Star size={16} />, bg: withAlpha(DT.yellow, 0.18), color: DT.yellow },
  feedback: { icon: <MessageSquare size={16} />, bg: withAlpha(DT.blue, 0.18), color: DT.blue },
};

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

const DS = DT;

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [notifs, setNotifs] = useState<Notification[]>(getCachedNotifications());
  const [loading, setLoading] = useState(getCachedNotifications().length === 0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return subscribeNotifications((next) => {
      setNotifs(next);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  const unreadCount = notifs.filter((notif) => !notif.read).length;
  const filtered = tab === "unread" ? notifs.filter((notif) => !notif.read) : notifs;

  const markAllRead = async () => {
    const updated = notifs.map((notif) => ({ ...notif, read: true }));
    setNotifs(updated);
    updateCachedNotifications(updated);
    try {
      await apiFetch("/notifications/read-all", { method: "PUT" });
    } catch {
      // Reverted by next fetch.
    }
  };

  const markOneRead = async (id: number) => {
    const updated = notifs.map((notif) => notif.id === id ? { ...notif, read: true } : notif);
    setNotifs(updated);
    updateCachedNotifications(updated);
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PUT" });
    } catch {
      // Reverted by next fetch.
    }
  };

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

      <div
        className="rounded-[20px] overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${DS.raised} 0%, ${DS.base} 100%)`,
          border: `1px solid ${DS.borderSub}`,
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${DS.borderHair}` }}>
          <div className="flex items-center gap-2">
            <Bell size={16} style={{ color: DS.blue }} />
            <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "16px", fontWeight: 700, color: DS.textPri }}>
              Notifications
            </h3>
            {unreadCount > 0 ? (
              <span className="px-1.5 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 700, background: DS.blueDim, color: DS.blue }}>
                {unreadCount}
              </span>
            ) : null}
          </div>
          {unreadCount > 0 ? (
            <button
              onClick={markAllRead}
              className="transition cursor-pointer hover:opacity-80"
              style={{ fontSize: "12px", fontWeight: 600, color: DS.blue }}
            >
              Mark all read
            </button>
          ) : null}
        </div>

        <div className="flex" style={{ borderBottom: `1px solid ${DS.borderHair}` }}>
          {(["all", "unread"] as const).map((currentTab) => (
            <button
              key={currentTab}
              onClick={() => setTab(currentTab)}
              className="flex-1 py-3 transition cursor-pointer relative"
              style={{
                fontSize: "13px",
                fontWeight: tab === currentTab ? 600 : 400,
                color: tab === currentTab ? DS.blue : DS.textTer,
              }}
            >
              {currentTab === "all" ? "All" : `Unread (${unreadCount})`}
              {tab === currentTab ? (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-t" style={{ background: DS.blue }} />
              ) : null}
            </button>
          ))}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="py-12 px-5 text-center">
              <Loader2 size={24} className="animate-spin mx-auto" style={{ color: DS.blue }} />
              <p className="mt-2" style={{ fontSize: 13, color: DS.textTer }}>Loading...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 px-5 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: DS.blueDim }}>
                <Inbox size={24} style={{ color: DS.blue }} />
              </div>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: "15px", fontWeight: 700, color: DS.textPri }}>All caught up!</p>
              <p className="mt-1" style={{ fontSize: "13px", color: DS.textTer }}>No new notifications right now.</p>
            </div>
          ) : (
            filtered.map((notif, index) => {
              const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.announcement;
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.read) markOneRead(notif.id);
                  }}
                  className="flex items-start gap-3 px-5 py-3.5 transition cursor-pointer relative"
                  style={{
                    borderBottom: `1px solid ${DS.borderHair}`,
                    background: !notif.read ? "rgba(77,143,255,0.04)" : "transparent",
                    animation: `notifRowIn 200ms ease-out ${index * 30}ms both`,
                  }}
                >
                  <style>{`
                    @keyframes notifRowIn {
                      from { opacity: 0; transform: translateX(8px); }
                      to { opacity: 1; transform: translateX(0); }
                    }
                  `}</style>

                  {!notif.read ? (
                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: DS.blue }} />
                  ) : null}

                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                    {cfg.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="truncate"
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "13px",
                        fontWeight: !notif.read ? 700 : 600,
                        color: DS.textPri,
                      }}
                    >
                      {notif.title}
                    </p>
                    <p className="line-clamp-2 mt-0.5" style={{ fontSize: "12px", lineHeight: 1.4, color: DS.textSec }}>
                      {notif.detail}
                    </p>
                    <span style={{ fontSize: "11px", color: DS.textDis, marginTop: 2, display: "block" }}>
                      {timeAgo(notif.time)}
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
