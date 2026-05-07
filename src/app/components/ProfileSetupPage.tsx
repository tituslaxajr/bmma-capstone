import { useState, useRef, useCallback } from "react";
import { Camera, Lock, Eye, EyeOff, Check, ChevronRight, Shield, User, Sparkles } from "lucide-react";
import { DT, FT, withAlpha } from "./cinematic-tokens";
import { supabase, apiFetch } from "../lib/supabase";
import { toast } from "sonner";
import { inputStyle as sharedInputStyle, focusIn, focusOut } from "./ui/shared-ui";

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

interface ProfileSetupProps {
  userName: string;
  userEmail: string;
  userRole: string;
  onComplete: () => void;
}

export function ProfileSetupPage({ userName, userEmail, userRole, onComplete }: ProfileSetupProps) {
  const [step, setStep] = useState<"avatar" | "password" | "done">("avatar");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [completing, setCompleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleColor = userRole === "coordinator" ? DT.purple : userRole === "panelist" ? DT.blue : userRole === "adviser" ? DT.success : DT.yellow;
  const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1);

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
      // Save to backend
      const session = (await supabase.auth.getSession()).data.session;
      await apiFetch("/me/profile", {
        method: "PUT",
        body: JSON.stringify({ avatarUrl: dataUrl }),
      }, session?.access_token!);
      toast.success("Profile picture updated!");
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      toast.error("Failed to upload photo.");
    } finally { setUploading(false); }
  }, []);

  /* ─── Password change ─── */
  const handlePasswordChange = useCallback(async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match."); return; }
    try {
      setChangingPw(true);
      const session = (await supabase.auth.getSession()).data.session;
      await apiFetch("/me/password", {
        method: "PUT",
        body: JSON.stringify({ newPassword }),
      }, session?.access_token!);

      // Re-authenticate with new password to refresh the session
      // (admin password update invalidates the old session token)
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: newPassword,
      });
      if (reAuthError) {
        console.error("Re-auth after password change failed:", reAuthError);
        // Non-fatal — the setup can still proceed if session is still valid
      }

      toast.success("Password changed successfully!");
      setStep("done");
    } catch (err: any) {
      console.error("Password change error:", err);
      toast.error(err.message || "Failed to change password.");
    } finally { setChangingPw(false); }
  }, [newPassword, confirmPassword, userEmail]);

  /* ─── Complete setup ─── */
  const handleCompleteSetup = useCallback(async () => {
    try {
      setCompleting(true);
      const session = (await supabase.auth.getSession()).data.session;
      await apiFetch("/me/profile", {
        method: "PUT",
        body: JSON.stringify({ profileSetupComplete: true }),
      }, session?.access_token!);
      toast.success("Profile setup complete! Welcome to Hue We Are.");
      onComplete();
    } catch (err: any) {
      console.error("Complete setup error:", err);
      toast.error("Failed to complete setup.");
    } finally { setCompleting(false); }
  }, [onComplete]);

  const passStrength = newPassword.length === 0 ? 0 : newPassword.length < 6 ? 1 : newPassword.length < 10 ? 2 : 3;
  const strengthLabel = ["", "Weak", "Good", "Strong"][passStrength];
  const strengthColor = ["", DT.error, DT.warning, DT.success][passStrength];

  const cardStyle: React.CSSProperties = {
    background: `linear-gradient(145deg, ${DT.raised}, ${DT.elevated})`,
    border: `1px solid ${DT.borderSub}`,
    borderRadius: 20,
    boxShadow: DT.shadowLg,
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: DT.base, fontFamily: FT.b }}>
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.04]"
        style={{ background: `radial-gradient(circle, ${DT.blue}, transparent 70%)` }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.03]"
        style={{ background: `radial-gradient(circle, ${DT.yellow}, transparent 70%)` }} />

      <div className="w-full max-w-[520px] relative z-10">
        {/* Welcome header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DT.borderHair}` }}>
            <Sparkles size={14} style={{ color: DT.yellow }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: DT.textSec }}>First-time Setup</span>
          </div>
          <h1 style={{ fontFamily: FT.h, fontSize: "clamp(24px,5vw,32px)", fontWeight: 700, color: DT.textPri, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            Welcome, {userName.split(" ")[0]}!
          </h1>
          <p className="mt-2" style={{ fontSize: 14, color: DT.textTer, lineHeight: 1.5 }}>
            Let's personalize your profile before you get started.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[
            { key: "avatar", label: "Photo", icon: <Camera size={14} /> },
            { key: "password", label: "Password", icon: <Lock size={14} /> },
            { key: "done", label: "Done", icon: <Check size={14} /> },
          ].map((s, i) => {
            const isCurrent = s.key === step;
            const isDone = (step === "password" && i === 0) || (step === "done" && i < 2);
            return (
              <div key={s.key} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px" style={{ background: isDone || isCurrent ? DT.blue : DT.borderDef }} />}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{
                    background: isCurrent ? DT.blueDim : isDone ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isCurrent ? "rgba(77,143,255,0.25)" : isDone ? "rgba(74,222,128,0.15)" : DT.borderHair}`,
                  }}>
                  <span style={{ color: isCurrent ? DT.blue : isDone ? DT.success : DT.textDis }}>{isDone ? <Check size={14} /> : s.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: isCurrent ? DT.blue : isDone ? DT.success : DT.textDis }}>{s.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Card */}
        <div style={cardStyle}>
          {/* ─── Step 1: Avatar ─── */}
          {step === "avatar" && (
            <div className="p-8">
              <div className="text-center mb-8">
                <h2 style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri }}>Set Your Profile Picture</h2>
                <p className="mt-1" style={{ fontSize: 13, color: DT.textTer }}>Upload a photo so your team and panelists can recognize you.</p>
              </div>

              {/* Avatar circle */}
              <div className="flex justify-center mb-6">
                <div className="relative group">
                  <div className="w-[120px] h-[120px] rounded-full overflow-hidden flex items-center justify-center"
                    style={{ background: avatarPreview ? "transparent" : `linear-gradient(135deg, ${roleColor}, ${DT.blue})`, border: `3px solid ${DT.borderDef}`, boxShadow: `0 0 30px rgba(77,143,255,0.15)` }}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span style={{ fontSize: 36, fontWeight: 700, color: "white", fontFamily: FT.h }}>{initials}</span>
                    )}
                  </div>
                  {/* Camera overlay */}
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
                    disabled={uploading}>
                    {uploading ? (
                      <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera size={28} style={{ color: "white" }} />
                    )}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                  {/* Online dot */}
                  <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{ background: avatarPreview ? DT.success : DT.borderDef, borderColor: DT.raised }}>
                    {avatarPreview && <Check size={10} style={{ color: "white" }} />}
                  </div>
                </div>
              </div>

              {/* User info card */}
              <div className="rounded-xl p-4 mb-6" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${DT.borderHair}` }}>
                <div className="flex items-center gap-3">
                  <User size={16} style={{ color: DT.textTer }} />
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 14, fontWeight: 600, color: DT.textPri }}>{userName}</div>
                    <div style={{ fontSize: 12, color: DT.textTer }}>{userEmail}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full" style={{ fontSize: 10, fontWeight: 700, color: roleColor, background: withAlpha(roleColor, 0.08), border: `1px solid ${withAlpha(roleColor, 0.12)}` }}>
                    {roleLabel}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition cursor-pointer hover:bg-white/[0.06]"
                  style={{ border: `1px solid ${DT.borderDef}`, color: DT.textSec, fontSize: 13, fontWeight: 600 }}>
                  <Camera size={16} /> {avatarPreview ? "Change Photo" : "Upload Photo"}
                </button>
                <button onClick={() => setStep("password")}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition cursor-pointer hover:opacity-90"
                  style={{ background: DT.blue, color: "white", fontSize: 13, fontWeight: 700 }}>
                  {avatarPreview ? "Next" : "Skip for Now"} <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 2: Password ─── */}
          {step === "password" && (
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: DT.blueDim, border: `1px solid rgba(77,143,255,0.15)` }}>
                  <Shield size={24} style={{ color: DT.blue }} />
                </div>
                <h2 style={{ fontFamily: FT.h, fontSize: 20, fontWeight: 700, color: DT.textPri }}>Secure Your Account</h2>
                <p className="mt-1" style={{ fontSize: 13, color: DT.textTer }}>
                  Your coordinator gave you a temporary password. Set a new one now.
                </p>
              </div>

              <div className="space-y-4">
                {/* New password */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: DT.textSec, display: "block", marginBottom: 6 }}>New Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password..."
                      style={{ ...sharedInputStyle, borderRadius: 12, padding: "12px 14px", width: "100%", paddingRight: 44 }}
                      onFocus={focusIn}
                      onBlur={focusOut}
                    />
                    <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1"
                      style={{ color: DT.textTer }} type="button">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Strength bar */}
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

                {/* Confirm password */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: DT.textSec, display: "block", marginBottom: 6 }}>Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password..."
                      style={{ ...sharedInputStyle, borderRadius: 12, padding: "12px 14px", width: "100%", paddingRight: 44, borderColor: confirmPassword && confirmPassword !== newPassword ? DT.error : DT.borderDef }}
                      onFocus={focusIn}
                      onBlur={focusOut}
                    />
                    <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1"
                      style={{ color: DT.textTer }} type="button">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <span style={{ fontSize: 11, color: DT.error, marginTop: 4, display: "block" }}>Passwords don't match</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-6">
                <button onClick={() => setStep("avatar")}
                  className="px-4 py-3 rounded-xl transition cursor-pointer hover:bg-white/[0.04]"
                  style={{ border: `1px solid ${DT.borderDef}`, color: DT.textTer, fontSize: 13, fontWeight: 600 }}>
                  Back
                </button>
                <button onClick={() => setStep("done")}
                  className="px-4 py-3 rounded-xl transition cursor-pointer hover:bg-white/[0.04]"
                  style={{ color: DT.textTer, fontSize: 13 }}>
                  Skip
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={changingPw || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: DT.blue, color: "white", fontSize: 13, fontWeight: 700 }}>
                  {changingPw ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Updating...</>
                  ) : (
                    <><Lock size={15} /> Set New Password</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 3: Done ─── */}
          {step === "done" && (
            <div className="p-8 text-center">
              {/* Animated checkmark */}
              <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ background: "rgba(74,222,128,0.10)", border: `2px solid rgba(74,222,128,0.25)`, boxShadow: "0 0 40px rgba(74,222,128,0.1)" }}>
                <Check size={36} style={{ color: DT.success }} />
              </div>

              <h2 style={{ fontFamily: FT.h, fontSize: 22, fontWeight: 700, color: DT.textPri }}>You're All Set!</h2>
              <p className="mt-2 mx-auto max-w-[320px]" style={{ fontSize: 14, color: DT.textTer, lineHeight: 1.6 }}>
                Your profile is ready. You can always update your photo and password later in Settings.
              </p>

              {/* Summary */}
              <div className="rounded-xl p-4 mt-6 mb-6 text-left" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${DT.borderHair}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                    style={{ background: avatarPreview ? "transparent" : `linear-gradient(135deg, ${roleColor}, ${DT.blue})`, border: `2px solid ${DT.borderDef}` }}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span style={{ fontSize: 16, fontWeight: 700, color: "white", fontFamily: FT.h }}>{initials}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 14, fontWeight: 600, color: DT.textPri }}>{userName}</div>
                    <div style={{ fontSize: 12, color: DT.textTer }}>{userEmail}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 700, color: roleColor, background: withAlpha(roleColor, 0.08) }}>{roleLabel}</span>
                    <span className="flex items-center gap-1" style={{ fontSize: 10, color: DT.success }}>
                      <Check size={10} /> {avatarPreview ? "Photo set" : "Default avatar"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCompleteSetup}
                disabled={completing}
                className="w-full py-3.5 rounded-xl transition cursor-pointer hover:opacity-90 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${DT.yellow}, #FFB800)`, color: DT.base, fontFamily: FT.h, fontSize: 15, fontWeight: 700, boxShadow: "0 4px 20px rgba(255,209,0,0.2)" }}>
                {completing ? "Finishing..." : "Enter Hue We Are"}
              </button>
            </div>
          )}
        </div>

        {/* Footer subtle text */}
        <p className="text-center mt-4" style={{ fontSize: 11, color: DT.textDis }}>
          STI College San Fernando &middot; BMMA Capstone Portal
        </p>
      </div>
    </div>
  );
}