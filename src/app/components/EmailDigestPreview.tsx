import { useState, useEffect, useCallback } from "react";
import {
  Mail, Eye, Loader2, RefreshCw, Users, Send, Copy,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, X,
  Zap, Clock, PlayCircle, MailCheck,
} from "lucide-react";
import { DT, FT } from "./cinematic-tokens";
import { supabase, apiFetch } from "../lib/supabase";
import { toast } from "sonner";

/* ═══════════════════════════════════════════
   EMAIL DIGEST PREVIEW
   For coordinators to preview & manage notification emails
   ═══════════════════════════════════════════ */

interface UserDigest {
  userId: string;
  name: string;
  email: string;
  role: string;
  unreadCount: number;
}

interface DigestStatus {
  userId: string;
  name: string;
  email: string;
  lastSent: { sentAt: string; type: string; notifCount: number } | null;
}

export function EmailDigestPreview() {
  const [users, setUsers] = useState<UserDigest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserDigest | null>(null);
  const [emailHtml, setEmailHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [digestType, setDigestType] = useState<"daily" | "weekly">("daily");
  const [showPreview, setShowPreview] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [digestStatuses, setDigestStatuses] = useState<DigestStatus[]>([]);
  const [showCronInfo, setShowCronInfo] = useState(false);

  /* Fetch users with their notification counts */
  const fetchUsers = useCallback(async () => {
    try {
      const [usersRes, statusRes] = await Promise.all([
        apiFetch<{ users: any[] }>("/users"),
        apiFetch<{ statuses: DigestStatus[] }>("/email-digest/status").catch(() => ({ statuses: [] })),
      ]);

      const allUsers = (usersRes.users || []).map((u: any) => ({
        userId: u.id,
        name: u.name || u.email?.split("@")[0] || "Unknown",
        email: u.email || "",
        role: u.role || "student",
        unreadCount: 0,
      }));

      setUsers(allUsers.sort((a: UserDigest, b: UserDigest) => a.name.localeCompare(b.name)));
      setDigestStatuses(statusRes.statuses || []);
    } catch (err) {
      console.error("Failed to fetch users for digest:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  /* Generate preview for a specific user */
  const generatePreview = useCallback(async (user: UserDigest) => {
    setSelectedUser(user);
    setPreviewLoading(true);
    setShowPreview(true);
    try {
      const res = await apiFetch<{ html: string; notificationCount: number }>(
        `/email-digest/user/${user.userId}?type=${digestType}`,
      );
      setEmailHtml(res.html);
    } catch (err: any) {
      console.error("Failed to generate email preview:", err);
      toast.error("Failed to generate email preview");
      setEmailHtml("");
    } finally {
      setPreviewLoading(false);
    }
  }, [digestType]);

  /* Generate own preview */
  const generateOwnPreview = useCallback(async () => {
    setSelectedUser(null);
    setPreviewLoading(true);
    setShowPreview(true);
    try {
      const res = await apiFetch<{ html: string; notificationCount: number }>(
        `/email-digest/preview?type=${digestType}`,
      );
      setEmailHtml(res.html);
    } catch (err: any) {
      console.error("Failed to generate own email preview:", err);
      toast.error("Failed to generate preview");
      setEmailHtml("");
    } finally {
      setPreviewLoading(false);
    }
  }, [digestType]);

  /* Send digest to a single user */
  const sendToUser = useCallback(async (user: UserDigest) => {
    setSendingUserId(user.userId);
    try {
      const res = await apiFetch<{ sent: boolean; recipientEmail?: string; notifCount?: number; error?: string }>(
        "/email-digest/send",
        { method: "POST", body: JSON.stringify({ userId: user.userId, digestType }) },
      );
      if (res.sent) {
        toast.success(`Digest sent to ${user.name} (${res.recipientEmail})`);
        fetchUsers(); // refresh statuses
      } else {
        toast.error(res.error || "Failed to send");
      }
    } catch (err: any) {
      console.error("Failed to send digest:", err);
      toast.error(err.message || "Failed to send digest email");
    } finally {
      setSendingUserId(null);
    }
  }, [digestType, fetchUsers]);

  /* Send to all users with unread */
  const sendToAll = useCallback(async () => {
    setSendingAll(true);
    try {
      const res = await apiFetch<{ sentCount: number; failedCount: number; total: number }>(
        "/email-digest/send-all",
        { method: "POST", body: JSON.stringify({ digestType }) },
      );
      toast.success(`Sent ${res.sentCount} digest emails (${res.failedCount} failed)`);
      fetchUsers();
    } catch (err: any) {
      console.error("Failed to send batch digest:", err);
      toast.error(err.message || "Failed to send batch digest");
    } finally {
      setSendingAll(false);
    }
  }, [digestType, fetchUsers]);

  const copyHtml = () => {
    navigator.clipboard.writeText(emailHtml);
    setCopiedHtml(true);
    toast.success("HTML copied to clipboard");
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  /* Send from preview modal */
  const sendFromPreview = useCallback(async () => {
    if (!selectedUser) return;
    setSendingUserId(selectedUser.userId);
    await sendToUser(selectedUser);
  }, [selectedUser, sendToUser]);

  const getLastSent = (userId: string) => {
    const s = digestStatuses.find((d) => d.userId === userId);
    if (!s?.lastSent?.sentAt) return null;
    return s.lastSent;
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const roleColors: Record<string, string> = {
    student: DT.blue,
    panelist: DT.purple,
    coordinator: DT.red,
  };

  return (
    <div className="space-y-5" style={{ fontFamily: FT.b }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
              background: "rgba(77,143,255,0.10)",
              border: "1px solid rgba(77,143,255,0.15)",
            }}>
              <Mail size={20} style={{ color: DT.blue }} />
            </div>
            <div>
              <h2 style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri }}>
                Email Digest Management
              </h2>
              <p style={{ fontSize: 13, color: DT.textTer }}>
                Preview, send, and schedule notification email digests
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Digest type toggle */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${DT.borderDef}` }}>
            {(["daily", "weekly"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setDigestType(t)}
                className="px-4 py-2 transition cursor-pointer"
                style={{
                  fontSize: 12, fontWeight: 600,
                  background: digestType === t ? DT.blueDim : "transparent",
                  color: digestType === t ? DT.blue : DT.textTer,
                }}
              >
                {t === "daily" ? "Daily" : "Weekly"}
              </button>
            ))}
          </div>

          <button
            onClick={generateOwnPreview}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90"
            style={{ background: DT.blueDim, color: DT.blue, fontSize: 12, fontWeight: 600, border: `1px solid rgba(77,143,255,0.15)` }}
          >
            <Eye size={14} /> Preview Mine
          </button>

          <button
            onClick={sendToAll}
            disabled={sendingAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90 disabled:opacity-50"
            style={{ background: DT.blue, color: "white", fontSize: 12, fontWeight: 600, fontFamily: FT.h }}
          >
            {sendingAll ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {sendingAll ? "Sending..." : "Send All Digests"}
          </button>
        </div>
      </div>

      {/* CRON Setup Info Card */}
      <div className="rounded-2xl overflow-hidden" style={{
        background: `linear-gradient(135deg, rgba(77,143,255,0.06) 0%, rgba(139,92,246,0.04) 100%)`,
        border: `1px solid rgba(77,143,255,0.12)`,
      }}>
        <button
          onClick={() => setShowCronInfo(!showCronInfo)}
          className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
              background: DT.purpleDim,
              border: `1px solid rgba(139,92,246,0.15)`,
            }}>
              <Zap size={15} style={{ color: DT.purple }} />
            </div>
            <div className="text-left">
              <span style={{ fontSize: 13, fontWeight: 700, color: DT.textPri }}>Automated CRON Digest</span>
              <span className="ml-2 px-2 py-0.5 rounded-full" style={{
                fontSize: 9, fontWeight: 700,
                background: DT.successDim,
                color: DT.success,
                border: `1px solid rgba(74,222,128,0.15)`,
              }}>
                READY
              </span>
            </div>
          </div>
          {showCronInfo ? <ChevronUp size={16} style={{ color: DT.textDis }} /> : <ChevronDown size={16} style={{ color: DT.textDis }} />}
        </button>

        {showCronInfo && (
          <div className="px-5 pb-5 space-y-3">
            <div className="rounded-xl p-4 space-y-2" style={{
              background: DT.elevated,
              border: `1px solid ${DT.borderHair}`,
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: DT.textSec }}>
                The CRON endpoint is ready. Set up an external scheduler (e.g., cron-job.org, Supabase CRON, or GitHub Actions) to call:
              </p>
              <div className="rounded-lg p-3 font-mono" style={{ background: DT.dark, border: `1px solid ${DT.borderHair}` }}>
                <p style={{ fontSize: 11, color: DT.blue, wordBreak: "break-all" }}>
                  POST /functions/v1/make-server-36da3eb1/email-digest/cron
                </p>
                <p className="mt-1" style={{ fontSize: 10, color: DT.textDis }}>
                  Headers: Content-Type: application/json, X-Cron-Secret: your-secret
                </p>
                <p className="mt-1" style={{ fontSize: 10, color: DT.textDis }}>
                  {`Body: { "digestType": "daily" }`}
                </p>
              </div>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <Clock size={12} style={{ color: DT.yellow }} />
                  <span style={{ fontSize: 11, color: DT.textTer }}>Daily: Throttle 20h between sends</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={12} style={{ color: DT.purple }} />
                  <span style={{ fontSize: 11, color: DT.textTer }}>Weekly: Throttle 6 days between sends</span>
                </div>
              </div>
              <p className="mt-1" style={{ fontSize: 11, color: DT.textDis }}>
                Recommended: Set CRON_SECRET env var for authentication. Only users with unread notifications will receive emails.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Users list */}
      <div className="rounded-2xl overflow-hidden" style={{
        background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
        border: `1px solid ${DT.borderSub}`,
      }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
          <div className="flex items-center gap-2">
            <Users size={15} style={{ color: DT.textTer }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: DT.textTer, letterSpacing: "0.05em" }}>
              USERS ({users.length})
            </span>
          </div>
          <button onClick={fetchUsers} className="p-1.5 rounded-lg cursor-pointer hover:bg-white/[0.04] transition" style={{ color: DT.textDis }}>
            <RefreshCw size={13} />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 size={24} className="animate-spin mx-auto" style={{ color: DT.blue }} />
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: DT.borderHair }}>
            {users.map((user) => {
              const lastSent = getLastSent(user.userId);
              const isSending = sendingUserId === user.userId;

              return (
                <div
                  key={user.userId}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{
                    background: `${roleColors[user.role] || DT.blue}18`,
                    border: `1px solid ${roleColors[user.role] || DT.blue}30`,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: roleColors[user.role] || DT.blue }}>
                      {user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontSize: 13, fontWeight: 600, color: DT.textPri }}>{user.name}</span>
                      <span className="px-2 py-0.5 rounded-full" style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: "0.05em",
                        background: `${roleColors[user.role] || DT.blue}18`,
                        color: roleColors[user.role] || DT.blue,
                      }}>
                        {user.role.toUpperCase()}
                      </span>
                      {lastSent && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
                          fontSize: 9, fontWeight: 600,
                          background: DT.successDim,
                          color: DT.success,
                        }}>
                          <MailCheck size={9} />
                          Sent {formatTimeAgo(lastSent.sentAt)}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: DT.textDis }}>{user.email}</span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => generatePreview(user)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer hover:bg-white/[0.04]"
                      style={{
                        fontSize: 11, fontWeight: 600,
                        color: DT.blue,
                        border: `1px solid rgba(77,143,255,0.15)`,
                      }}
                    >
                      <Eye size={12} /> Preview
                    </button>
                    <button
                      onClick={() => sendToUser(user)}
                      disabled={isSending || !user.email}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer hover:opacity-90 disabled:opacity-40"
                      style={{
                        fontSize: 11, fontWeight: 600,
                        color: "white",
                        background: DT.blue,
                      }}
                    >
                      {isSending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      Send
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Email preview modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ fontFamily: FT.b }}>
          <div
            className="absolute inset-0"
            style={{ background: "rgba(4,6,12,0.80)", backdropFilter: "blur(8px)" }}
            onClick={() => setShowPreview(false)}
          />
          <div
            className="relative w-full max-w-[720px] max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: `linear-gradient(180deg, ${DT.raised} 0%, ${DT.dark} 100%)`,
              border: `1px solid ${DT.borderSub}`,
              boxShadow: DT.shadowXl,
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
              <div className="flex items-center gap-3">
                <Mail size={18} style={{ color: DT.blue }} />
                <div>
                  <h3 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>
                    Email Preview
                  </h3>
                  <p style={{ fontSize: 11, color: DT.textTer }}>
                    {selectedUser ? `${selectedUser.name} (${selectedUser.email})` : "Your digest"}
                    {" · "}
                    {digestType === "daily" ? "Daily" : "Weekly"} digest
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyHtml}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer hover:bg-white/[0.04]"
                  style={{
                    fontSize: 11, fontWeight: 600,
                    color: copiedHtml ? DT.success : DT.textSec,
                    border: `1px solid ${DT.borderDef}`,
                  }}
                >
                  {copiedHtml ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                  {copiedHtml ? "Copied!" : "Copy HTML"}
                </button>
                {selectedUser && (
                  <button
                    onClick={sendFromPreview}
                    disabled={sendingUserId === selectedUser.userId}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer hover:opacity-90 disabled:opacity-50"
                    style={{
                      fontSize: 11, fontWeight: 600,
                      color: "white",
                      background: DT.blue,
                    }}
                  >
                    {sendingUserId === selectedUser.userId ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    Send Email
                  </button>
                )}
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 rounded-lg cursor-pointer hover:bg-white/[0.05] transition"
                  style={{ color: DT.textTer }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Preview content */}
            <div className="flex-1 overflow-auto">
              {previewLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={28} className="animate-spin" style={{ color: DT.blue }} />
                  <span className="ml-3" style={{ fontSize: 14, color: DT.textSec }}>Generating email...</span>
                </div>
              ) : emailHtml ? (
                <div className="p-4">
                  {/* Rendered email in iframe */}
                  <div className="rounded-xl overflow-hidden" style={{
                    border: `1px solid ${DT.borderDef}`,
                    boxShadow: DT.shadowMd,
                  }}>
                    <iframe
                      srcDoc={emailHtml}
                      title="Email Preview"
                      className="w-full border-0"
                      style={{ minHeight: 600, background: "#07090F" }}
                      sandbox="allow-same-origin"
                    />
                  </div>

                  {/* Status banner */}
                  <div className="mt-4 rounded-xl p-4 flex items-start gap-3" style={{
                    background: DT.blueDim,
                    border: `1px solid rgba(77,143,255,0.12)`,
                  }}>
                    <PlayCircle size={16} className="shrink-0 mt-0.5" style={{ color: DT.blue }} />
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: DT.blue }}>Email Sending via Resend</p>
                      <p className="mt-0.5" style={{ fontSize: 11, color: DT.textTer, lineHeight: 1.5 }}>
                        Click "Send Email" to deliver this digest via Resend. Make sure the RESEND_API_KEY
                        environment variable is configured in your Supabase Edge Functions settings.
                        You can also use "Send All Digests" to batch-send to all users with unread notifications.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center">
                  <p style={{ fontSize: 14, color: DT.textTer }}>No email content generated.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}