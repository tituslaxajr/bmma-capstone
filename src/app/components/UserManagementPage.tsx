import React, { Suspense, lazy, useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Search, Download, Plus, Pencil, ToggleLeft, ToggleRight,
  X, ChevronLeft, ChevronRight, AlertTriangle, GraduationCap,
  ShieldCheck, BookOpen, Settings, Lock, Loader2, RefreshCw,
  Upload, Camera, Trash2, ImageIcon, Users, UserCheck, UserX, Clock,
  Filter, MoreVertical,
} from "lucide-react";
import { supabase, apiFetch } from "../lib/supabase";
import { toast } from "sonner";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { useDebouncedValue } from "../lib/useDebounce";
import { validateAvatar, getAcceptString, ALLOWED_IMAGE_TYPES } from "../lib/fileValidation";
import { PageShell } from "./PageShell";
import { inputStyle, focusIn, focusOut } from "./ui/shared-ui";
import { AvatarCircle } from "./AvatarCircle";

const BulkImportModal = lazy(() => import("./BulkImportModal").then((m) => ({ default: m.BulkImportModal })));

/* ═══ Types ═══ */
type UserRole = "student" | "panelist" | "adviser" | "coordinator";
type UserStatus = "Active" | "Inactive";
type TabKey = "all" | "students" | "panelists" | "advisers";

interface UserRecord {
  id: string; name: string; email: string; role: UserRole; group: string;
  adviser: string; department: string; status: UserStatus; avatar: string; createdAt: string;
  secondaryRoles?: UserRole[];
  avatarUrl?: string | null;
}

/* ═══ Badge & Avatar ═══ */
const roleBadge: Record<string, { c: string; bg: string; b: string; icon: React.ReactNode }> = {
  student: { c: DT.blue, bg: DT.blueDim, b: "rgba(77,143,255,0.15)", icon: <GraduationCap size={11} /> },
  panelist: { c: DT.purple, bg: DT.purpleDim, b: "rgba(167,139,250,0.15)", icon: <ShieldCheck size={11} /> },
  adviser: { c: DT.success, bg: DT.successDim, b: "rgba(74,222,128,0.15)", icon: <BookOpen size={11} /> },
  coordinator: { c: DT.yellow, bg: DT.yellowDim, b: "rgba(255,209,0,0.15)", icon: <Settings size={11} /> },
};
const roleLabel: Record<string, string> = { student: "Student", panelist: "Panelist", adviser: "Adviser", coordinator: "Coordinator" };

function getUserRoles(user: Pick<UserRecord, "role" | "secondaryRoles">): UserRole[] {
  return Array.from(new Set([user.role, ...(user.secondaryRoles || [])]));
}

function hasRole(user: Pick<UserRecord, "role" | "secondaryRoles">, role: UserRole) {
  return getUserRoles(user).includes(role);
}

function RoleBadges({ user }: { user: Pick<UserRecord, "role" | "secondaryRoles"> }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {getUserRoles(user).map((r) => {
        const rb = roleBadge[r] || roleBadge.student;
        return (
          <span key={r} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ fontSize: 11, fontWeight: 600, color: rb.c, background: rb.bg, border: `1px solid ${rb.b}` }}>
            {rb.icon} {roleLabel[r] || r}
          </span>
        );
      })}
    </span>
  );
}

