import { supabase, apiFetch } from "../lib/supabase";
import { useState, useRef, useEffect, useCallback } from "react";
import type { ReactNode, ChangeEvent } from "react";
import { createPortal } from "react-dom";
import {
  Plus, X, Users, UserPlus, Trash2, ChevronRight,
  Film, Camera, Globe, Package, FileText, Link2, Gamepad2,
  Upload, Loader2, Inbox, RefreshCw, ImageIcon,
} from "lucide-react";
import { DT, FT } from "./cinematic-tokens";
import { toast } from "sonner";
import { PageShell } from "./PageShell";
import { useInView, Fade, cardBg, inputStyle, focusIn, focusOut, PageSpinner } from "./ui/shared-ui";
import { AvatarCircle } from "./AvatarCircle";

/* ═══ Types & Data ═══ */
type GroupStatus = "Pre-Defense" | "Defense Ready" | "Graded" | "Archived";
type SubmissionType = "video" | "youtube" | "photo" | "website" | "zip" | "gdrive" | "custom";
interface Member { initials: string; name: string; email: string; avatarUrl?: string | null; }
interface GroupData {
  id: number; number: number; name?: string; title: string; type: string; status: GroupStatus;
  members: Member[]; adviser: string; adviserInitials: string;
  panelists: { initials: string; name: string }[]; progress: number;
  description: string; client: string; submissionType: SubmissionType; submissionInstructions: string;
  photoUrl?: string | null; featureImageUrl?: string | null;
}

/* Status badge */
const statusMap: Record<GroupStatus, { c: string; bg: string; b: string }> = {
  "Pre-Defense": { c: DT.warning, bg: DT.warningDim, b: "rgba(251,191,36,0.15)" },
  "Defense Ready": { c: DT.blue, bg: DT.blueDim, b: "rgba(77,143,255,0.15)" },
  Graded: { c: DT.success, bg: DT.successDim, b: "rgba(74,222,128,0.15)" },
  Archived: { c: DT.textTer, bg: "rgba(255,255,255,0.04)", b: DT.borderDef },
};

const submissionOptions: { key: SubmissionType; icon: ReactNode; label: string; desc: string }[] = [
  { key: "video", icon: <Film size={20} />, label: "Video Upload", desc: "Upload MP4/MOV file directly (max 2GB)" },
  { key: "youtube", icon: <Link2 size={20} />, label: "YouTube / Vimeo Link", desc: "Submit a link to uploaded video" },
  { key: "photo", icon: <Camera size={20} />, label: "Photo Gallery Upload", desc: "Upload ZIP of high-res photos or individual JPEGs" },
  { key: "website", icon: <Globe size={20} />, label: "Website / Portfolio Link", desc: "Submit URL to live website or Behance/portfolio" },
  { key: "zip", icon: <Package size={20} />, label: "ZIP Archive", desc: "Upload a compressed folder of all project files" },
  { key: "gdrive", icon: <FileText size={20} />, label: "Google Drive Link", desc: "Submit a shared Google Drive folder link" },
  { key: "custom", icon: <Gamepad2 size={20} />, label: "Other / Custom", desc: "Coordinator specifies instructions manually" },
];
const projectTypes = ["Short Film", "Photography Exhibit", "Social Media Campaign", "Mobile App", "Others"];

