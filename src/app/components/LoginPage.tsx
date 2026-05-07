import { useState, useEffect, useRef } from "react";
import { THREE, EffectComposer, RenderPass, UnrealBloomPass, ShaderPass } from "../lib/three-exports";
import { GraduationCap, ShieldCheck, Eye, EyeOff, Loader2, Settings, ArrowRight, Lock, ArrowLeft, BookOpen } from "lucide-react";
import { supabase, apiFetch } from "../lib/supabase";
import { DT, FT, withAlpha } from "./cinematic-tokens";

type Role = "student" | "panelist" | "adviser" | "coordinator";

const ROLE_META: Record<Role, { icon: React.ReactNode; label: string; desc: string; color: string; glow: string }> = {
  student:     { icon: <GraduationCap size={18} />, label: "Student",     desc: "Track & defend your capstone", color: "#4D8FFF", glow: "rgba(77,143,255,0.18)" },
  panelist:    { icon: <ShieldCheck size={18} />,   label: "Panelist",    desc: "Review, grade & evaluate",     color: "#A78BFA", glow: "rgba(167,139,250,0.18)" },
  adviser:     { icon: <BookOpen size={18} />,      label: "Adviser",     desc: "Guide & mentor capstone groups", color: "#34D399", glow: "rgba(52,211,153,0.18)" },
  coordinator: { icon: <Settings size={18} />,      label: "Coordinator", desc: "Manage & oversee the program",  color: "#F87171", glow: "rgba(248,113,113,0.18)" },
};

const DEMO_NAMES: Record<Role, string> = {
  student: "Andrea Santos",
  panelist: "Prof. Miguel Reyes",
  adviser: "Ms. Lara Cruz",
  coordinator: "Dr. Nina Villanueva",
};

/* ── CSS keyframes ── */
const KEYFRAMES = `
@keyframes loginCardIn {
  from { opacity: 0; transform: translateY(24px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes loginFieldIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes heroTextIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes shimmerLine {
  from { transform: translateX(-100%); }
  to   { transform: translateX(200%); }
}
@keyframes goldShimmer {
  0%,100% { background-position: 0% 50%; }
  50%     { background-position: 100% 50%; }
}
@keyframes orbFloat1 { 0%,100%{transform:translate(0,0)} 33%{transform:translate(30px,-40px)} 66%{transform:translate(-20px,25px)} }
@keyframes orbFloat2 { 0%,100%{transform:translate(0,0)} 40%{transform:translate(-35px,30px)} 70%{transform:translate(25px,-20px)} }
@keyframes orbFloat3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,35px)} }
@keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes subtitleReveal{0%{opacity:0;transform:translateY(18px);filter:blur(6px)}100%{opacity:1;transform:translateY(0);filter:blur(0)}}
.login-hero-we {
  display: block;
  font-family: Inter, sans-serif;
  font-size: 1em;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 0.95;
  background-image: linear-gradient(135deg, #FFD100 0%, #FFB800 28%, #FFA500 55%, #FFD100 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 40px rgba(255,209,0,0.22));
  animation: goldShimmer 6s ease-in-out infinite;
}
`;

/* ══════════════════════════════════════════
   POST-PROCESSING SHADERS (matches landing page)
   ══════════════════════════════════════════ */
const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, uIntensity: { value: 0.30 }, uSmoothness: { value: 0.50 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uIntensity; uniform float uSmoothness;
    varying vec2 vUv;
    void main(){
      vec4 col=texture2D(tDiffuse,vUv);
      float d=length(vUv-vec2(0.5))*1.414;
      float vig=smoothstep(1.0,1.0-uSmoothness,d);
      col.rgb*=mix(1.0,vig,uIntensity);
      gl_FragColor=col;
    }`,
};
const ChromaticAberrationShader = {
  uniforms: { tDiffuse: { value: null }, uStrength: { value: 0.003 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uStrength;
    varying vec2 vUv;
    void main(){
      vec2 dir = vUv - vec2(0.5);
      float d = length(dir);
      float falloff = smoothstep(0.15, 0.7, d);
      vec2 offset = dir * uStrength * falloff;
      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      float a = texture2D(tDiffuse, vUv).a;
      gl_FragColor = vec4(r, g, b, a);
    }`,
};