/* ═══ Stat Card ═══ */
function StatCard({ icon, label, value, accent, accentDim }: { icon: React.ReactNode; label: string; value: number; accent: string; accentDim: string }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl px-5 py-4 transition-all duration-200 hover:-translate-y-0.5"
      style={{ background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`, border: `1px solid ${DT.borderSub}` }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: accentDim, border: `1px solid ${withAlpha(accent, 0.12)}` }}>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontFamily: FT.h, fontSize: 22, fontWeight: 800, color: DT.textPri, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
        <div style={{ fontFamily: FT.b, fontSize: 11, color: DT.textTer, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

/* ═══ Filter Select ═══ */
function FilterSelect({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="cursor-pointer transition"
      style={{
        background: DT.elevated, border: `1px solid ${DT.borderDef}`, color: DT.textPri,
        fontSize: 13, fontFamily: FT.b, outline: "none", borderRadius: 10, padding: "8px 12px",
        transition: "border-color 200ms",
      }}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/* ═══ Role Option ═══ */
function RoleOption({ icon, label, selected, onClick }: { icon: React.ReactNode; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all cursor-pointer flex-1"
      style={{
        border: `2px solid ${selected ? DT.yellow : DT.borderDef}`,
        background: selected ? DT.yellowDim : "transparent",
      }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center transition"
        style={{ background: selected ? withAlpha(DT.yellow, 0.12) : "rgba(255,255,255,0.04)", color: selected ? DT.yellow : DT.textTer }}>
        {icon}
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: selected ? DT.textPri : DT.textSec }}>{label}</span>
    </button>
  );
}

/* ═══ Table Skeleton ═══ */
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
          <td className="px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full" style={{ background: DT.elevated, animation: `shimmer 2s ease-in-out infinite ${i * 100}ms` }} />
              <div className="h-3.5 rounded-lg" style={{ width: 120, background: DT.elevated, animation: `shimmer 2s ease-in-out infinite ${i * 100 + 50}ms` }} />
            </div>
          </td>
          <td className="px-5 py-4"><div className="h-3 rounded-lg" style={{ width: 160, background: DT.elevated, animation: `shimmer 2s ease-in-out infinite ${i * 100 + 100}ms` }} /></td>
          <td className="px-5 py-4"><div className="h-5 rounded-full" style={{ width: 70, background: DT.elevated, animation: `shimmer 2s ease-in-out infinite ${i * 100 + 150}ms` }} /></td>
          <td className="px-5 py-4"><div className="h-3 rounded-lg" style={{ width: 80, background: DT.elevated, animation: `shimmer 2s ease-in-out infinite ${i * 100 + 200}ms` }} /></td>
          <td className="px-5 py-4"><div className="h-3 rounded-lg" style={{ width: 100, background: DT.elevated, animation: `shimmer 2s ease-in-out infinite ${i * 100 + 250}ms` }} /></td>
          <td className="px-5 py-4"><div className="h-4 rounded-full" style={{ width: 55, background: DT.elevated, animation: `shimmer 2s ease-in-out infinite ${i * 100 + 300}ms` }} /></td>
          <td className="px-5 py-4"><div className="h-4 rounded-lg ml-auto" style={{ width: 60, background: DT.elevated, animation: `shimmer 2s ease-in-out infinite ${i * 100 + 350}ms` }} /></td>
        </tr>
      ))}
    </>
  );
}

/* ═══ Action Menu (per-row) ═══ */
function ActionMenu({ user, onEdit, onToggle, onDelete }: { user: UserRecord; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Inline quick actions */}
      <div className="flex items-center gap-1">
        <button onClick={onEdit}
          className="p-1.5 rounded-lg transition cursor-pointer hover:bg-white/[0.06]"
          title="Edit" style={{ color: DT.textTer }}>
          <Pencil size={14} />
        </button>
        {user.role !== "coordinator" && (
          <button onClick={onToggle}
            className="p-1.5 rounded-lg transition cursor-pointer hover:bg-white/[0.06]"
            title={user.status === "Active" ? "Deactivate" : "Activate"}
            style={{ color: user.status === "Active" ? DT.success : DT.textDis }}>
            {user.status === "Active" ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          </button>
        )}
        <button onClick={() => setOpen(!open)}
          className="p-1.5 rounded-lg transition cursor-pointer hover:bg-white/[0.06]"
          title="More" style={{ color: DT.textTer }}>
          <MoreVertical size={14} />
        </button>
      </div>
      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-xl overflow-hidden py-1"
          style={{ background: DT.raised, border: `1px solid ${DT.borderDef}`, boxShadow: DT.shadowLg }}>
          <button onClick={() => { onDelete(); setOpen(false); }}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left transition hover:bg-white/[0.04] cursor-pointer"
            style={{ fontSize: 13, fontFamily: FT.b, color: DT.red }}>
            <Trash2 size={14} /> Delete Account
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══ User Modal ═══ */
function UserModal({ mode, user, onClose, onSaved }: { mode: "add" | "edit"; user?: UserRecord | null; onClose: () => void; onSaved: () => void }) {
  const [role, setRole] = useState<UserRole>(user?.role || "student");
  const [secondaryRoles, setSecondaryRoles] = useState<UserRole[]>(user?.secondaryRoles || []);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [group, setGroup] = useState(user?.group || "");
  const [adviser, setAdviser] = useState(user?.adviser || "");
  const [department, setDepartment] = useState(user?.department || "");
  const [tempPw, setTempPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [availableGroups, setAvailableGroups] = useState<{ id: number; number: number; title: string; adviser: string }[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const isEdit = mode === "edit";
  const canAddFacultyRole = role === "panelist" || role === "adviser";
  const complementaryFacultyRole: UserRole | null = role === "panelist" ? "adviser" : role === "adviser" ? "panelist" : null;

  const setPrimaryRole = (nextRole: UserRole) => {
    setRole(nextRole);
    setSecondaryRoles((prev) =>
      nextRole === "panelist" || nextRole === "adviser"
        ? prev.filter((r) => r !== nextRole && (r === "panelist" || r === "adviser"))
        : []
    );
  };

  const toggleSecondaryRole = (secondaryRole: UserRole) => {
    setSecondaryRoles((prev) =>
      prev.includes(secondaryRole) ? prev.filter((r) => r !== secondaryRole) : [...prev, secondaryRole]
    );
  };

  /* Fetch existing groups from database for the dropdown */
  useEffect(() => {
    (async () => {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        const token = session?.access_token!;
        const { groups: data } = await apiFetch<{ groups: any[] }>("/groups", {}, token);
        setAvailableGroups((data || []).map((g: any) => ({ id: g.id, number: g.number ?? g.id, title: g.title || "", adviser: g.adviser || "" })));
      } catch { /* silently fail — dropdown will be empty */ }
    })();
  }, []);

  /* Auto-populate adviser from group selection */
  useEffect(() => {
    if (role === "student" && group) {
      const matchedGroup = availableGroups.find((g) => `Group ${g.number}` === group);
      if (matchedGroup && matchedGroup.adviser && matchedGroup.adviser !== "—") {
        setAdviser(matchedGroup.adviser);
      }
    }
  }, [group, availableGroups, role]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = validateAvatar(file);
    if (!result.valid) { toast.error(result.error!); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const uploadAvatarForUser = async (userId: string, token: string) => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("avatar", avatarFile);
      await apiFetch(`/users/${userId}/avatar`, { method: "POST", body: fd }, token);
      toast.success("Profile photo uploaded.");
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      toast.error("Account saved but photo upload failed.");
    } finally { setUploadingAvatar(false); }
  };

  const handleSave = async () => {
    setFormError("");
    if (!name.trim() || !email.trim()) { setFormError("Name and email are required."); return; }
    if (!isEdit && !tempPw.trim()) { setFormError("Password is required for new accounts."); return; }
    setSaving(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token!;
      const payload = { name, role, secondaryRoles, group: group || "—", adviser: adviser || "—", department };
      if (isEdit && user) {
        await apiFetch(`/users/${user.id}`, { method: "PUT", body: JSON.stringify(payload) }, token);
        if (avatarFile) await uploadAvatarForUser(user.id, token);
        toast.success(`${name}'s account updated successfully.`);
      } else {
        const res = await apiFetch<any>("/auth/signup", { method: "POST", body: JSON.stringify({ email, password: tempPw, ...payload }) }, token);
        // Try to upload avatar for newly created user
        if (avatarFile && res?.user?.id) {
          await uploadAvatarForUser(res.user.id, token);
        }
        toast.success(`Account created for ${name} (${roleLabel[role]}).`);
      }
      onSaved(); onClose();
    } catch (err: any) {
      console.error("Save user error:", err);
      setFormError(err.message || "Failed to save user.");
      toast.error(err.message || "Failed to save user.");
    } finally { setSaving(false); }
  };

  const handleDeactivate = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      await apiFetch(`/users/${user.id}/toggle-status`, { method: "PUT" }, session?.access_token!);
      toast.success(`${user.name} has been ${user.status === "Active" ? "deactivated" : "activated"}.`);
      onSaved(); onClose();
    } catch (err: any) { setFormError(err.message || "Failed to toggle status."); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ fontFamily: FT.b }}>
      <div className="absolute inset-0" style={{ background: "rgba(4,6,12,0.80)", backdropFilter: "blur(8px)" }} onClick={onClose} />
      <div className="relative w-full max-w-[540px] max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: `linear-gradient(145deg, ${DT.raised}, ${DT.dark})`, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowXl }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
          <h2 style={{ fontFamily: FT.h, fontSize: 22, fontWeight: 700, color: DT.textPri }}>{isEdit ? "Edit User Account" : "Add New User Account"}</h2>
          <button onClick={onClose} className="transition cursor-pointer p-1" style={{ color: DT.textTer }}><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {formError && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: DT.redDim, border: `1px solid rgba(248,113,113,0.20)` }}>
              <AlertTriangle size={14} style={{ color: DT.red }} className="shrink-0" />
              <span style={{ fontSize: 13, color: DT.red }}>{formError}</span>
            </div>
          )}

          {/* Profile Photo */}
          <div className="flex flex-col gap-2">
            <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Profile Photo</label>
            <div className="flex items-center gap-4">
              <div className="relative group">
                {avatarPreview ? (
                  <div className="w-20 h-20 rounded-2xl overflow-hidden" style={{ border: `2px solid ${DT.borderDef}` }}>
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: DT.hoverBg, border: `2px dashed ${DT.borderDef}` }}>
                    <ImageIcon size={24} style={{ color: DT.textDis }} />
                  </div>
                )}
                {avatarPreview && (
                  <button type="button" onClick={handleRemoveAvatar}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition cursor-pointer opacity-0 group-hover:opacity-100"
                    style={{ background: DT.red, color: "white" }}>
                    <X size={10} />
                  </button>
                )}
              </div>
              <div className="flex-1">
                <input ref={avatarInputRef} type="file" accept={getAcceptString(ALLOWED_IMAGE_TYPES)} onChange={handleAvatarSelect} className="hidden" />
                <button type="button" onClick={() => avatarInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer hover:bg-white/[0.04]"
                  style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 13, fontWeight: 600 }}>
                  <Camera size={14} /> {avatarPreview ? "Change Photo" : "Upload Photo"}
                </button>
                <p className="mt-1.5" style={{ fontSize: 10, color: DT.textTer }}>JPG, PNG, or WebP · Max 5 MB</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Juan dela Cruz" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>STI Email Address</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@sti.edu.ph" disabled={isEdit}
              style={{ ...inputStyle, opacity: isEdit ? 0.5 : 1, cursor: isEdit ? "not-allowed" : undefined }} onFocus={focusIn} onBlur={focusOut} />
            <span style={{ fontSize: 11, color: DT.textTer }}>{isEdit ? "Email cannot be changed after creation" : "Must be a valid .edu.ph address"}</span>
          </div>

          {/* Role */}
          <div className="flex flex-col gap-2">
            <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Role</label>
            {isEdit && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-1" style={{ background: DT.warningDim, border: `1px solid rgba(251,191,36,0.20)` }}>
                <AlertTriangle size={14} style={{ color: DT.warning }} className="shrink-0" />
                <span style={{ fontSize: 12, color: DT.warning }}>Changing role will affect access permissions immediately.</span>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <RoleOption icon={<GraduationCap size={20} />} label="Student" selected={role === "student"} onClick={() => setPrimaryRole("student")} />
              <RoleOption icon={<ShieldCheck size={20} />} label="Panelist" selected={role === "panelist"} onClick={() => setPrimaryRole("panelist")} />
              <RoleOption icon={<BookOpen size={20} />} label="Adviser" selected={role === "adviser"} onClick={() => setPrimaryRole("adviser")} />
              <RoleOption icon={<Settings size={20} />} label="Coordinator" selected={role === "coordinator"} onClick={() => setPrimaryRole("coordinator")} />
            </div>
          </div>

          {canAddFacultyRole && complementaryFacultyRole && (
            <div className="rounded-xl p-4 flex items-center justify-between gap-4" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${DT.borderHair}` }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: roleBadge[complementaryFacultyRole].bg, color: roleBadge[complementaryFacultyRole].c }}>
                  {complementaryFacultyRole === "panelist" ? <ShieldCheck size={18} /> : <BookOpen size={18} />}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: DT.textPri }}>
                    Also allow {roleLabel[complementaryFacultyRole]} access
                  </div>
                  <div style={{ fontSize: 11, color: DT.textTer, lineHeight: 1.5 }}>
                    Coordinator can mark faculty as both adviser and panelist using this switch.
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => toggleSecondaryRole(complementaryFacultyRole)}
                className="relative w-11 h-6 rounded-full transition cursor-pointer shrink-0"
                style={{ background: secondaryRoles.includes(complementaryFacultyRole) ? DT.success : DT.borderDef }}>
                <span className="absolute top-1 w-4 h-4 rounded-full transition" style={{
                  left: secondaryRoles.includes(complementaryFacultyRole) ? 23 : 4,
                  background: secondaryRoles.includes(complementaryFacultyRole) ? DT.base : DT.textTer,
                }} />
              </button>
            </div>
          )}

          {role === "student" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Assign to Group</label>
                <select value={group} onChange={(e) => setGroup(e.target.value)} style={inputStyle} className="cursor-pointer">
                  <option value="">Select group...</option>
                  {availableGroups.map((g) => <option key={g.id} value={`Group ${g.number}`}>Group {g.number}{g.title ? ` — ${g.title}` : ""}</option>)}
                </select>
                {availableGroups.length === 0 && (
                  <span style={{ fontSize: 11, color: DT.warning }}>No groups found. Create groups in "Groups &amp; Teams" first.</span>
                )}
              </div>
              {group && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${DT.borderHair}` }}>
                  <BookOpen size={14} style={{ color: DT.textTer }} className="shrink-0" />
                  <span style={{ fontSize: 13, color: DT.textSec }}>
                    Adviser: <span style={{ fontWeight: 600, color: adviser && adviser !== "—" ? DT.success : DT.textTer }}>
                      {adviser && adviser !== "—" ? adviser : "Unassigned — set adviser in Groups & Teams"}
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}

          {(role === "panelist" || role === "adviser") && (
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Department</label>
              <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. BMMA Department" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
            </div>
          )}

          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}><Lock size={13} className="inline mr-1 -mt-0.5" />Temporary Password</label>
              <input value={tempPw} onChange={(e) => setTempPw(e.target.value)} type="password" placeholder="Set a temporary password" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
              <span style={{ fontSize: 11, color: DT.textTer }}>Minimum 6 characters. User can change it after first login.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
          {isEdit ? (
            <button onClick={handleDeactivate} disabled={saving || user?.role === "coordinator"}
              className="px-4 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/[0.03]"
              style={{ border: `1px solid rgba(248,113,113,0.30)`, color: DT.red, fontSize: 13, fontWeight: 600 }}>
              {user?.status === "Active" ? "Deactivate" : "Activate"} Account
            </button>
          ) : (
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl transition cursor-pointer hover:bg-white/[0.04]"
              style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 13, fontWeight: 600 }}>Cancel</button>
          )}
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 hover:opacity-90"
            style={{ background: DT.yellow, color: DT.base, fontFamily: FT.h, fontSize: 14, fontWeight: 700 }}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? "Save Changes" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Delete Confirmation ═══ */