/* ═══ Group Card ═══ */
function GroupCard({ group, onManage, delay = 0 }: { group: GroupData; onManage: () => void; onAssign?: () => void; delay?: number }) {
  const sm = statusMap[group.status] || { c: DT.textTer, bg: "rgba(255,255,255,0.04)", b: DT.borderDef };
  return (
    <Fade delay={delay}>
      <div className="rounded-xl overflow-hidden flex flex-col h-full" style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm }}>
        {/* Group Photo Banner */}
        {group.photoUrl && (
          <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
            <img src={group.photoUrl} alt={`Group ${group.number}`} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 50%, rgba(22,27,46,0.95) 100%)" }} />
          </div>
        )}
        {/* Header */}
        <div className={`p-5 flex-1 ${group.photoUrl ? "-mt-8 relative z-10" : ""}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: DT.yellow, fontFamily: FT.h, fontSize: 14, fontWeight: 700, color: DT.base }}>
              {group.number}
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, color: sm.c, background: sm.bg, border: `1px solid ${sm.b}` }}>
              {group.status}
            </span>
          </div>
          {group.name && (
            <p className="mb-1 truncate" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: DT.yellow }}>
              {group.name}
            </p>
          )}
          <h4 className="line-clamp-2 mb-2" style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 700, color: DT.textPri, lineHeight: 1.3 }}>{group.title || "Untitled Group"}</h4>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: "rgba(255,255,255,0.04)", color: DT.textTer, border: `1px solid ${DT.borderHair}` }}>{group.type}</span>
          </div>
          {/* Members */}
          <div className="flex items-center gap-1 mb-2.5">
            {group.members.slice(0, 3).map((m, i) => (
              m.avatarUrl ? (
                <div key={m.name} className="rounded-full overflow-hidden shrink-0" style={{ width: 26, height: 26 }}>
                  <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ) : (
                <AvatarCircle key={m.name} initials={m.initials} idx={i} />
              )
            ))}
            {group.members.length > 3 && <span className="ml-1" style={{ fontSize: 11, color: DT.textTer }}>+{group.members.length - 3}</span>}
            {group.members.length === 0 && <span style={{ fontSize: 11, color: DT.textTer }}>No members yet</span>}
          </div>
          {/* Adviser */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11, color: DT.textTer }}>Adviser:</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: DT.textSec }}>{group.adviser || "Unassigned"}</span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 mb-1 flex items-center justify-between">
            <span style={{ fontSize: 10, color: DT.textTer }}>Progress</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: DT.textSec }}>{group.progress}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${group.progress}%`, background: `linear-gradient(90deg, ${DT.blue}, ${DT.purple})` }} />
          </div>
        </div>
        {/* Actions */}
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
          <button onClick={onManage} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition cursor-pointer hover:bg-white/[0.05]"
            style={{ fontSize: 12, fontWeight: 600, color: DT.blue, border: `1px solid ${DT.borderDef}` }}>
            <Users size={13} /> Manage
          </button>
        </div>
      </div>
    </Fade>
  );
}

