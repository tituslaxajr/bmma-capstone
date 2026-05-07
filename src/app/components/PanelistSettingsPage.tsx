import { useState, useRef, useEffect, useCallback } from "react";
import {
  User, Bell, Shield, Save, Check, Loader2, Eye, EyeOff,
  Lock, AlertTriangle, LogOut, Camera, Upload, RotateCcw,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { supabase, apiFetch } from "../lib/supabase";
import { toast } from "sonner";
import { useInView, Fade, cardBg, inputStyle, focusIn, focusOut } from "./ui/shared-ui";
import { PageShell } from "./PageShell";
import { replayOnboardingTour } from "./OnboardingTour";

/* ═══ Helpers ═══ */

/* Card wrapper */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[20px] p-7 ${className}`} style={{
      background: cardBg,
      border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm,
    }}>{children}</div>
  );
}

/* Toggle */
function Toggle({ label, desc, value, onToggle }: { label: string; desc: string; value: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: DT.textPri }}>{label}</div>
        <div style={{ fontSize: 12, color: DT.textTer }}>{desc}</div>
      </div>
      <button onClick={onToggle}
        className="relative w-11 h-6 rounded-full transition cursor-pointer"
        style={{ background: value ? DT.blue : "rgba(255,255,255,0.10)" }}>
        <div className="absolute top-0.5 w-5 h-5 rounded-full shadow transition-all" style={{
          background: value ? "white" : "rgba(255,255,255,0.4)",
          left: value ? 22 : 2,
        }} />
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

const readOnlyStyle: React.CSSProperties = {
  ...inputStyle, background: "rgba(255,255,255,0.02)", color: DT.textDis, cursor: "not-allowed",
};

interface Props {
  onLogout: () => void;
}

/* ═══ Main Export ═══ */
export function PanelistSettingsPage({ onLogout }: Props) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  /* Profile fields */
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* Notification prefs */
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [manuscriptNotifs, setManuscriptNotifs] = useState(true);
  const [defenseReminders, setDefenseReminders] = useState(true);

  /* Password */
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /* ─── Fetch ─── */
  const fetchAll = useCallback(async () => {
    try {
      const [ctx, settingsRes] = await Promise.all([
        apiFetch<any>("/me/context"),
        apiFetch<any>("/me/settings"),
      ]);

      const p = ctx.profile;
      setProfile(p);
      setName(p?.name || "");
      setDept(p?.department || "BMMA Department");
      setContactNumber(p?.contactNumber || "");
      setAvatarPreview(p?.avatarUrl || null);

      const us = settingsRes.settings || {};
      setEmailNotifs(us.emailNotifs !== undefined ? us.emailNotifs : true);
      setManuscriptNotifs(us.manuscriptNotifs !== undefined ? us.manuscriptNotifs : true);
      setDefenseReminders(us.defenseReminders !== undefined ? us.defenseReminders : true);
    } catch (err) {
      console.error("Failed to fetch panelist settings:", err);
      toast.error("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ─── Avatar ─── */
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
  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      await Promise.all([
        apiFetch("/me/profile", {
          method: "PUT",
          body: JSON.stringify({ name: name.trim(), department: dept, contactNumber }),
        }),
        apiFetch("/me/settings", {
          method: "PUT",
          body: JSON.stringify({ emailNotifs, manuscriptNotifs, defenseReminders }),
        }),
      ]);
      setSaved(true);
      toast.success("Settings saved successfully!");
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }, [name, dept, contactNumber, emailNotifs, manuscriptNotifs, defenseReminders]);

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
    <PageShell className="max-w-[800px] mx-auto space-y-6 pb-8">
      <Fade delay={0}>
        <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>Settings</h1>
        <p className="mt-1" style={{ fontSize: 14, color: DT.textSec }}>Manage your profile and notification preferences.</p>
      </Fade>

      {/* Profile */}
      <Fade delay={60}>
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: DT.blueDim }}><User size={16} style={{ color: DT.blue }} /></div>
            <h3 style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 700, color: DT.textPri }}>Profile Information</h3>
          </div>

          <div className="flex items-center gap-5 mb-6">
            <div className="relative group shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
                style={{
                  background: avatarPreview ? "transparent" : DT.purple,
                  border: `3px solid ${DT.borderDef}`,
                }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white" style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700 }}>{initials}</span>
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
              <div style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>{name || profile?.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, color: DT.purple, background: DT.purpleDim, border: "1px solid rgba(167,139,250,0.15)" }}>Panelist</span>
                <span style={{ fontSize: 12, color: DT.textTer }}>{dept}</span>
              </div>
              <button onClick={() => fileRef.current?.click()} className="mt-1.5 flex items-center gap-1.5 cursor-pointer" style={{ fontSize: 11, fontWeight: 600, color: DT.blue }}>
                <Upload size={12} /> Change Photo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 600, color: DT.textSec }}>Full Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 600, color: DT.textSec }}>Email</label>
              <input value={profile?.email || ""} readOnly style={readOnlyStyle} />
            </div>
            <div>
              <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 600, color: DT.textSec }}>Department</label>
              <input value={dept} onChange={(e) => setDept(e.target.value)} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 600, color: DT.textSec }}>Contact Number</label>
              <input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="e.g. +63 917 123 4567" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
            </div>
          </div>
        </Card>
      </Fade>

      {/* Notifications */}
      <Fade delay={120}>
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: DT.yellowDim }}><Bell size={16} style={{ color: DT.yellow }} /></div>
            <h3 style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 700, color: DT.textPri }}>Notifications</h3>
          </div>
          <div className="space-y-3">
            <Toggle label="Email Notifications" desc="Receive email alerts for important updates" value={emailNotifs} onToggle={() => setEmailNotifs(!emailNotifs)} />
            <Toggle label="Manuscript Submissions" desc="Get notified when new manuscripts are submitted" value={manuscriptNotifs} onToggle={() => setManuscriptNotifs(!manuscriptNotifs)} />
            <Toggle label="Defense Reminders" desc="Reminders before defense schedule dates" value={defenseReminders} onToggle={() => setDefenseReminders(!defenseReminders)} />
          </div>
        </Card>
      </Fade>

      {/* Security */}
      <Fade delay={180}>
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: DT.redDim }}><Shield size={16} style={{ color: DT.red }} /></div>
            <h3 style={{ fontFamily: FT.h, fontSize: 18, fontWeight: 700, color: DT.textPri }}>Change Password</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 600, color: DT.textSec }}>New Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password..." style={{ ...inputStyle, paddingRight: 44 }} onFocus={focusIn} onBlur={focusOut} />
                <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1" style={{ color: DT.textTer }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {newPassword.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex-1 h-1 rounded-full transition-all" style={{ background: passStrength >= i ? strengthColor : DT.borderDef }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: strengthColor }}>{strengthLabel}</span>
                </div>
              )}
            </div>
            <div>
              <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 600, color: DT.textSec }}>Confirm Password</label>
              <div className="relative">
                <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password..." style={{ ...inputStyle, paddingRight: 44 }} onFocus={focusIn} onBlur={focusOut} />
                <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1" style={{ color: DT.textTer }}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertTriangle size={12} style={{ color: DT.error }} />
                  <span style={{ fontSize: 11, color: DT.error }}>Passwords don't match</span>
                </div>
              )}
            </div>
            <button onClick={handlePasswordChange} disabled={changingPw || newPassword.length < 6 || newPassword !== confirmPassword}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition cursor-pointer hover:opacity-90 disabled:opacity-40"
              style={{ background: DT.blue, color: "white", fontSize: 14, fontWeight: 700 }}>
              {changingPw ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              Update Password
            </button>
          </div>
        </Card>
      </Fade>

      {/* Replay Onboarding Tour */}
      <Fade delay={220}>
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: withAlpha(DT.purple, 0.08), color: DT.purple }}>
                <RotateCcw size={16} />
              </div>
              <div>
                <h3 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Onboarding Tour</h3>
                <p style={{ fontSize: 12, color: DT.textTer, marginTop: 2 }}>Replay the guided walkthrough of portal features</p>
              </div>
            </div>
            <button
              onClick={() => { replayOnboardingTour(); toast.success("Starting tour..."); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90"
              style={{ background: withAlpha(DT.purple, 0.1), color: DT.purple, border: `1px solid ${withAlpha(DT.purple, 0.15)}`, fontSize: 13, fontWeight: 600 }}>
              <RotateCcw size={14} /> Replay Tour
            </button>
          </div>
        </Card>
      </Fade>

      {/* Sign Out */}
      <Fade delay={240}>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Sign Out</h3>
              <p style={{ fontSize: 12, color: DT.textTer, marginTop: 2 }}>You will need to sign in again to access the portal.</p>
            </div>
            <button onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90"
              style={{ background: DT.redDim, color: DT.red, border: `1px solid rgba(248,113,113,0.15)`, fontSize: 13, fontWeight: 600 }}>
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </Card>
      </Fade>

      {/* Save */}
      <Fade delay={280}>
        <div className="flex items-center justify-end gap-3 pb-4">
          {saved && (
            <span className="flex items-center gap-1.5" style={{ fontSize: 13, fontWeight: 600, color: DT.success }}>
              <Check size={14} /> Settings saved
            </span>
          )}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90 disabled:opacity-50"
            style={{ background: DT.blue, color: "white", fontFamily: FT.h, fontSize: 14, fontWeight: 700 }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </Fade>
    </PageShell>
  );
}