function DeleteConfirmModal({ user, deleting, onConfirm, onClose }: { user: UserRecord; deleting: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ fontFamily: FT.b }}>
      <div className="absolute inset-0" style={{ background: "rgba(4,6,12,0.80)", backdropFilter: "blur(8px)" }} onClick={onClose} />
      <div className="relative w-full max-w-[440px] rounded-2xl overflow-hidden"
        style={{ background: `linear-gradient(145deg, ${DT.raised}, ${DT.dark})`, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowXl }}>
        {/* Icon + Warning */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: DT.redDim, border: `1px solid rgba(248,113,113,0.15)` }}>
            <Trash2 size={22} style={{ color: DT.red }} />
          </div>
          <h3 style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri, textAlign: "center" }}>Delete User Account?</h3>
          <p className="mt-2 text-center" style={{ fontSize: 14, color: DT.textSec, lineHeight: 1.6 }}>
            This will permanently remove <span style={{ fontWeight: 600, color: DT.textPri }}>{user.name}</span>'s account and all associated data. This cannot be undone.
          </p>
        </div>

        {/* User summary card */}
        <div className="mx-6 mb-5 flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${DT.borderHair}` }}>
          <AvatarCircle initials={user.avatar} size={36} avatarUrl={user.avatarUrl} />
          <div className="flex-1 min-w-0">
            <div className="truncate" style={{ fontFamily: FT.h, fontSize: 14, fontWeight: 600, color: DT.textPri }}>{user.name}</div>
            <div className="truncate" style={{ fontSize: 12, color: DT.textTer }}>{user.email}</div>
          </div>
          <RoleBadges user={user} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl transition cursor-pointer hover:bg-white/[0.04] text-center"
            style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 13, fontWeight: 600 }}>Cancel</button>
          <button onClick={onConfirm} disabled={deleting}
            className="flex-1 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:opacity-90"
            style={{ background: DT.red, color: "#fff", fontFamily: FT.h, fontSize: 14, fontWeight: 700 }}>
            {deleting && <Loader2 size={14} className="animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Mobile User Card ═══ */
function MobileUserCard({ user, idx, onEdit, onToggle, onDelete }: { user: UserRecord; idx: number; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  return (
    <div className="rounded-2xl p-4 transition-all duration-200"
      style={{ background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`, border: `1px solid ${DT.borderSub}` }}>
      <div className="flex items-start gap-3">
        <AvatarCircle initials={user.avatar} size={40} idx={idx} avatarUrl={user.avatarUrl} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate" style={{ fontFamily: FT.h, fontSize: 15, fontWeight: 600, color: DT.textPri }}>{user.name}</span>
            <span className="flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: user.status === "Active" ? DT.success : DT.textDis }} />
            </span>
          </div>
          <div className="truncate mt-0.5" style={{ fontSize: 12, color: DT.textTer }}>{user.email}</div>
          <div className="flex items-center gap-2 mt-2">
            <RoleBadges user={user} />
            {user.group && user.group !== "—" && (
              <span style={{ fontSize: 11, color: DT.textTer }}>{user.group}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 mt-3 pt-3" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
        <button onClick={onEdit} className="px-3 py-1.5 rounded-lg transition cursor-pointer hover:bg-white/[0.06] flex items-center gap-1.5"
          style={{ color: DT.textTer, fontSize: 12 }}><Pencil size={12} /> Edit</button>
        {user.role !== "coordinator" && (
          <button onClick={onToggle} className="px-3 py-1.5 rounded-lg transition cursor-pointer hover:bg-white/[0.06] flex items-center gap-1.5"
            style={{ color: user.status === "Active" ? DT.success : DT.textDis, fontSize: 12 }}>
            {user.status === "Active" ? <><ToggleRight size={13} /> Active</> : <><ToggleLeft size={13} /> Inactive</>}
          </button>
        )}
        <button onClick={onDelete} className="px-3 py-1.5 rounded-lg transition cursor-pointer hover:bg-white/[0.06] flex items-center gap-1.5"
          style={{ color: DT.red, fontSize: 12 }}><Trash2 size={12} /> Delete</button>
      </div>
    </div>
  );
}

/* ═══ Main Export ═══ */
export function UserManagementPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const perPage = 10;

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { users: data } = await apiFetch<{ users: UserRecord[] }>("/users");
      setUsers(data || []);
    } catch (err) { console.error("Failed to fetch users:", err); toast.error("Failed to load user accounts."); }
    finally { setLoadingUsers(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const debouncedSearch = useDebouncedValue(search, 200);

  const tabs = useMemo(() => {
    const studentCount = users.filter((u) => u.role === "student").length;
    const panelistCount = users.filter((u) => hasRole(u, "panelist")).length;
    const adviserCount = users.filter((u) => hasRole(u, "adviser")).length;
    return [
      { key: "all" as TabKey, label: "All Users", count: users.length, icon: <Users size={15} /> },
      { key: "students" as TabKey, label: "Students", count: studentCount, icon: <GraduationCap size={15} /> },
      { key: "panelists" as TabKey, label: "Panelists", count: panelistCount, icon: <ShieldCheck size={15} /> },
      { key: "advisers" as TabKey, label: "Advisers", count: adviserCount, icon: <BookOpen size={15} /> },
    ];
  }, [users]);

  const stats = useMemo(() => {
    const active = users.filter((u) => u.status === "Active").length;
    const inactive = users.filter((u) => u.status === "Inactive").length;
    const recent = users.filter((u) => {
      if (!u.createdAt) return false;
      const d = new Date(u.createdAt);
      return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
    }).length;
    return { total: users.length, active, inactive, recent };
  }, [users]);

  const { filtered, total, totalPages, paged, uniqueGroups } = useMemo(() => {
    let f = [...users];
    if (activeTab === "students") f = f.filter((u) => u.role === "student");
    else if (activeTab === "panelists") f = f.filter((u) => hasRole(u, "panelist"));
    else if (activeTab === "advisers") f = f.filter((u) => hasRole(u, "adviser"));
    if (debouncedSearch.trim()) { const q = debouncedSearch.toLowerCase(); f = f.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)); }
    if (roleFilter) f = f.filter((u) => hasRole(u, roleFilter.toLowerCase() as UserRole));
    if (statusFilter) f = f.filter((u) => u.status === statusFilter);
    if (groupFilter) f = f.filter((u) => u.group === groupFilter);

    const t = f.length;
    const tp = Math.max(1, Math.ceil(t / perPage));
    const pg = f.slice((page - 1) * perPage, page * perPage);
    const ug = [...new Set(users.map((u) => u.group).filter((g) => g && g !== "—"))].sort();
    return { filtered: f, total: t, totalPages: tp, paged: pg, uniqueGroups: ug };
  }, [users, activeTab, debouncedSearch, roleFilter, statusFilter, groupFilter, page, perPage]);

  const handleEdit = (u: UserRecord) => { setEditUser(u); setModalMode("edit"); };
  const handleToggleStatus = async (u: UserRecord) => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      await apiFetch(`/users/${u.id}/toggle-status`, { method: "PUT" }, session?.access_token!);
      toast.success(`${u.name} ${u.status === "Active" ? "deactivated" : "activated"}.`);
      fetchUsers();
    } catch (err: any) { toast.error(err.message || "Failed to toggle status."); }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      await apiFetch(`/users/${deleteTarget.id}`, { method: "DELETE" }, session?.access_token!);
      toast.success(`${deleteTarget.name}'s account has been permanently deleted.`);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: any) {
      console.error("Delete user error:", err);
      toast.error(err.message || "Failed to delete user.");
    } finally { setDeleting(false); }
  };

  const activeFilters = [roleFilter, statusFilter, groupFilter].filter(Boolean).length;

  return (
    <PageShell>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>User Accounts</h1>
          <p className="mt-1" style={{ fontSize: 14, color: DT.textSec }}>Manage student, panelist, and adviser accounts</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button onClick={fetchUsers}
            className="flex items-center justify-center w-10 h-10 rounded-xl transition cursor-pointer hover:bg-white/[0.06]"
            style={{ border: `1px solid ${DT.borderDef}`, color: DT.textTer }}
            title="Refresh">
            <RefreshCw size={15} className={loadingUsers ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer hover:bg-white/[0.04]"
            style={{ border: `1px solid ${withAlpha(DT.blue, 0.19)}`, background: DT.blueDim, color: DT.blue, fontFamily: FT.h, fontSize: 13, fontWeight: 700 }}>
            <Upload size={15} /> <span className="hidden sm:inline">Bulk Import</span>
          </button>
          <button onClick={() => { setEditUser(null); setModalMode("add"); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90"
            style={{ background: DT.yellow, color: DT.base, fontFamily: FT.h, fontSize: 14, fontWeight: 700 }}>
            <Plus size={17} /> Add User
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Users size={18} />} label="Total Users" value={stats.total} accent={DT.blue} accentDim={DT.blueDim} />
        <StatCard icon={<UserCheck size={18} />} label="Active" value={stats.active} accent={DT.success} accentDim={DT.successDim} />
        <StatCard icon={<UserX size={18} />} label="Inactive" value={stats.inactive} accent={DT.red} accentDim={DT.redDim} />
        <StatCard icon={<Clock size={18} />} label="Added This Week" value={stats.recent} accent={DT.yellow} accentDim={DT.yellowDim} />
      </div>

      {/* ── Tab Bar (Pill-style) ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        {tabs.map((t) => {
          const active = activeTab === t.key;
          return (
            <button key={t.key} onClick={() => { setActiveTab(t.key); setPage(1); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap"
              style={{
                background: active ? withAlpha(DT.blue, 0.10) : "transparent",
                border: `1px solid ${active ? withAlpha(DT.blue, 0.18) : "transparent"}`,
                color: active ? DT.blue : DT.textTer,
                fontSize: 13, fontWeight: active ? 600 : 400,
              }}>
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
              <span className="px-1.5 py-0.5 rounded-md min-w-[22px] text-center"
                style={{
                  fontSize: 11, fontWeight: 700,
                  background: active ? withAlpha(DT.blue, 0.15) : "rgba(255,255,255,0.04)",
                  color: active ? DT.blue : DT.textDis,
                }}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search + Filters ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {/* Search bar — proper padding-left so icon doesn't overlap */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: DT.textTer }} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or email..."
              className="w-full rounded-xl transition"
              style={{
                ...inputStyle,
                paddingLeft: 38,
                paddingRight: search ? 36 : 12,
                background: DT.elevated,
                border: `1px solid ${DT.borderSub}`,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = DT.blue; e.currentTarget.style.boxShadow = `0 0 0 3px ${withAlpha(DT.blue, 0.08)}`; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = DT.borderSub; e.currentTarget.style.boxShadow = "none"; }}
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md transition cursor-pointer hover:bg-white/[0.08]"
                style={{ color: DT.textTer }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition cursor-pointer hover:bg-white/[0.04] shrink-0"
            style={{
              border: `1px solid ${activeFilters > 0 ? withAlpha(DT.blue, 0.25) : DT.borderDef}`,
              background: activeFilters > 0 ? withAlpha(DT.blue, 0.06) : "transparent",
              color: activeFilters > 0 ? DT.blue : DT.textTer,
              fontSize: 13, fontWeight: 500,
            }}>
            <Filter size={15} />
            <span className="hidden sm:inline">Filters</span>
            {activeFilters > 0 && (
              <span className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: DT.blue, color: "#fff", fontSize: 10, fontWeight: 700 }}>
                {activeFilters}
              </span>
            )}
          </button>

          {/* Export */}
          <button className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition cursor-pointer hover:bg-white/[0.04] shrink-0"
            style={{ border: `1px solid ${DT.borderDef}`, color: DT.textTer, fontSize: 13 }}>
            <Download size={15} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>

        {/* Expanded filter row */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl" style={{ background: withAlpha(DT.elevated, 0.6), border: `1px solid ${DT.borderHair}` }}>
            <span style={{ fontSize: 12, color: DT.textTer, fontWeight: 500 }}>Filter by:</span>
            <FilterSelect value={roleFilter} onChange={(v) => { setRoleFilter(v); setPage(1); }} options={["Student", "Panelist", "Adviser", "Coordinator"]} placeholder="All Roles" />
            <FilterSelect value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} options={["Active", "Inactive"]} placeholder="All Status" />
            {uniqueGroups.length > 0 && <FilterSelect value={groupFilter} onChange={(v) => { setGroupFilter(v); setPage(1); }} options={uniqueGroups} placeholder="All Groups" />}
            {activeFilters > 0 && (
              <button onClick={() => { setRoleFilter(""); setStatusFilter(""); setGroupFilter(""); setPage(1); }}
                className="text-xs px-2.5 py-1.5 rounded-lg transition cursor-pointer hover:bg-white/[0.06]"
                style={{ color: DT.red, fontWeight: 600 }}>
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Table (Desktop) ── */}
      <div className="hidden md:block rounded-2xl overflow-hidden" style={{ background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm }}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                {["NAME", "EMAIL", "ROLE", "GROUP", "ADVISER", "STATUS", ""].map((h) => (
                  <th key={h || "actions"} className={`${h === "" ? "text-right" : "text-left"} px-5 py-3.5`}
                    style={{ fontFamily: FT.m, fontWeight: 500, fontSize: 10, letterSpacing: "0.08em", color: DT.textTer, borderBottom: `1px solid ${DT.borderHair}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingUsers ? (
                <TableSkeleton rows={5} />
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: DT.blueDim, border: `1px solid ${withAlpha(DT.blue, 0.12)}` }}>
                        <Search size={22} style={{ color: DT.blue }} />
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: DT.textPri }}>
                        {users.length === 0 ? "No user accounts yet" : "No users match your filters"}
                      </div>
                      <div style={{ fontSize: 13, color: DT.textTer, maxWidth: 300 }}>
                        {users.length === 0 ? "Click \"Add User\" to create the first account." : "Try adjusting your search or filters."}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : paged.map((u, idx) => {
                return (
                  <tr key={u.id} className="group transition hover:bg-white/[0.015]" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <AvatarCircle initials={u.avatar} size={34} idx={idx} avatarUrl={u.avatarUrl} />
                        <span style={{ fontWeight: 600, color: DT.textPri, fontSize: 14 }}>{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5" style={{ color: DT.textTer, fontSize: 13 }}>{u.email}</td>
                    <td className="px-5 py-3.5">
                      <RoleBadges user={u} />
                    </td>
                    <td className="px-5 py-3.5" style={{ color: DT.textTer, fontSize: 13 }}>{u.group && u.group !== "—" ? u.group : <span style={{ color: DT.textDis }}>—</span>}</td>
                    <td className="px-5 py-3.5" style={{ color: DT.textTer, fontSize: 13 }}>{u.adviser && u.adviser !== "—" ? u.adviser : <span style={{ color: DT.textDis }}>—</span>}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                        style={{
                          fontSize: 11, fontWeight: 600,
                          color: u.status === "Active" ? DT.success : DT.textDis,
                          background: u.status === "Active" ? DT.successDim : "rgba(255,255,255,0.03)",
                          border: `1px solid ${u.status === "Active" ? "rgba(74,222,128,0.12)" : DT.borderHair}`,
                        }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: u.status === "Active" ? DT.success : DT.textDis }} />
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <ActionMenu user={u} onEdit={() => handleEdit(u)} onToggle={() => handleToggleStatus(u)} onDelete={() => setDeleteTarget(u)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderTop: `1px solid ${DT.borderHair}` }}>
            <span style={{ fontSize: 12, color: DT.textTer }}>
              Showing <span style={{ fontWeight: 600, color: DT.textSec }}>{Math.min((page - 1) * perPage + 1, total)}</span>–<span style={{ fontWeight: 600, color: DT.textSec }}>{Math.min(page * perPage, total)}</span> of <span style={{ fontWeight: 600, color: DT.textSec }}>{total}</span>
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="p-2 rounded-lg transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.05]" style={{ color: DT.textTer }}>
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className="w-8 h-8 rounded-lg transition cursor-pointer"
                  style={{
                    fontSize: 12, fontWeight: 600,
                    background: p === page ? DT.blue : "transparent",
                    color: p === page ? "white" : DT.textTer,
                    boxShadow: p === page ? `0 0 12px ${withAlpha(DT.blue, 0.20)}` : "none",
                  }}>{p}</button>
              ))}
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                className="p-2 rounded-lg transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.05]" style={{ color: DT.textTer }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile Card View ── */}
      <div className="md:hidden space-y-3">
        {loadingUsers ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl p-4" style={{ background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`, border: `1px solid ${DT.borderSub}` }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full" style={{ background: DT.elevated, animation: `shimmer 2s ease-in-out infinite ${i * 150}ms` }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 rounded-lg" style={{ width: "60%", background: DT.elevated, animation: `shimmer 2s ease-in-out infinite ${i * 150 + 50}ms` }} />
                  <div className="h-2.5 rounded-lg" style={{ width: "80%", background: DT.elevated, animation: `shimmer 2s ease-in-out infinite ${i * 150 + 100}ms` }} />
                </div>
              </div>
            </div>
          ))
        ) : paged.length === 0 ? (
          <div className="text-center py-12 rounded-2xl" style={{ background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`, border: `1px solid ${DT.borderSub}` }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: DT.blueDim }}>
              <Search size={20} style={{ color: DT.blue }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: DT.textPri }}>
              {users.length === 0 ? "No user accounts yet" : "No users match"}
            </div>
          </div>
        ) : paged.map((u, i) => (
          <MobileUserCard key={u.id} user={u} idx={i} onEdit={() => handleEdit(u)} onToggle={() => handleToggleStatus(u)} onDelete={() => setDeleteTarget(u)} />
        ))}

        {/* Mobile pagination */}
        {total > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
              className="p-2 rounded-lg transition cursor-pointer disabled:opacity-30" style={{ color: DT.textTer }}><ChevronLeft size={16} /></button>
            <span style={{ fontSize: 13, color: DT.textSec, fontWeight: 500 }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
              className="p-2 rounded-lg transition cursor-pointer disabled:opacity-30" style={{ color: DT.textTer }}><ChevronRight size={16} /></button>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modalMode && <UserModal mode={modalMode} user={editUser} onClose={() => { setModalMode(null); setEditUser(null); }} onSaved={fetchUsers} />}
      {showBulkImport && (
        <Suspense fallback={null}>
          <BulkImportModal onClose={() => setShowBulkImport(false)} onDone={fetchUsers} />
        </Suspense>
      )}
      {deleteTarget && <DeleteConfirmModal user={deleteTarget} deleting={deleting} onConfirm={handleDeleteUser} onClose={() => setDeleteTarget(null)} />}

      <style>{`@keyframes shimmer{0%,100%{opacity:0.3}50%{opacity:0.6}}`}</style>
    </PageShell>
  );
}