/* ══════════════════════════════════════════
   LOGIN HERO SCENE — mirrors landing page VFX
   Glowing particles + Bloom + Vignette + Chromatic
   ══════════════════════════════════════════ */
function LoginHeroScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const W = container.clientWidth, H = container.clientHeight;
    if (W === 0 || H === 0) return;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(72, W / H, 0.1, 2000);
    camera.position.z = 400;

    /* VFX color palette */
    const VFX_COLORS = [
      new THREE.Color("#4D8FFF"), new THREE.Color("#FFD100"),
      new THREE.Color("#FF6BF0"), new THREE.Color("#4ADE80"),
      new THREE.Color("#A855F7"), new THREE.Color("#38BDF8"),
      new THREE.Color("#FB923C"), new THREE.Color("#F87171"),
    ];

    /* Particles */
    const PC = 160;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(PC * 3);
    const colors = new Float32Array(PC * 3);
    const sizes = new Float32Array(PC);
    const vel = new Float32Array(PC * 3);
    const phases = new Float32Array(PC);

    for (let i = 0; i < PC; i++) {
      positions[i*3] = (Math.random()-0.5)*900;
      positions[i*3+1] = (Math.random()-0.5)*550;
      positions[i*3+2] = (Math.random()-0.5)*280;
      const c = VFX_COLORS[i % VFX_COLORS.length];
      colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
      sizes[i] = 15 + Math.random() * 17;
      vel[i*3] = (Math.random()-0.5)*0.25;
      vel[i*3+1] = (Math.random()-0.5)*0.25;
      vel[i*3+2] = (Math.random()-0.5)*0.12;
      phases[i] = Math.random() * Math.PI * 2;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const pMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uMousePos: { value: new THREE.Vector2(9999, 9999) },
        uMouseActive: { value: 0.0 },
        uFocusZ: { value: 0.0 },
        uDofRange: { value: 150.0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vBreath;
        varying float vDefocus;
        uniform float uPixelRatio;
        uniform float uTime;
        uniform vec2 uMousePos;
        uniform float uMouseActive;
        uniform float uFocusZ;
        uniform float uDofRange;
        void main() {
          vColor = color;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          float dist = length(position.xy - uMousePos);
          float proximity = 1.0 - smoothstep(0.0, 200.0, dist);
          float breath = 1.0 + proximity * uMouseActive * (0.6 + 0.3 * sin(uTime * 4.0 + position.x * 0.02));
          vBreath = proximity * uMouseActive;
          float defocus = clamp(abs(position.z - uFocusZ) / uDofRange, 0.0, 1.0);
          vDefocus = defocus;
          float coc = 1.5 + defocus * 2.6;
          gl_PointSize = size * breath * coc * uPixelRatio * (300.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vBreath;
        varying float vDefocus;
        uniform float uTime;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float softness = 1.8 + vDefocus * 3.0;
          float gaussian = exp(-(d * d) * (8.0 / softness));
          float halo = exp(-(d * d) * (2.6 / softness));
          float pulse = 0.9 + 0.1 * sin(uTime * 2.0 + vColor.r * 6.28);
          float breathBoost = 1.0 + vBreath * 0.8;
          float focusBright = 0.72 - vDefocus * 0.18;
          vec3 col = vColor * (gaussian * 1.8 + halo * 0.9) * pulse * breathBoost * focusBright;
          float alpha = (gaussian * 0.34 + halo * 0.20) * (1.0 - vDefocus * 0.08);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    scene.add(new THREE.Points(geo, pMat));

    /* Post-processing */
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 1.6, 1.0, 0.04));
    composer.addPass(new ShaderPass(VignetteShader));
    composer.addPass(new ShaderPass(ChromaticAberrationShader));

    /* Mouse */
    const m3 = new THREE.Vector3(9999, 9999, 0);
    let mActive = false;
    const onMM = (e: MouseEvent) => {
      const r = container.getBoundingClientRect();
      m3.set(((e.clientX-r.left)/r.width*2-1)*450, -((e.clientY-r.top)/r.height*2-1)*275, 0);
      mActive = true;
    };
    const onML = () => { mActive = false; m3.set(9999,9999,0); };
    container.addEventListener("mousemove", onMM);
    container.addEventListener("mouseleave", onML);

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      renderer.setSize(w, h); composer.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    let raf: number;
    const t0 = performance.now();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = (performance.now() - t0) / 1000;
      pMat.uniforms.uTime.value = t;
      pMat.uniforms.uMousePos.value.set(m3.x, m3.y);
      pMat.uniforms.uMouseActive.value += ((mActive ? 1.0 : 0.0) - pMat.uniforms.uMouseActive.value) * 0.08;
      pMat.uniforms.uFocusZ.value = Math.sin(t * 0.15) * 80;
      const pos = geo.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < PC; i++) {
        let px = pos.getX(i)+vel[i*3], py = pos.getY(i)+vel[i*3+1], pz = pos.getZ(i)+vel[i*3+2];
        px += Math.sin(t*0.5+phases[i])*0.12;
        py += Math.cos(t*0.4+phases[i]*1.3)*0.12;
        if(px>450)px=-450;if(px<-450)px=450;
        if(py>275)py=-275;if(py<-275)py=275;
        if(pz>140)pz=-140;if(pz<-140)pz=140;
        if (mActive) {
          const dx=m3.x-px, dy=m3.y-py, d=Math.sqrt(dx*dx+dy*dy);
          if (d<160&&d>1) { const f=(1-d/160)*1.0; px+=dx/d*f; py+=dy/d*f; }
        }
        pos.setXYZ(i, px, py, pz);
      }
      pos.needsUpdate = true;
      scene.rotation.y = Math.sin(t*0.05)*0.02;
      composer.render();
    };
    animate();

    const onVis = () => { if(document.hidden) cancelAnimationFrame(raf); else animate(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener("mousemove", onMM);
      container.removeEventListener("mouseleave", onML);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      composer.dispose(); renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" style={{ zIndex: 0, filter: "blur(28px) saturate(1.45)", transform: "scale(1.14)" }} />;
}

/* ══════════════════════════════════════════
   ROLE SELECTOR CARD
   ══════════════════════════════════════════ */
function RoleCard({ role, selected, onClick }: { role: Role; selected: boolean; onClick: () => void }) {
  const m = ROLE_META[role];
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3.5 rounded-2xl transition-all duration-200 cursor-pointer px-4 py-3.5 w-full group"
      style={{
        border: `1px solid ${selected ? withAlpha(m.color, 0.25) : DT.borderSub}`,
        background: selected
          ? `linear-gradient(135deg, ${withAlpha(m.color, 0.05)} 0%, ${withAlpha(m.color, 0.02)} 100%)`
          : "rgba(255,255,255,0.02)",
        boxShadow: selected ? `0 0 24px ${m.glow}` : "none",
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
        style={{
          background: selected ? withAlpha(m.color, 0.09) : "rgba(255,255,255,0.04)",
          color: selected ? m.color : DT.textTer,
        }}
      >
        {m.icon}
      </div>
      <div className="text-left min-w-0 flex-1">
        <div style={{ fontFamily: FT.h, fontSize: "13px", fontWeight: 700, color: selected ? m.color : DT.textPri }}>
          {m.label}
        </div>
        <div style={{ fontFamily: FT.b, fontSize: "11px", color: DT.textTer, lineHeight: 1.4 }}>
          {m.desc}
        </div>
      </div>
      {/* Radio dot */}
      <div
        className="w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200"
        style={{ borderColor: selected ? m.color : DT.borderDef, background: "transparent" }}
      >
        {selected && <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />}
      </div>
    </button>
  );
}

/* ══════════════════════════════════════════
   LOGIN INPUT
   ══════════════════════════════════════════ */
function LoginInput({ label, type = "text", placeholder, value, onChange, suffix, delay = 0 }: {
  label: string; type?: string; placeholder: string; value: string;
  onChange: (v: string) => void; suffix?: React.ReactNode; delay?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-2" style={{ animation: `loginFieldIn 400ms ease-out ${delay}ms both` }}>
      <label style={{
        fontFamily: FT.h, fontSize: "11px", fontWeight: 600,
        color: focused ? DT.blue : DT.textTer,
        letterSpacing: "0.08em", textTransform: "uppercase" as const,
        transition: "color 200ms",
      }}>
        {label}
      </label>
      <div className="relative">
        <input
          type={type} placeholder={placeholder} value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full px-4 py-3.5 rounded-xl outline-none transition-all duration-200"
          style={{
            fontSize: "14px", fontFamily: FT.b, color: DT.textPri,
            background: focused ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${focused ? "rgba(77,143,255,0.40)" : DT.borderSub}`,
            boxShadow: focused ? "0 0 0 3px rgba(77,143,255,0.08)" : "none",
          }}
        />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   LOGO MARK
   ══════════════════════════════════════════ */
function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0"
      style={{
        width: size, height: size,
        background: "linear-gradient(135deg, rgba(77,143,255,0.14) 0%, rgba(255,209,0,0.10) 100%)",
        border: `1px solid ${DT.borderDef}`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
      }}
    >
      <span style={{ fontFamily: FT.h, fontSize: size * 0.42, fontWeight: 800, color: DT.yellow }}>C</span>
    </div>
  );
}

/* ══════════════════════════════════════════
   TYPEWRITER TEXT — types out then blinks cursor
   ══════════════════════════════════════════ */
function TypewriterText({ text, startDelay = 800, charSpeed = 65 }: { text: string; startDelay?: number; charSpeed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let idx = 0;

    timeout = setTimeout(function type() {
      if (idx <= text.length) {
        setDisplayed(text.slice(0, idx));
        idx++;
        timeout = setTimeout(type, charSpeed + (Math.random() - 0.5) * 30);
      } else {
        setDone(true);
      }
    }, startDelay);

    return () => clearTimeout(timeout);
  }, [text, startDelay, charSpeed]);

  return (
    <span>
      {displayed}
      <span
        style={{
          display: "inline-block",
          width: "2px",
          height: "1em",
          marginLeft: "3px",
          verticalAlign: "text-bottom",
          background: done ? DT.yellow : DT.textSec,
          animation: done ? "cursorBlink 1s step-end infinite" : "none",
          opacity: 1,
          borderRadius: 1,
        }}
      />
    </span>
  );
}

/* ══════════════════════════════════════════
   ROTATING WORD — types / deletes / cycles through words
   ══════════════════════════════════════════ */
function RotatingWord({ words, startDelay = 600, typeSpeed = 70, deleteSpeed = 40, holdTime = 2200 }: {
  words: string[]; startDelay?: number; typeSpeed?: number; deleteSpeed?: number; holdTime?: number;
}) {
  const [wordIdx, setWordIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState<"wait" | "typing" | "hold" | "deleting">("wait");

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const word = words[wordIdx];

    if (phase === "wait") {
      t = setTimeout(() => setPhase("typing"), startDelay);
    } else if (phase === "typing") {
      if (displayed.length < word.length) {
        t = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), typeSpeed + (Math.random() - 0.5) * 30);
      } else {
        setPhase("hold");
      }
    } else if (phase === "hold") {
      t = setTimeout(() => setPhase("deleting"), holdTime);
    } else if (phase === "deleting") {
      if (displayed.length > 0) {
        t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), deleteSpeed);
      } else {
        setWordIdx((wordIdx + 1) % words.length);
        setPhase("typing");
      }
    }
    return () => clearTimeout(t);
  }, [phase, displayed, wordIdx, words, startDelay, typeSpeed, deleteSpeed, holdTime]);

  const cursorColor = phase === "hold" ? DT.yellow : DT.textSec;
  const cursorBlink = phase === "hold" ? "cursorBlink 1s step-end infinite" : "none";

  return (
    <span>
      {displayed}
      <span style={{
        display: "inline-block", width: "3px", height: "0.85em", marginLeft: "4px",
        verticalAlign: "text-bottom", background: cursorColor, animation: cursorBlink,
        opacity: 1, borderRadius: 1,
      }} />
    </span>
  );
}

/* ══════════════════════════════════════════
   MAIN EXPORT
   ══════════════════════════════════════════ */
export function LoginPage({ onLogin, onBackToLanding }: { onLogin: (user: { email: string; role: Role; name: string }) => void; onBackToLanding?: () => void }) {
  const [role, setRole] = useState<Role>("student");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [mounted, setMounted] = useState(false);
  const localDemoEnabled = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t); }, []);
  useEffect(() => { apiFetch("/auth/bootstrap", { method: "POST" }).catch(() => {}); }, []);

  const loginAsDemoUser = (selectedRole = role) => {
    const demoEmail = email.trim() || `${selectedRole}@capstoneph.local`;
    onLogin({
      email: demoEmail,
      role: selectedRole,
      name: DEMO_NAMES[selectedRole],
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) { setError("Please enter both email and password."); return; }
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        if (localDemoEnabled) {
          loginAsDemoUser();
          return;
        }
        setError(signInError.message === "Invalid login credentials" ? "Invalid email or password." : signInError.message);
        setLoading(false); return;
      }
      const session = data?.session;
      if (!session?.access_token) { setError("No session returned. Please try again."); setLoading(false); return; }
      try {
        const { user: profile } = await apiFetch<{ user: any }>("/users/me", {}, session.access_token);
        onLogin({ email: profile.email, role: profile.role as Role, name: profile.name });
      } catch {
        const meta = data.user?.user_metadata;
        const userRole = (meta?.role || role) as Role;
        onLogin({ email: data.user.email || email, role: userRole, name: meta?.name || email.split("@")[0] });
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (localDemoEnabled) {
        loginAsDemoUser();
        return;
      }
      setError("An error occurred during sign-in. Please try again.");
    } finally { setLoading(false); }
  };

  const rc = ROLE_META[role].color;
  const rcGlow = ROLE_META[role].glow;

  return (
    <div className="min-h-screen lg:h-screen flex flex-col lg:flex-row overflow-x-hidden overflow-y-auto lg:overflow-hidden" style={{ fontFamily: FT.b, background: DT.base }}>
      <style>{KEYFRAMES}</style>

      {/* ══════════════════════════════════════════
         LEFT PANEL — Cinematic Hero (desktop lg+)
         ══════════════════════════════════════════ */}
      <div className="hidden lg:flex w-[54%] relative overflow-hidden" style={{ background: DT.base }}>
        {/* Three.js VFX scene */}
        <LoginHeroScene />

        {/* Ambient CSS light orbs (same as landing page) */}
        <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden">
          <div className="absolute" style={{ width: 550, height: 550, top: "-8%", left: "12%", background: "radial-gradient(circle, rgba(77,143,255,0.07) 0%, transparent 70%)", animation: "orbFloat1 18s ease-in-out infinite" }} />
          <div className="absolute" style={{ width: 450, height: 450, bottom: "-4%", right: "8%", background: "radial-gradient(circle, rgba(255,209,0,0.05) 0%, transparent 70%)", animation: "orbFloat2 22s ease-in-out infinite" }} />
          <div className="absolute" style={{ width: 320, height: 320, top: "35%", right: "22%", background: "radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 70%)", animation: "orbFloat3 15s ease-in-out infinite" }} />
        </div>

        {/* Vignette overlays */}
        <div className="absolute inset-0 pointer-events-none z-[1]" style={{ background: "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 20%, rgba(7,9,15,0.50) 80%, rgba(7,9,15,0.85) 100%)" }} />
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-[1]" style={{ height: 300, background: "linear-gradient(to top, #07090F 0%, rgba(7,9,15,0.7) 40%, transparent 100%)" }} />
        <div className="absolute top-0 left-0 right-0 pointer-events-none z-[1]" style={{ height: 100, background: "linear-gradient(to bottom, #07090F 0%, transparent 100%)" }} />

        {/* Noise overlay */}
        <div className="absolute inset-0 pointer-events-none z-[1] opacity-[0.025]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: "200px 200px" }} />

        {/* Hero content */}
        <div className="absolute inset-0 z-[2] flex flex-col" style={{ padding: "40px 48px" }}>
          {/* Top: logo + school */}
          <div className="flex items-center gap-3" style={{ animation: "heroTextIn 600ms ease-out 100ms both" }}>
            <LogoMark size={36} />
            <div>
              <span style={{ fontFamily: FT.h, fontSize: "14px", fontWeight: 700, color: DT.textPri }}>Hue We Are</span>
              <div style={{ fontSize: "11px", color: DT.textTer }}>STI College San Fernando</div>
            </div>
          </div>

          {/* Center content */}
          <div className="flex-1 flex flex-col items-center justify-center -mt-4">
            {/* Program chip */}
            <div style={{ animation: "heroTextIn 600ms ease-out 200ms both" }}>
              <span
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full backdrop-blur-md"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(77,143,255,0.16)",
                  boxShadow: "0 0 20px rgba(77,143,255,0.06)",
                  fontFamily: FT.m, fontSize: "11px", fontWeight: 500,
                  color: DT.textSec, letterSpacing: "0.08em", textTransform: "uppercase" as const,
                }}
              >
                BMMA &middot; Capstone Defense &middot; AY 2025–2026
              </span>
            </div>

            {/* Main headline */}
            <h1
              className="mt-7 text-center"
              style={{
                fontFamily: FT.h,
                fontSize: "clamp(52px, 6vw, 72px)",
                fontWeight: 800,
                lineHeight: 1.0,
                letterSpacing: "-0.03em",
                animation: "heroTextIn 600ms ease-out 300ms both",
              }}
            >
              <span style={{ color: DT.textPri, display: "block", letterSpacing: "-0.02em" }}>Hue</span>
              <span
                className="login-hero-we"
              >
                We
              </span>
              <span style={{ color: DT.textPri, display: "block", letterSpacing: "-0.02em" }}>Are</span>
            </h1>

            {/* Accent line */}
            <div
              className="mt-5"
              style={{
                width: "clamp(100px, 14vw, 170px)", height: 2,
                background: "linear-gradient(90deg, transparent, rgba(255,209,0,0.45), rgba(77,143,255,0.35), transparent)",
                borderRadius: 2, boxShadow: "0 0 12px rgba(255,209,0,0.12)",
                animation: "heroTextIn 600ms ease-out 400ms both",
              }}
            />

            {/* Tagline */}
            <p
              className="mt-5 text-center"
              style={{
                fontFamily: FT.b, fontSize: "clamp(15px, 1.8vw, 19px)",
                color: "rgba(238,240,246,0.48)", lineHeight: 1.7, maxWidth: 420,
                animation: "subtitleReveal 1.4s cubic-bezier(0.16, 1, 0.3, 1) 1.2s both",
              }}
            >
              Every hue tells a story. Defend yours.
            </p>

            {/* Year tag */}
            <p style={{
              fontFamily: FT.m, fontSize: "12px", color: DT.textTer,
              letterSpacing: "0.10em", textTransform: "uppercase" as const,
              marginTop: 16, animation: "heroTextIn 600ms ease-out 600ms both",
            }}>
              Bachelor of Multimedia Arts Capstone Defense
            </p>
          </div>

          {/* Bottom: security line */}
          <div style={{ animation: "heroTextIn 600ms ease-out 800ms both" }}>
            <span style={{ fontSize: "10px", color: DT.textDis, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
              Secure &middot; Confidential &middot; STI Official
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
         TABLET HERO (md only — compact banner)
         ══════════════════════════════════════════ */}
      <div className="hidden md:flex lg:hidden relative overflow-hidden" style={{ height: "180px", background: DT.base }}>
        <LoginHeroScene />
        <div className="absolute inset-0 pointer-events-none z-[1]" style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(7,9,15,0.70) 100%)" }} />
        <div className="absolute bottom-0 left-0 right-0 z-[1]" style={{ height: 80, background: "linear-gradient(to top, #07090F, transparent)" }} />
        <div className="absolute inset-0 z-[2] flex items-center justify-center px-10">
          <div className="flex items-center gap-5">
            <LogoMark size={40} />
            <div>
              <h1 style={{ fontFamily: FT.h, fontSize: "34px", fontWeight: 800, lineHeight: 1.0, color: DT.textPri, letterSpacing: "-0.025em" }}>
                Hue We <span style={{ color: DT.yellow }}>Are</span>
              </h1>
              <p className="mt-1" style={{ fontSize: "13px", color: DT.textTer }}>BMMA &middot; STI San Fernando &middot; AY 2025–2026</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
         RIGHT PANEL — Login Form
         ══════════════════════════════════════════ */}
      <div className="flex-1 lg:w-[46%] flex flex-col items-center justify-start lg:justify-center px-4 py-6 sm:p-8 overflow-auto relative">
        {/* Ambient glow behind form */}
        <div className="absolute pointer-events-none" style={{
          width: 480, height: 480,
          background: `radial-gradient(ellipse at center, ${rcGlow} 0%, transparent 70%)`,
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          transition: "background 500ms ease", opacity: 0.4,
        }} />

        <div
          className="relative w-full max-w-[400px]"
          style={{
            animation: mounted ? "loginCardIn 550ms cubic-bezier(0.34,1.1,0.64,1) forwards" : "none",
            opacity: 0,
          }}
        >
          {/* Form card */}
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              background: `linear-gradient(160deg, ${DT.raised} 0%, rgba(22,27,46,0.92) 100%)`,
              border: `1px solid ${DT.borderDef}`,
              boxShadow: "0 32px 64px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.04)",
              backdropFilter: "blur(24px) saturate(1.6)",
            }}
          >
            {/* Accent shimmer line */}
            <div className="h-[2px] relative overflow-hidden" style={{ background: `linear-gradient(90deg, transparent, ${withAlpha(rc, 0.19)}, transparent)` }}>
              <div className="absolute inset-0" style={{
                background: `linear-gradient(90deg, transparent 0%, ${withAlpha(rc, 0.5)} 50%, transparent 100%)`,
                width: "30%", animation: "shimmerLine 3.5s ease-in-out infinite",
              }} />
            </div>

            <div className="px-6 sm:px-8 md:px-10 pt-7 sm:pt-9 pb-7 sm:pb-9">
              {/* Mobile-only logo row */}
              <div className="md:hidden flex items-center gap-3 mb-7">
                <LogoMark size={34} />
                <div>
                  <span style={{ fontFamily: FT.h, fontSize: "17px", fontWeight: 800, color: DT.textPri }}>
                    Hue We Are
                  </span>
                  <div style={{ fontSize: "10px", color: DT.textTer }}>STI College San Fernando</div>
                </div>
              </div>

              {/* Back to landing */}
              {onBackToLanding && (
                <button
                  onClick={onBackToLanding}
                  className="flex items-center gap-2 mb-6 px-0 py-1 rounded-lg transition-colors cursor-pointer group"
                  style={{ background: "transparent", border: "none" }}
                >
                  <ArrowLeft size={15} style={{ color: DT.textTer, transition: "color 200ms, transform 200ms" }} className="group-hover:-translate-x-0.5" />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: DT.textTer, transition: "color 200ms" }} className="group-hover:text-[#4D8FFF]">
                    Back to Home
                  </span>
                </button>
              )}

              {/* Heading */}
              <div className="flex items-center gap-3 mb-1">
                <h2 style={{
                  fontFamily: FT.h, fontSize: "26px", fontWeight: 800,
                  color: DT.textPri, letterSpacing: "-0.02em", lineHeight: 1.2,
                }}>
                  Sign in
                </h2>
              </div>
              <p style={{ fontSize: "14px", color: DT.textSec, lineHeight: 1.6 }}>
                Access your capstone portal
              </p>

              {/* ── Role Selector ── */}
              <div className="mt-7">
                <label style={{
                  fontFamily: FT.h, fontSize: "10px", fontWeight: 600,
                  color: DT.textTer, letterSpacing: "0.10em",
                  textTransform: "uppercase" as const,
                }}>
                  Your role
                </label>
                <div className="flex flex-col gap-2 mt-2.5">
                  {(["student", "panelist", "adviser", "coordinator"] as Role[]).map((r) => (
                    <RoleCard key={r} role={r} selected={role === r} onClick={() => setRole(r)} />
                  ))}
                </div>
              </div>

              {/* ── Form ── */}
              <form className="mt-7" onSubmit={handleSubmit}>
                {/* Error */}
                {error && (
                  <div
                    className="flex items-start gap-3 px-4 py-3 rounded-xl mb-5"
                    style={{ background: DT.errorDim, border: "1px solid rgba(248,113,113,0.20)" }}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(248,113,113,0.18)" }}>
                      <span style={{ fontSize: "11px", fontWeight: 800, color: DT.error }}>!</span>
                    </div>
                    <span style={{ fontSize: "13px", color: DT.error, lineHeight: 1.5 }}>{error}</span>
                  </div>
                )}

                {/* Fields */}
                <div className="flex flex-col gap-4">
                  <LoginInput
                    label="Email" type="email" placeholder="yourname@sti.edu.ph"
                    value={email} onChange={setEmail} delay={80}
                  />
                  <LoginInput
                    label="Password" type={showPassword ? "text" : "password"} placeholder="Enter your password"
                    value={password} onChange={setPassword} delay={160}
                    suffix={
                      <button
                        type="button" onClick={() => setShowPassword(!showPassword)}
                        className="transition-colors cursor-pointer p-1 rounded-lg hover:bg-white/5"
                        style={{ color: DT.textTer }}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    }
                  />
                </div>

                {/* Remember + forgot */}
                <div className="flex items-center justify-between mt-4">
                  <button type="button" className="flex items-center gap-2 cursor-pointer" onClick={() => setRemember(!remember)}>
                    <div
                      className="w-[34px] h-[18px] rounded-full transition-colors duration-200 relative"
                      style={{ backgroundColor: remember ? DT.blue : "rgba(255,255,255,0.10)" }}
                    >
                      <div
                        className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all duration-200"
                        style={{ left: remember ? "18px" : "2px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
                      />
                    </div>
                    <span style={{ fontSize: "12px", color: DT.textTer }}>Remember me</span>
                  </button>
                  <a href="#" style={{ fontSize: "12px", fontWeight: 600, color: DT.blue }}>Forgot password?</a>
                </div>

                {/* Submit button */}
                <button
                  type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-2xl transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 mt-7 group relative overflow-hidden"
                  style={{
                    background: rc, color: DT.base,
                    fontFamily: FT.h, fontSize: "14px", fontWeight: 700,
                    boxShadow: `0 4px 20px ${withAlpha(rc, 0.19)}, inset 0 1px 0 rgba(255,255,255,0.12)`,
                  }}
                  onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 6px 28px ${withAlpha(rc, 0.25)}, inset 0 1px 0 rgba(255,255,255,0.12)`; }}}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 4px 20px ${withAlpha(rc, 0.19)}, inset 0 1px 0 rgba(255,255,255,0.12)`; }}
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={17} />
                  ) : (
                    <>
                      <Lock size={14} />
                      Sign In
                      <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>

                {localDemoEnabled && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => loginAsDemoUser()}
                    className="w-full py-3 rounded-2xl transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-3"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      color: DT.textSec,
                      border: `1px solid ${DT.borderHair}`,
                      fontFamily: FT.h,
                      fontSize: "13px",
                      fontWeight: 700,
                    }}
                  >
                    Continue as demo {ROLE_META[role].label}
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* Footer outside card */}
          <div className="mt-6 text-center space-y-2">
            <p style={{ fontSize: "12px", color: DT.textTer }}>
              New here? Contact your <span style={{ color: DT.blue, fontWeight: 600 }}>program coordinator</span> for access.
            </p>
            <p style={{ fontSize: "10px", color: DT.textDis, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
              BMMA Program &middot; STI San Fernando &middot; AY 2025–2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