/* ═══ Member Photo Row — upload avatar per member ═══ */
function MemberPhotoRow({ member, idx, onPhotoUpdated }: { member: Member; idx: number; onPhotoUpdated: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localUrl, setLocalUrl] = useState<string | null>(member.avatarUrl || null);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB."); return; }

    setUploading(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token!;
      // Find user by email to get their userId
      const { users } = await apiFetch<{ users: any[] }>("/users", {}, token);
      const user = member.email
        ? users?.find((u: any) => u.email?.toLowerCase() === member.email?.toLowerCase())
        : users?.find((u: any) => u.name?.toLowerCase() === member.name?.toLowerCase());
      if (!user) { toast.error(`No account found for ${member.name}`); return; }

      const fd = new FormData();
      fd.append("avatar", file);
      const res = await apiFetch<{ avatarUrl: string }>(`/users/${user.id}/avatar`, { method: "POST", body: fd }, token);
      if (res?.avatarUrl) { setLocalUrl(res.avatarUrl); toast.success(`Photo uploaded for ${member.name}.`); onPhotoUpdated(); }
    } catch (err: any) { toast.error(err.message || "Upload failed."); console.error(err); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${DT.borderHair}` }}>
      <div className="relative group shrink-0">
        {localUrl ? (
          <div className="w-9 h-9 rounded-full overflow-hidden">
            <img src={localUrl} alt={member.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <AvatarCircle initials={member.initials} idx={idx} size={36} />
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center transition cursor-pointer opacity-0 group-hover:opacity-100 disabled:opacity-50"
          style={{ background: DT.blue, color: "white", border: `2px solid ${DT.raised}` }}>
          {uploading ? <Loader2 size={8} className="animate-spin" /> : <Camera size={8} />}
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate" style={{ fontSize: 13, fontWeight: 600, color: DT.textPri }}>{member.name}</div>
        <div className="truncate" style={{ fontSize: 11, color: DT.textTer }}>{member.email}</div>
      </div>
      {!localUrl && (
        <span className="px-2 py-0.5 rounded-full shrink-0" style={{ fontSize: 9, fontWeight: 600, background: DT.warningDim, color: DT.warning }}>No photo</span>
      )}
    </div>
  );
}

/* ═══ Manage Group Modal ═══ */
function ManageGroupModal({ group, onClose, onSaved }: { group: GroupData; onClose: () => void; onSaved?: () => void }) {
  const [tab, setTab] = useState<"members" | "project" | "submission">("members");
  const [subType, setSubType] = useState<SubmissionType>(group.submissionType || "custom");
  const [subInstr, setSubInstr] = useState(group.submissionInstructions || "");
  const [groupName, setGroupName] = useState(group.name || "");
  const [projTitle, setProjTitle] = useState(group.title || "");
  const [projType, setProjType] = useState(group.type || "Other");
  const [projDesc, setProjDesc] = useState(group.description || "");
  const [projClient, setProjClient] = useState(group.client || "");
  const [selectedAdviser, setSelectedAdviser] = useState(group.adviser || "");
  const [availableAdvisers, setAvailableAdvisers] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(group.photoUrl || null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [featurePreview, setFeaturePreview] = useState<string | null>(group.featureImageUrl || null);
  const [featureFile, setFeatureFile] = useState<File | null>(null);
  const [uploadingFeature, setUploadingFeature] = useState(false);
  const featureInputRef = useRef<HTMLInputElement>(null);

  /* Fetch advisers from database */
  useEffect(() => {
    (async () => {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        const { users } = await apiFetch<{ users: any[] }>("/users", {}, session?.access_token!);
        setAvailableAdvisers(
          (users || [])
            .filter((u: any) => u.role === "adviser" && u.status === "Active")
            .map((u: any) => ({ id: u.id, name: u.name }))
        );
      } catch { /* silently fail */ }
    })();
  }, []);

  const handlePhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB."); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handleFeatureSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB."); return; }
    setFeatureFile(file);
    setFeaturePreview(URL.createObjectURL(file));
  };

  const handleRemoveFeature = () => {
    setFeatureFile(null);
    setFeaturePreview(null);
    if (featureInputRef.current) featureInputRef.current.value = "";
  };

  const handleSaveProject = async () => {
    setSaving(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token!;
      await apiFetch(`/groups/${group.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: groupName, title: projTitle, type: projType, description: projDesc, client: projClient, submissionType: subType, submissionInstructions: subInstr, adviser: selectedAdviser, adviserInitials: selectedAdviser ? selectedAdviser.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : "" }),
      }, token);

      // Upload group photo if selected
      if (photoFile) {
        setUploadingPhoto(true);
        try {
          const fd = new FormData();
          fd.append("photo", photoFile);
          await apiFetch(`/groups/${group.id}/photo`, { method: "POST", body: fd }, token);
          toast.success("Group photo uploaded.");
        } catch (err: any) {
          console.error("Group photo upload error:", err);
          toast.error("Group saved but photo upload failed.");
        } finally { setUploadingPhoto(false); }
      }

      // Upload feature image if selected
      if (featureFile) {
        setUploadingFeature(true);
        try {
          const fd = new FormData();
          fd.append("featureImage", featureFile);
          await apiFetch(`/groups/${group.id}/feature-image`, { method: "POST", body: fd }, token);
          toast.success("Feature image uploaded.");
        } catch (err: any) {
          console.error("Feature image upload error:", err);
          toast.error("Group saved but feature image upload failed.");
        } finally { setUploadingFeature(false); }
      }

      toast.success("Group updated successfully.");
      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update group.");
    } finally { setSaving(false); }
  };

  const tabItems = [
    { key: "members" as const, label: "Members", icon: <Users size={14} /> },
    { key: "project" as const, label: "Project Details", icon: <FileText size={14} /> },
    { key: "submission" as const, label: "Submission", icon: <Upload size={14} /> },
  ];

  return (
    <div className="fixed inset-0 z-50" style={{ fontFamily: FT.b }}>
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: "rgba(4,6,12,0.80)", backdropFilter: "blur(8px)" }} onClick={onClose} />

      {/* Centering shell — pointer-events-none so clicks pass to backdrop */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        {/* Modal card — re-enable pointer events */}
        <div
          className="pointer-events-auto w-full max-w-[700px] flex flex-col rounded-2xl"
          style={{
            maxHeight: "calc(100vh - 3rem)",
            background: `linear-gradient(180deg, ${DT.elevated} 0%, ${DT.dark} 100%)`,
            border: `1px solid ${DT.borderSub}`,
            boxShadow: `0 0 0 1px rgba(255,255,255,0.03), ${DT.shadowXl}`,
          }}
        >
          {/* ── Header (sticky) ── */}
          <div className="shrink-0 px-6 pt-5 pb-4" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: DT.yellow, fontFamily: FT.h, fontSize: 15, fontWeight: 800, color: DT.base }}>
                  {group.number}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate" style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 700, color: DT.textPri, lineHeight: 1.2 }}>
                    Manage Group {group.number}
                  </h2>
                  <p className="truncate mt-0.5" style={{ fontSize: 12, color: DT.textTer }}>{group.title || "Untitled Group"}</p>
                </div>
              </div>
              <button onClick={onClose}
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition hover:bg-white/[0.06]"
                style={{ color: DT.textTer, border: `1px solid ${DT.borderHair}` }}>
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 -mb-4 px-0" style={{ borderBottom: "none" }}>
              {tabItems.map((t) => {
                const active = tab === t.key;
                return (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition cursor-pointer"
                    style={{
                      fontSize: 12.5, fontWeight: active ? 600 : 400,
                      color: active ? DT.blue : DT.textTer,
                      background: active ? "rgba(77,143,255,0.08)" : "transparent",
                      borderBottom: active ? `2px solid ${DT.blue}` : "2px solid transparent",
                    }}>
                    <span style={{ opacity: active ? 1 : 0.5 }}>{t.icon}</span>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: "thin", scrollbarColor: `${DT.borderDef} transparent` }}>
            <div className="p-6">

              {/* ── Members Tab ── */}
              {tab === "members" && (
                <div className="space-y-4">
                  {/* Students section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: DT.blueDim }}>
                        <Users size={12} style={{ color: DT.blue }} />
                      </div>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: DT.textPri }}>
                        Team Members
                      </h4>
                      <span className="ml-auto px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: DT.blueDim, color: DT.blue }}>
                        {group.members.length}
                      </span>
                    </div>
                    {group.members.length === 0 ? (
                      <div className="py-10 text-center rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px dashed ${DT.borderDef}` }}>
                        <Inbox size={28} style={{ color: DT.textDis, margin: "0 auto 8px" }} />
                        <p style={{ fontSize: 13, color: DT.textTer, fontWeight: 500 }}>No members assigned yet</p>
                        <p style={{ fontSize: 11, color: DT.textDis, marginTop: 2 }}>Add members via User Management</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {group.members.map((m, i) => (
                          <MemberPhotoRow key={m.name} member={m} idx={i} onPhotoUpdated={() => onSaved?.()} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="h-px" style={{ background: DT.borderHair }} />

                  {/* Panelists section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: DT.warningDim }}>
                        <UserPlus size={12} style={{ color: DT.warning }} />
                      </div>
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: DT.textPri }}>
                        Panel Members
                      </h4>
                      <span className="ml-auto px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: DT.warningDim, color: DT.warning }}>
                        {group.panelists?.length || 0}
                      </span>
                    </div>
                    {(group.panelists?.length || 0) === 0 ? (
                      <div className="py-6 text-center rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px dashed ${DT.borderDef}` }}>
                        <p style={{ fontSize: 13, color: DT.textTer, fontWeight: 500 }}>No panelists assigned yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {group.panelists.map((p, i) => (
                          <MemberPhotoRow key={p.name} member={{ initials: p.initials, name: p.name, email: "" }} idx={i + 3} onPhotoUpdated={() => onSaved?.()} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Project Details Tab ── */}
              {tab === "project" && (
                <div className="space-y-5">
                  {/* Group Photo */}
                  <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                    <label className="flex items-center gap-2 mb-3" style={{ fontSize: 12, fontWeight: 600, color: DT.textSec }}>
                      <ImageIcon size={13} /> Group Photo
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="relative group shrink-0">
                        {photoPreview ? (
                          <div className="w-28 h-[72px] rounded-xl overflow-hidden" style={{ border: `2px solid ${DT.borderDef}` }}>
                            <img src={photoPreview} alt="Group" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-28 h-[72px] rounded-xl flex flex-col items-center justify-center gap-1" style={{ background: DT.hoverBg, border: `2px dashed ${DT.borderDef}` }}>
                            <ImageIcon size={18} style={{ color: DT.textDis }} />
                            <span style={{ fontSize: 9, color: DT.textDis }}>No photo</span>
                          </div>
                        )}
                        {photoPreview && (
                          <button type="button" onClick={handleRemovePhoto}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition cursor-pointer opacity-0 group-hover:opacity-100"
                            style={{ background: DT.red, color: "white" }}>
                            <X size={10} />
                          </button>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                        <button type="button" onClick={() => photoInputRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer hover:bg-white/[0.04]"
                          style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 12, fontWeight: 600 }}>
                          <Camera size={13} /> {photoPreview ? "Change Photo" : "Upload Photo"}
                        </button>
                        <p className="mt-1.5" style={{ fontSize: 10, color: DT.textDis }}>Landscape recommended · JPG/PNG · Max 5 MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Project Feature Image — shown on landing page "See What They Made" */}
                  <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
                    <label className="flex items-center gap-2 mb-1" style={{ fontSize: 12, fontWeight: 600, color: DT.textSec }}>
                      <Film size={13} /> Project Feature Image
                    </label>
                    <p className="mb-3" style={{ fontSize: 10, color: DT.textTer }}>This image appears on the public landing page under "See What They Made" — use a key visual from your project output.</p>
                    <div className="flex items-center gap-4">
                      <div className="relative group shrink-0">
                        {featurePreview ? (
                          <div className="w-36 h-[84px] rounded-xl overflow-hidden" style={{ border: `2px solid ${DT.yellow}`, boxShadow: `0 0 12px ${DT.yellowDim}` }}>
                            <img src={featurePreview} alt="Feature" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-36 h-[84px] rounded-xl flex flex-col items-center justify-center gap-1" style={{ background: DT.hoverBg, border: `2px dashed ${DT.borderDef}` }}>
                            <Film size={18} style={{ color: DT.textDis }} />
                            <span style={{ fontSize: 9, color: DT.textDis }}>No feature image</span>
                          </div>
                        )}
                        {featurePreview && (
                          <button type="button" onClick={handleRemoveFeature}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition cursor-pointer opacity-0 group-hover:opacity-100"
                            style={{ background: DT.red, color: "white" }}>
                            <X size={10} />
                          </button>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <input ref={featureInputRef} type="file" accept="image/*" onChange={handleFeatureSelect} className="hidden" />
                        <button type="button" onClick={() => featureInputRef.current?.click()}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer hover:bg-white/[0.04]"
                          style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 12, fontWeight: 600 }}>
                          <Film size={13} /> {featurePreview ? "Change Feature Image" : "Upload Feature Image"}
                        </button>
                        <p className="mt-1.5" style={{ fontSize: 10, color: DT.textDis }}>Wide/cinematic recommended (16:9) · JPG/PNG · Max 5 MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label style={{ fontSize: 12, fontWeight: 600, color: DT.textSec, display: "block", marginBottom: 6 }}>
                        Group Name <span style={{ color: DT.textTer, fontWeight: 400 }}>(optional · e.g. "Team Visionary")</span>
                      </label>
                      <input
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Give your group a unique identity name..."
                        style={inputStyle}
                        onFocus={focusIn}
                        onBlur={focusOut}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label style={{ fontSize: 12, fontWeight: 600, color: DT.textSec, display: "block", marginBottom: 6 }}>Project Title</label>
                      <input value={projTitle} onChange={(e) => setProjTitle(e.target.value)} placeholder="Enter project title..." style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: DT.textSec, display: "block", marginBottom: 6 }}>Project Type</label>
                      <select value={projType} onChange={(e) => setProjType(e.target.value)} className="cursor-pointer" style={{ ...inputStyle, appearance: "auto" }} onFocus={focusIn as any} onBlur={focusOut as any}>
                        {projectTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: DT.textSec, display: "block", marginBottom: 6 }}>Client / Partner</label>
                      <input value={projClient} onChange={(e) => setProjClient(e.target.value)} placeholder="Optional" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
                    </div>
                    <div className="sm:col-span-2">
                      <label style={{ fontSize: 12, fontWeight: 600, color: DT.textSec, display: "block", marginBottom: 6 }}>Description</label>
                      <textarea value={projDesc} onChange={(e) => setProjDesc(e.target.value)} rows={3} placeholder="Brief project description..."
                        className="w-full rounded-xl transition resize-none" style={{ ...inputStyle, padding: "10px 12px" }} onFocus={focusIn as any} onBlur={focusOut as any} />
                    </div>
                    <div className="sm:col-span-2">
                      <label style={{ fontSize: 12, fontWeight: 600, color: DT.textSec, display: "block", marginBottom: 6 }}>Adviser</label>
                      <select value={selectedAdviser} onChange={(e) => setSelectedAdviser(e.target.value)} className="cursor-pointer" style={{ ...inputStyle, appearance: "auto" }} onFocus={focusIn as any} onBlur={focusOut as any}>
                        <option value="">Unassigned</option>
                        {availableAdvisers.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Submission Tab ── */}
              {tab === "submission" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: DT.blueDim }}>
                      <Upload size={12} style={{ color: DT.blue }} />
                    </div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: DT.textPri }}>Submission Type</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {submissionOptions.map((opt) => {
                      const active = subType === opt.key;
                      return (
                        <button key={opt.key} onClick={() => setSubType(opt.key)}
                          className="flex items-start gap-3 p-3 rounded-xl text-left transition cursor-pointer"
                          style={{
                            border: `2px solid ${active ? DT.blue : DT.borderDef}`,
                            background: active ? DT.blueDim : "transparent",
                          }}>
                          <span className="mt-0.5" style={{ color: active ? DT.blue : DT.textTer }}>{opt.icon}</span>
                          <div className="min-w-0">
                            <div style={{ fontSize: 13, fontWeight: 600, color: active ? DT.textPri : DT.textSec }}>{opt.label}</div>
                            <div style={{ fontSize: 11, color: DT.textTer, lineHeight: 1.3, marginTop: 1 }}>{opt.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {subType === "custom" && (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: DT.textSec, display: "block", marginBottom: 6 }}>Custom Instructions</label>
                      <textarea value={subInstr} onChange={(e) => setSubInstr(e.target.value)} rows={3} placeholder="Describe submission requirements..."
                        className="w-full rounded-xl transition resize-none" style={{ ...inputStyle, padding: "10px 12px" }} onFocus={focusIn as any} onBlur={focusOut as any} />
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* ── Footer (sticky) ── */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
            <span style={{ fontSize: 11, color: DT.textDis }}>
              {tab === "members" ? `${group.members.length} student${group.members.length !== 1 ? "s" : ""} · ${group.panelists?.length || 0} panelist${(group.panelists?.length || 0) !== 1 ? "s" : ""}` : tab === "project" ? "All fields auto-save on Save" : `Type: ${subType}`}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-xl transition cursor-pointer hover:bg-white/[0.04]"
                style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 13, fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={handleSaveProject} disabled={saving || uploadingPhoto || uploadingFeature}
                className="px-5 py-2 rounded-xl transition cursor-pointer hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                style={{ background: DT.yellow, color: DT.base, fontFamily: FT.h, fontSize: 13, fontWeight: 700 }}>
                {(saving || uploadingPhoto || uploadingFeature) && <Loader2 size={14} className="animate-spin" />}
                {uploadingFeature ? "Uploading Feature..." : uploadingPhoto ? "Uploading Photo..." : saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Main Export ═══ */
export function GroupsTeamsPage() {
  const [manageGroup, setManageGroup] = useState<GroupData | null>(null);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    try {
      const { groups: data } = await apiFetch<{ groups: GroupData[] }>("/groups");
      setGroups(data || []);
    } catch (err) { console.error("Failed to fetch groups:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const handleCreateGroup = async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      await apiFetch("/groups", {
        method: "POST",
        body: JSON.stringify({ title: "New Untitled Group", type: "Other", status: "Pre-Defense" }),
      }, session?.access_token!);
      toast.success("Group created! Open Manage to configure it.");
      fetchGroups();
    } catch (err: any) { toast.error(err.message || "Failed to create group."); }
  };

  if (loading) {
    return <PageSpinner label="Loading groups..." />;
  }

  return (
    <PageShell>

      <Fade delay={0}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>Groups & Teams</h1>
            <p className="mt-1" style={{ fontSize: 14, color: DT.textSec }}>{groups.length} capstone group{groups.length !== 1 ? "s" : ""} · Manage members, projects, and submissions</p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <button onClick={fetchGroups} className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition cursor-pointer hover:bg-white/[0.04]"
              style={{ border: `1px solid ${DT.borderDef}`, color: DT.textTer, fontSize: 13 }}>
              <RefreshCw size={15} />
            </button>
            <button onClick={handleCreateGroup} className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90"
              style={{ background: DT.yellow, color: DT.base, fontFamily: FT.h, fontSize: 14, fontWeight: 700 }}>
              <Plus size={18} /> Create New Group
            </button>
          </div>
        </div>
      </Fade>

      {/* Summary */}
      <Fade delay={60}>
        <div className="flex flex-wrap gap-3">
          {(["Pre-Defense", "Defense Ready", "Graded", "Archived"] as GroupStatus[]).map((s) => {
            const count = groups.filter((g) => g.status === s).length;
            const sm = statusMap[s];
            return (
              <div key={s} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ fontSize: 12, fontWeight: 600, color: sm.c, background: sm.bg, border: `1px solid ${sm.b}` }}>
                {s} <span style={{ opacity: 0.7 }}>({count})</span>
              </div>
            );
          })}
        </div>
      </Fade>

      {/* Cards */}
      {groups.length === 0 ? (
        <Fade delay={120}>
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl" style={{ background: cardBg, border: `1px solid ${DT.borderSub}` }}>
            <Inbox size={40} style={{ color: DT.textDis, marginBottom: 12 }} />
            <h3 style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 700, color: DT.textPri }}>No groups yet</h3>
            <p className="mt-1 mb-5" style={{ fontSize: 13, color: DT.textTer }}>Create your first capstone group to get started.</p>
            <button onClick={handleCreateGroup} className="flex items-center gap-2 px-6 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90"
              style={{ background: DT.yellow, color: DT.base, fontFamily: FT.h, fontSize: 14, fontWeight: 700 }}>
              <Plus size={18} /> Create First Group
            </button>
          </div>
        </Fade>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {groups.map((g, i) => (
            <GroupCard key={g.id} group={g} onManage={() => setManageGroup(g)} onAssign={() => {}} delay={120 + i * 40} />
          ))}
        </div>
      )}

      {manageGroup && createPortal(
        <ManageGroupModal group={manageGroup} onClose={() => { setManageGroup(null); fetchGroups(); }} onSaved={fetchGroups} />,
        document.body
      )}
    </PageShell>
  );
}