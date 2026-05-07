import { useState, useRef, useCallback, useEffect } from "react";
import type { ChangeEvent } from "react";
import {
  Camera, Lock, Eye, EyeOff, Check, Save, User, Mail,
  Shield, Loader2, AlertTriangle, LogOut, RotateCcw,
} from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { supabase, apiFetch } from "../lib/supabase";
import { toast } from "sonner";
import { cardBg, inputStyle, focusIn, focusOut } from "./ui/shared-ui";
import { replayOnboardingTour } from "./OnboardingTour";

/* ═══ Helper: resize image to max 200x200, return base64 data URL ═══ */
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

const KF = `@keyframes speFade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`;

interface Props {
  onLogout: () => void;
}

export function StudentProfileEditPage({ onLogout }: Props) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  /* Password */
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  /* Display name edit */
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  /* ─── Fetch profile ─── */
  const fetchProfile = useCallback(async () => {
    try {
      const ctx = await apiFetch<any>("/me/context");
      setProfile(ctx.profile || null);
      setDisplayName(ctx.profile?.name || "");
      setAvatarPreview(ctx.profile?.avatarUrl || null);
    } catch (err) { console.error("Failed to fetch profile:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  /* ─── Avatar upload ─── */
  const handleFileSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB."); return; }
    try {
      setUploading(true);
      const dataUrl = await resizeImage(file);
      setAvatarPreview(dataUrl);
      const session = (await supabase.auth.getSession()).data.session;
      await apiFetch("/me/profile", { method: "PUT", body: JSON.stringify({ avatarUrl: dataUrl }) }, session?.access_token!);
      toast.success("Profile picture updated!");
    } catch (err: any) { console.error("Avatar upload error:", err); toast.error("Failed to upload photo."); }
    finally { setUploading(false); }
  }, []);

  /* ─── Save display name ─── */
  const handleSaveName = useCallback(async () => {
    if (!displayName.trim()) { toast.error("Name cannot be empty."); return; }
    try {
      setSavingName(true);
      const session = (await supabase.auth.getSession()).data.session;
      await apiFetch("/me/profile", { method: "PUT", body: JSON.stringify({ name: displayName.trim() }) }, session?.access_token!);
      toast.success("Display name updated!");
    } catch (err: any) { toast.error(err.message || "Failed to update name."); }
    finally { setSavingName(false); }
  }, [displayName]);

  /* ─── Password change ─── */
  const handlePasswordChange = useCallback(async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match."); return; }
    try {
      setChangingPw(true);
      const session = (await supabase.auth.getSession()).data.session;
      await apiFetch("/me/password", { method: "PUT", body: JSON.stringify({ newPassword }) }, session?.access_token!);
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

  const initials = (profile?.name || "?")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" style={{ fontFamily: FT.b }}>
        <Loader2 size={28} className="animate-spin" style={{ color: DT.blue }} />
        <span className="ml-3" style={{ fontSize: 14, color: DT.textSec }}>Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="max-w-[640px] mx-auto space-y-6" style={{ fontFamily: FT.b, animation: "speFade 400ms ease-out" }}>
      <style>{KF}</style>

      <div>
        <h1 style={{ fontFamily: FT.h, fontSize: "clamp(26px,4vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em" }}>Profile Settings</h1>
        <p className="mt-1" style={{ fontSize: 14, color: DT.textSec }}>Manage your profile picture, display name, and password.</p>
      </div>

      {/* ═══ Avatar Section ═══ */}
      <div className="rounded-[20px] p-6" style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm }}>
        <h2 className="mb-4" style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Profile Picture</h2>
        <div className="flex items-center gap-6">
          <div className="relative group shrink-0">
            <div className="w-[90px] h-[90px] rounded-full overflow-hidden flex items-center justify-center"
              style={{
                background: avatarPreview ? "transparent" : `linear-gradient(135deg, ${DT.yellow}, ${DT.blue})`,
                border: `3px solid ${DT.borderDef}`, boxShadow: "0 0 20px rgba(77,143,255,0.12)",
              }}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span style={{ fontSize: 28, fontWeight: 700, color: "white", fontFamily: FT.h }}>{initials}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
              disabled={uploading}>
              {uploading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={24} style={{ color: "white" }} />
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 14, fontWeight: 600, color: DT.textPri }}>{profile?.name}</p>
            <p style={{ fontSize: 12, color: DT.textTer }}>{profile?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-1 rounded-full" style={{ fontSize: 10, fontWeight: 700, color: DT.yellow, background: withAlpha(DT.yellow, 0.08), border: `1px solid ${withAlpha(DT.yellow, 0.12)}` }}>
                Student
              </span>
              {profile?.groupNumber && (
                <span className="px-2.5 py-1 rounded-full" style={{ fontSize: 10, fontWeight: 600, color: DT.blue, background: DT.blueDim }}>
                  Group {profile.groupNumber}
                </span>
              )}
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer hover:bg-white/[0.05]"
              style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 12, fontWeight: 600 }}>
              <Camera size={14} /> {avatarPreview ? "Change Photo" : "Upload Photo"}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Display Name ═══ */}
      <div className="rounded-[20px] p-6" style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm }}>
        <h2 className="mb-4" style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Display Name</h2>
        <div className="space-y-3">
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: DT.textSec, display: "block", marginBottom: 6 }}>Name</label>
            <div className="flex gap-2">
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your display name"
                style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
              <button onClick={handleSaveName} disabled={savingName || displayName.trim() === profile?.name}
                className="px-4 py-2 rounded-xl transition cursor-pointer hover:opacity-90 disabled:opacity-40 shrink-0"
                style={{ background: DT.blue, color: "white", fontSize: 13, fontWeight: 600 }}>
                {savingName ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} className="inline mr-1" /> Save</>}
              </button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: DT.textSec, display: "block", marginBottom: 6 }}>Email</label>
            <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${DT.borderHair}` }}>
              <Mail size={14} style={{ color: DT.textTer }} />
              <span style={{ fontSize: 14, color: DT.textTer }}>{profile?.email}</span>
              <span className="ml-auto px-2 py-0.5 rounded-full" style={{ fontSize: 9, fontWeight: 600, color: DT.textDis, background: "rgba(255,255,255,0.04)" }}>Cannot change</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Change Password ═══ */}
      <div className="rounded-[20px] p-6" style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm }}>
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} style={{ color: DT.blue }} />
          <h2 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Change Password</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: DT.textSec, display: "block", marginBottom: 6 }}>New Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password..."
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={focusIn} onBlur={focusOut} />
              <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1" type="button" style={{ color: DT.textTer }}>
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
            <label style={{ fontSize: 12, fontWeight: 600, color: DT.textSec, display: "block", marginBottom: 6 }}>Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password..."
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={focusIn} onBlur={focusOut} />
              <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1" type="button" style={{ color: DT.textTer }}>
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
      </div>

      {/* ═══ Onboarding Tour ═══ */}
      <div className="rounded-[20px] p-6" style={{ background: cardBg, border: `1px solid ${DT.borderSub}`, boxShadow: DT.shadowSm }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: withAlpha(DT.blue, 0.08), color: DT.blue }}>
              <RotateCcw size={16} />
            </div>
            <div>
              <h2 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Onboarding Tour</h2>
              <p style={{ fontSize: 12, color: DT.textTer, marginTop: 2 }}>Replay the guided walkthrough of portal features</p>
            </div>
          </div>
          <button
            onClick={() => { replayOnboardingTour(); toast.success("Starting tour..."); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90"
            style={{ background: withAlpha(DT.blue, 0.1), color: DT.blue, border: `1px solid ${withAlpha(DT.blue, 0.15)}`, fontSize: 13, fontWeight: 600 }}>
            <RotateCcw size={14} /> Replay Tour
          </button>
        </div>
      </div>

      {/* ═══ Sign Out ═══ */}
      <div className="rounded-[20px] p-6" style={{ background: cardBg, border: `1px solid rgba(248,113,113,0.12)`, boxShadow: DT.shadowSm }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ fontFamily: FT.h, fontSize: 16, fontWeight: 700, color: DT.textPri }}>Sign Out</h2>
            <p style={{ fontSize: 12, color: DT.textTer, marginTop: 2 }}>You will need to sign in again to access the portal.</p>
          </div>
          <button onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90"
            style={{ background: DT.redDim, color: DT.red, border: `1px solid rgba(248,113,113,0.15)`, fontSize: 13, fontWeight: 600 }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}