import { useState, useRef, useEffect, useCallback } from "react";
import {
  Settings, User, Bell, Shield, Calendar, FileText,
  Save, Eye, EyeOff, ChevronDown, ChevronUp, Upload,
  Mail, Clock, Globe, Palette, ToggleLeft, ToggleRight,
  Check, Loader2, LogOut, Lock, AlertTriangle, Camera,
  RotateCcw,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { EmailDigestPreview } from "./EmailDigestPreview";
import { supabase, apiFetch } from "../lib/supabase";
import { toast } from "sonner";
import { useInView, Fade, cardBg, inputStyle, focusIn, focusOut } from "./ui/shared-ui";
import { PageShell } from "./PageShell";
import { replayOnboardingTour } from "./OnboardingTour";

/* ═══ Helpers ═══ */

const readOnlyStyle: React.CSSProperties = { ...inputStyle, background: "rgba(255,255,255,0.02)", color: DT.textDis, cursor: "not-allowed" };

/* Section */
function SettingsSection({ icon, iconAccent, title, subtitle, children, defaultOpen = true }: {
  icon: React.ReactNode; iconAccent: string; title: string; subtitle: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 p-5 cursor-pointer transition text-left hover:bg-white/[0.02]">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: withAlpha(iconAccent, 0.08), color: iconAccent }}>{icon}</div>
        <div className="flex-1 min-w-0">
          <h3 style={{ fontSize: 15, fontWeight: 600, color: DT.textPri }}>{title}</h3>
          <p style={{ fontSize: 12, color: DT.textTer }}>{subtitle}</p>
        </div>
        {open ? <ChevronUp size={18} style={{ color: DT.textTer }} /> : <ChevronDown size={18} style={{ color: DT.textTer }} />}
      </button>
      {open && <div className="p-5" style={{ borderTop: `1px solid ${DT.borderHair}` }}>{children}</div>}
    </div>
  );
}

/* Toggle */
function Toggle({ label, description, value, onToggle }: { label: string; description?: string; value: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3" style={{ borderBottom: `1px solid ${DT.borderHair}` }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: DT.textPri }}>{label}</p>
        {description && <p style={{ fontSize: 11, color: DT.textTer }}>{description}</p>}
      </div>
      <button onClick={onToggle} className="cursor-pointer shrink-0">
        {value ? <ToggleRight size={28} style={{ color: DT.blue }} /> : <ToggleLeft size={28} style={{ color: DT.textDis }} />}
      </button>
    </div>
  );
}

/* Resize image */
function resizeImage(file: File, maxSize = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > h) { h = (h / w) * maxSize; w = maxSize; }
        else { w = (w / h) * maxSize; h = maxSize; }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface Props {
  onLogout: () => void;
}

/* ═══ Main Export ═══ */
export function CoordinatorSettingsPage({ onLogout }: Props) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [userSettings, setUserSettings] = useState<any>({});
  const [portalSettings, setPortalSettings] = useState<any>({});

  /* Editable profile fields */
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* Password */
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  /* Notification prefs */
  const [notifSubmissions, setNotifSubmissions] = useState(true);
  const [notifDefenseRemind, setNotifDefenseRemind] = useState(true);
  const [notifAnnounceConfirm, setNotifAnnounceConfirm] = useState(false);
  const [notifArchiveDeadline, setNotifArchiveDeadline] = useState(true);
  const [notifPanelFeedback, setNotifPanelFeedback] = useState(true);

  /* Portal settings */
  const [academicTerm, setAcademicTerm] = useState("2nd");
  const [preDefenseDeadline, setPreDefenseDeadline] = useState("2026-04-25");
  const [defenseWeekStart, setDefenseWeekStart] = useState("2026-05-05");
  const [archiveDeadline, setArchiveDeadline] = useState("2026-05-23");
  const [maxPdfSize, setMaxPdfSize] = useState("50");
  const [maxOutputSize, setMaxOutputSize] = useState("2048");
  const [allowLate, setAllowLate] = useState(false);
  const [requireOrigCheck, setRequireOrigCheck] = useState(true);
  const [requireAiDecl, setRequireAiDecl] = useState(true);
  const [allowReplacement, setAllowReplacement] = useState(true);
  const [portalName, setPortalName] = useState("Hue We Are — STI College San Fernando");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /* ─── Fetch all data ─── */
  const fetchAll = useCallback(async () => {
    try {
      const [ctx, settingsRes, portalRes] = await Promise.all([
        apiFetch<any>("/me/context"),
        apiFetch<any>("/me/settings"),
        apiFetch<any>("/portal-settings"),
      ]);

      const p = ctx.profile;
      setProfile(p);
      setName(p?.name || "");
      setDepartment(p?.department || "BMMA — Bachelor of Multimedia Arts");
      setContactNumber(p?.contactNumber || "");
      setAvatarPreview(p?.avatarUrl || null);

      const us = settingsRes.settings || {};
      setUserSettings(us);
      setNotifSubmissions(us.notifSubmissions !== undefined ? us.notifSubmissions : true);
      setNotifDefenseRemind(us.notifDefenseRemind !== undefined ? us.notifDefenseRemind : true);
      setNotifAnnounceConfirm(us.notifAnnounceConfirm !== undefined ? us.notifAnnounceConfirm : false);
      setNotifArchiveDeadline(us.notifArchiveDeadline !== undefined ? us.notifArchiveDeadline : true);
      setNotifPanelFeedback(us.notifPanelFeedback !== undefined ? us.notifPanelFeedback : true);

      const ps = portalRes.settings || {};
      setPortalSettings(ps);
      if (ps.academicTerm) setAcademicTerm(ps.academicTerm);
      if (ps.preDefenseDeadline) setPreDefenseDeadline(ps.preDefenseDeadline);
      if (ps.defenseWeekStart) setDefenseWeekStart(ps.defenseWeekStart);
      if (ps.archiveDeadline) setArchiveDeadline(ps.archiveDeadline);
      if (ps.maxPdfSize) setMaxPdfSize(ps.maxPdfSize);
      if (ps.maxOutputSize) setMaxOutputSize(ps.maxOutputSize);
      if (ps.allowLate !== undefined) setAllowLate(ps.allowLate);
      if (ps.requireOrigCheck !== undefined) setRequireOrigCheck(ps.requireOrigCheck);
      if (ps.requireAiDecl !== undefined) setRequireAiDecl(ps.requireAiDecl);
      if (ps.allowReplacement !== undefined) setAllowReplacement(ps.allowReplacement);
      if (ps.portalName) setPortalName(ps.portalName);
    } catch (err) {
      console.error("Failed to fetch coordinator settings:", err);
      toast.error("Failed to load settings data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ─── Avatar upload ─── */
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB."); return; }
    try {
      setUploading(true);
      const dataUrl = await resizeImage(file);
      setAvatarPreview(dataUrl);
      await apiFetch("/me/profile", { method: "PUT", body: JSON.stringify({ avatarUrl: dataUrl }) });
      toast.success("Profile picture updated!");
    } catch (err: any) { toast.error("Failed to upload photo."); }
    finally { setUploading(false); }
  }, []);

  /* ─── Save All ─── */
  const handleSaveAll = useCallback(async () => {
    try {
      setSaving(true);
      await Promise.all([
        apiFetch("/me/profile", {
          method: "PUT",
          body: JSON.stringify({ name: name.trim(), department, contactNumber }),
        }),
        apiFetch("/me/settings", {
          method: "PUT",
          body: JSON.stringify({
            notifSubmissions, notifDefenseRemind, notifAnnounceConfirm,
            notifArchiveDeadline, notifPanelFeedback,
          }),
        }),
        apiFetch("/portal-settings", {
          method: "PUT",
          body: JSON.stringify({
            academicTerm, preDefenseDeadline, defenseWeekStart, archiveDeadline,
            maxPdfSize, maxOutputSize, allowLate, requireOrigCheck,
            requireAiDecl, allowReplacement, portalName,
          }),
        }),
      ]);
      setSaved(true);
      toast.success("All settings saved successfully!");
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }, [name, department, contactNumber, notifSubmissions, notifDefenseRemind, notifAnnounceConfirm, notifArchiveDeadline, notifPanelFeedback, academicTerm, preDefenseDeadline, defenseWeekStart, archiveDeadline, maxPdfSize, maxOutputSize, allowLate, requireOrigCheck, requireAiDecl, allowReplacement, portalName]);

  /* ─── Password ─── */
  const handlePasswordChange = useCallback(async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match."); return; }
    try {
      setChangingPw(true);
      await apiFetch("/me/password", { method: "PUT", body: JSON.stringify({ newPassword }) });
      // Re-authenticate with new password to keep the session alive
      if (profile?.email) {
        await supabase.auth.signInWithPassword({ email: profile.email, password: newPassword });
      }
      toast.success("Password changed successfully!");
      setNewPassword(""); setConfirmPassword("");
    } catch (err: any) { toast.error(err.message || "Failed to change password."); }
    finally { setChangingPw(false); }
  }, [newPassword, confirmPassword, profile?.email]);

  const passStrength = newPassword.length === 0 ? 0 : newPassword.length < 6 ? 1 : newPassword.length < 10 ? 2 : 3;
  const strengthLabel = ["", "Weak", "Good", "Strong"][passStrength];
  const strengthColor = ["", DT.error, DT.warning, DT.success][passStrength];

  const initials = (profile?.name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" style={{ fontFamily: FT.b }}>
        <Loader2 size={28} className="animate-spin" style={{ color: DT.blue }} />
        <span className="ml-3" style={{ fontSize: 14, color: DT.textSec }}>Loading settings...</span>
      </div>
    );
  }

  return (
    <PageShell className="space-y-5 pb-8">
      <Fade delay={0}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>Settings</h1>
            <p className="mt-1" style={{ fontSize: 14, color: DT.textSec }}>Manage your profile, portal preferences, and system configuration</p>
          </div>
          <button onClick={handleSaveAll} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90 disabled:opacity-50"
            style={{ background: saved ? DT.success : DT.yellow, color: saved ? "white" : DT.base, fontFamily: FT.h, fontSize: 14, fontWeight: 700 }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </Fade>

      {/* Profile */}
      <Fade delay={60}>
        <SettingsSection icon={<User size={20} />} iconAccent={DT.blue} title="Profile Information" subtitle="Your personal and account details">
          <div className="space-y-4">
            <div className="flex items-center gap-5 mb-2">
              <div className="relative group shrink-0">
                <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
                  style={{
                    background: avatarPreview ? "transparent" : DT.stiBlue,
                    border: `3px solid ${DT.borderDef}`,
                  }}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white" style={{ fontSize: 20, fontWeight: 700 }}>{initials}</span>
                  )}
                </div>
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
                  {uploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera size={18} style={{ color: "white" }} />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: DT.textPri }}>{name || profile?.name}</p>
                <p style={{ fontSize: 12, color: DT.textTer }}>Capstone Coordinator · BMMA Program</p>
                <button onClick={() => fileRef.current?.click()} className="mt-1 flex items-center gap-1.5 cursor-pointer" style={{ fontSize: 11, fontWeight: 600, color: DT.blue }}>
                  <Upload size={12} /> Change Photo
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Full Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Email</label>
                <input value={profile?.email || ""} readOnly style={readOnlyStyle} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Department</label>
                <input value={department} onChange={(e) => setDepartment(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Contact Number</label>
                <input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
              </div>
            </div>
          </div>
        </SettingsSection>
      </Fade>

      {/* Security */}
      <Fade delay={120}>
        <SettingsSection icon={<Shield size={20} />} iconAccent={DT.red} title="Security" subtitle="Password and access settings" defaultOpen={false}>
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>New Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" style={{ ...inputStyle, paddingRight: 40 }}
                  onFocus={focusIn} onBlur={focusOut} />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: DT.textTer }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {newPassword.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-all" style={{ background: passStrength >= i ? strengthColor : DT.borderDef }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: strengthColor }}>{strengthLabel}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Confirm New Password</label>
              <div className="relative">
                <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" style={{ ...inputStyle, paddingRight: 40 }}
                  onFocus={focusIn} onBlur={focusOut} />
                <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: DT.textTer }}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                <div className="flex items-center gap-1 mt-0.5">
                  <AlertTriangle size={12} style={{ color: DT.error }} />
                  <span style={{ fontSize: 11, color: DT.error }}>Passwords don't match</span>
                </div>
              )}
            </div>
            <button onClick={handlePasswordChange} disabled={changingPw || newPassword.length < 6 || newPassword !== confirmPassword}
              className="px-4 py-2 rounded-xl transition cursor-pointer hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
              style={{ background: DT.blue, color: "white", fontSize: 13, fontWeight: 600 }}>
              {changingPw ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
              Update Password
            </button>
          </div>
        </SettingsSection>
      </Fade>

      {/* Notifications */}
      <Fade delay={180}>
        <SettingsSection icon={<Bell size={20} />} iconAccent={DT.yellow} title="Notification Preferences" subtitle="Control what notifications you receive" defaultOpen={false}>
          <div className="space-y-0">
            <Toggle label="Email notifications for new submissions" description="Receive an email when a group submits a manuscript or file" value={notifSubmissions} onToggle={() => setNotifSubmissions(!notifSubmissions)} />
            <Toggle label="Defense schedule reminders" description="Get reminded 24 hours before each defense session" value={notifDefenseRemind} onToggle={() => setNotifDefenseRemind(!notifDefenseRemind)} />
            <Toggle label="Announcement confirmation emails" description="Receive a copy of every announcement you publish" value={notifAnnounceConfirm} onToggle={() => setNotifAnnounceConfirm(!notifAnnounceConfirm)} />
            <Toggle label="Archive deadline alerts" description="Notify when groups are approaching archive deadlines" value={notifArchiveDeadline} onToggle={() => setNotifArchiveDeadline(!notifArchiveDeadline)} />
            <Toggle label="Panel feedback submitted" description="Get notified when a panelist submits their grade/feedback" value={notifPanelFeedback} onToggle={() => setNotifPanelFeedback(!notifPanelFeedback)} />
          </div>
        </SettingsSection>
      </Fade>

      {/* Capstone Config */}
      <Fade delay={240}>
        <SettingsSection icon={<Calendar size={20} />} iconAccent={DT.purple} title="Capstone Term Configuration" subtitle="Set key dates and deadlines for the current capstone cycle">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Academic Term</label>
                <select value={academicTerm} onChange={(e) => setAcademicTerm(e.target.value)} style={inputStyle} className="cursor-pointer" onFocus={focusIn} onBlur={focusOut}>
                  <option value="1st">1st Semester 2025–2026</option>
                  <option value="2nd">2nd Semester 2025–2026</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Program</label>
                <input value="BMMA — Bachelor of Multimedia Arts" readOnly style={readOnlyStyle} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Pre-Defense Deadline</label>
                <input type="date" value={preDefenseDeadline} onChange={(e) => setPreDefenseDeadline(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Defense Week Start</label>
                <input type="date" value={defenseWeekStart} onChange={(e) => setDefenseWeekStart(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Archive Deadline</label>
                <input type="date" value={archiveDeadline} onChange={(e) => setArchiveDeadline(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
              </div>
            </div>
          </div>
        </SettingsSection>
      </Fade>

      {/* Submission Rules */}
      <Fade delay={300}>
        <SettingsSection icon={<FileText size={20} />} iconAccent={DT.success} title="Submission Rules" subtitle="Configure file upload and submission policies" defaultOpen={false}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Max Manuscript PDF Size</label>
                <select value={maxPdfSize} onChange={(e) => setMaxPdfSize(e.target.value)} style={inputStyle} className="cursor-pointer" onFocus={focusIn} onBlur={focusOut}>
                  <option value="25">25 MB</option><option value="50">50 MB</option><option value="100">100 MB</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Max Project Output Size</label>
                <select value={maxOutputSize} onChange={(e) => setMaxOutputSize(e.target.value)} style={inputStyle} className="cursor-pointer" onFocus={focusIn} onBlur={focusOut}>
                  <option value="500">500 MB</option><option value="1024">1 GB</option><option value="2048">2 GB</option><option value="4096">4 GB</option>
                </select>
              </div>
            </div>
            <div className="space-y-0">
              <Toggle label="Allow late submissions" description="Groups can submit after deadline (flagged as late)" value={allowLate} onToggle={() => setAllowLate(!allowLate)} />
              <Toggle label="Require originality check" description="Mandate AI detection check certificate before final submission" value={requireOrigCheck} onToggle={() => setRequireOrigCheck(!requireOrigCheck)} />
              <Toggle label="Require AI declaration" description="Mandate AI usage declaration form" value={requireAiDecl} onToggle={() => setRequireAiDecl(!requireAiDecl)} />
              <Toggle label="Allow submission replacement" description="Students can replace their submitted manuscript before defense" value={allowReplacement} onToggle={() => setAllowReplacement(!allowReplacement)} />
            </div>
          </div>
        </SettingsSection>
      </Fade>

      {/* Appearance */}
      <Fade delay={360}>
        <SettingsSection icon={<Palette size={20} />} iconAccent={DT.warning} title="Appearance & Branding" subtitle="Customize the portal look and feel" defaultOpen={false}>
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, fontWeight: 600, color: DT.textSec }}>Portal Name</label>
              <input value={portalName} onChange={(e) => setPortalName(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Primary", color: DT.stiBlue },
                { label: "Accent", color: DT.yellow },
                { label: "Coordinator", color: DT.red },
                { label: "Background", color: DT.base },
              ].map((c) => (
                <div key={c.label} className="flex flex-col gap-1.5 items-center">
                  <label style={{ fontSize: 11, fontWeight: 600, color: DT.textTer }}>{c.label}</label>
                  <div className="w-10 h-10 rounded-xl cursor-pointer" style={{ background: c.color, border: `2px solid ${DT.borderDef}` }} title={c.color} />
                </div>
              ))}
            </div>
          </div>
        </SettingsSection>
      </Fade>

      {/* Email Digest Templates */}
      <Fade delay={390}>
        <SettingsSection icon={<Mail size={20} />} iconAccent={DT.blue} title="Email Digest Templates" subtitle="Preview and manage notification email digests for all users" defaultOpen={false}>
          <EmailDigestPreview />
        </SettingsSection>
      </Fade>

      {/* Replay Onboarding Tour */}
      <Fade delay={400}>
        <div className="rounded-xl overflow-hidden p-5" style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: withAlpha(DT.purple, 0.08), color: DT.purple }}>
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: DT.textPri }}>Onboarding Tour</h3>
                <p style={{ fontSize: 12, color: DT.textTer }}>Replay the guided walkthrough of the portal features</p>
              </div>
            </div>
            <button
              onClick={() => { replayOnboardingTour(); toast.success("Starting tour..."); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90"
              style={{ background: withAlpha(DT.purple, 0.1), color: DT.purple, border: `1px solid ${withAlpha(DT.purple, 0.15)}`, fontSize: 13, fontWeight: 600 }}>
              <RotateCcw size={14} /> Replay Tour
            </button>
          </div>
        </div>
      </Fade>

      {/* Sign Out */}
      <Fade delay={410}>
        <div className="rounded-xl overflow-hidden p-5" style={{ background: cardBg, border: `1px solid rgba(248,113,113,0.12)`, boxShadow: DT.shadowSm }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: DT.textPri }}>Sign Out</h3>
              <p className="mt-0.5" style={{ fontSize: 12, color: DT.textTer }}>You will need to sign in again to access the portal.</p>
            </div>
            <button onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90"
              style={{ background: DT.redDim, color: DT.red, border: `1px solid rgba(248,113,113,0.15)`, fontSize: 13, fontWeight: 600 }}>
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      </Fade>

      {/* Danger Zone */}
      <Fade delay={440}>
        <div className="rounded-xl overflow-hidden p-5" style={{ background: cardBg, border: `1px solid rgba(248,113,113,0.20)`, boxShadow: DT.shadowSm }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: DT.red }}>Danger Zone</h3>
          <p className="mt-0.5" style={{ fontSize: 12, color: DT.textTer }}>Irreversible actions — proceed with caution</p>
          <div className="flex flex-wrap gap-3 mt-4">
            {["Reset All Grades", "Clear All Submissions", "Archive & Close This Term"].map((label) => (
              <button key={label} className="px-4 py-2 rounded-xl transition cursor-pointer hover:bg-white/[0.03]"
                style={{ border: `1px solid rgba(248,113,113,0.30)`, color: DT.red, fontSize: 13, fontWeight: 600 }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </Fade>
    </PageShell>
  );
}