import { useState, useEffect, useRef, useMemo } from "react";
import { loadThreeModules } from "../lib/three-loader";
import { useHeavyEffectsEnabled } from "../lib/effects";
import heroBgDesktop from "../../assets/hero-bg-desktop.jpg";
import heroBgMobile from "../../assets/hero-bg-mobile.jpg";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { withAlpha } from "./cinematic-tokens";
import bmmaClassPhoto from "figma:asset/d358440ed31d40939f1b0ccbbdd9f3390a08162a.png";
import {
  ChevronDown, ChevronRight, ChevronLeft, Users, Calendar, Award,
  Film, Camera, Share2, FileText, Image, Menu, X,
  Clock, MapPin, Shirt, BookOpen, Layers, Shield, GraduationCap, ClipboardList,
  ArrowUp,
} from "lucide-react";

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   DESIGN TOKENS â€” Cinematic Dark Premium
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const C = {
  base: "#020A1F", deep: "#061235", dark: "#0A1640",
  raised: "#101B47", elevated: "#172452", surface: "#1D2C5F",
  deepest: "#010614",
  textPri: "#EEF0F6", textSec: "rgba(238,240,246,0.65)",
  textTer: "rgba(238,240,246,0.38)", textDis: "rgba(238,240,246,0.22)",
  blue: "#58A6FF", blueDim: "rgba(88,166,255,0.13)",
  blueGlow: "rgba(88,166,255,0.24)", stiBlue: "#003087",
  yellow: "#FFD100", yellowDim: "rgba(255,209,0,0.10)",
  yellowGlow: "rgba(255,209,0,0.25)",
  success: "#4ADE80", warning: "#FBBF24", error: "#F87171",
  borderHair: "rgba(255,255,255,0.04)", borderSub: "rgba(255,255,255,0.07)",
  borderDef: "rgba(255,255,255,0.11)", borderStrong: "rgba(255,255,255,0.20)",
  goldGrad: "linear-gradient(135deg, #FFD100 0%, #FFA500 50%, #FFD100 100%)",
};
const font = { h: "Inter, sans-serif", b: "'DM Sans', sans-serif", m: "'JetBrains Mono', monospace" };

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

function useDeferredSectionReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const activate = () => setReady(true);
    const onScroll = () => {
      if (window.scrollY > window.innerHeight * 0.35) activate();
    };

    const idleId = "requestIdleCallback" in window
      ? window.requestIdleCallback(activate, { timeout: 1400 })
      : window.setTimeout(activate, 1200);

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if ("cancelIdleCallback" in window && typeof idleId === "number") {
        window.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId as number);
      }
    };
  }, []);

  return ready;
}

function useRichMotionEnabled() {
  const heavyEffectsEnabled = useHeavyEffectsEnabled();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!heavyEffectsEnabled) {
      setEnabled(false);
      return;
    }

    const activate = () => setEnabled(true);
    const idleId = "requestIdleCallback" in window
      ? window.requestIdleCallback(activate, { timeout: 1200 })
      : window.setTimeout(activate, 300);

    return () => {
      if ("cancelIdleCallback" in window && typeof idleId === "number") {
        window.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId as number);
      }
    };
  }, [heavyEffectsEnabled]);

  return enabled;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   GLOBAL HELPERS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function FadeIn({ delay = 0, children, className = "", style = {} }: { delay?: number; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0) scale(1)" : "translateY(28px) scale(0.98)",
      filter: visible ? "blur(0)" : "blur(6px)",
      transition: `opacity 650ms cubic-bezier(.22,1,.36,1) ${delay}ms, transform 650ms cubic-bezier(.22,1,.36,1) ${delay}ms, filter 650ms cubic-bezier(.22,1,.36,1) ${delay}ms`,
      willChange: "opacity, transform, filter",
      ...style,
    }}>{children}</div>
  );
}

function SectionDivider({ accent = C.blue }: { accent?: string }) {
  return (
    <div className="flex items-center justify-center py-1" style={{ background: "transparent" }}>
      <div style={{ width: "clamp(60px, 12vw, 140px)", height: 1, background: `linear-gradient(90deg, transparent, ${withAlpha(accent, 0.25)}, transparent)` }} />
    </div>
  );
}

function SectionLabel({ children, color = C.blue, bg }: { children: React.ReactNode; color?: string; bg?: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-5" style={{
      background: bg || withAlpha(color, 0.04), border: `1px solid ${withAlpha(color, 0.13)}`,
      boxShadow: `0 0 20px ${withAlpha(color, 0.03)}`,
    }}>
      <span style={{ fontFamily: font.m, fontSize: 11, fontWeight: 500, color, letterSpacing: "0.08em", textTransform: "uppercase" }}>{children}</span>
    </span>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SMOOTH SCROLL HELPERS (native, no lerp hijack)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const lerpScrollState = { target: 0, enabled: false };

function lerpScrollTo(y: number) {
  window.scrollTo({ top: Math.max(0, Math.min(y, document.body.scrollHeight - window.innerHeight)), behavior: "smooth" });
}

function lerpScrollToElement(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth" });
}

function useLerpScroll(_factor = 0.08) {
  /* No-op: native browser scrolling is used for performance.
     The old lerp scroll intercepted wheel events with preventDefault()
     and advanced only 8% per frame, causing severe scroll lag. */
}

/* â”€â”€ Viewport visibility hook for pausing offscreen rAF loops â”€â”€ */
function useIsVisible(ref: React.RefObject<HTMLElement | null>, margin = "200px") {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: margin });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, margin]);
  return visible;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   API HELPERS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-36da3eb1`;
const apiHeaders = { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" };

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   LANDING DATA TYPES
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
interface LandingStats {
  groups: number; students: number; panelists: number;
  advisers: number; defenseSlots: number; upcomingDefenses: number;
}
interface LandingDefense {
  id: number; group: string; title?: string;
  groupName?: string; groupTitle?: string;
  date: string; time: string; room: string; mode: string; status: string;
}
interface LandingAnnouncement { title: string; date: string; type: string; }

interface LandingLiveData {
  stats: LandingStats | null;
  defenses: LandingDefense[];
  defenseDates: string[];
  announcements: LandingAnnouncement[];
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SCROLL PROGRESS BAR
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        if (barRef.current) barRef.current.style.width = `${h > 0 ? (window.scrollY / h) * 100 : 0}%`;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-[2px]" style={{ background: "transparent" }}>
      <div ref={barRef} style={{ width: "0%", height: "100%", background: `linear-gradient(90deg, ${C.blue}, ${C.yellow})`, boxShadow: `0 0 12px ${C.blueGlow}`, borderRadius: "0 1px 1px 0", willChange: "width" }} />
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CUSTOM CURSOR (desktop only)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    let mx = 0, my = 0, rx = 0, ry = 0;
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener("mousemove", onMove);
    let raf: number;
    const tick = () => {
      rx += (mx - rx) * 0.09; ry += (my - ry) * 0.09;
      if (dotRef.current) { dotRef.current.style.transform = `translate(${mx - 2.5}px, ${my - 2.5}px)`; }
      if (ringRef.current) { ringRef.current.style.transform = `translate(${rx - 13}px, ${ry - 13}px)`; }
      raf = requestAnimationFrame(tick);
    };
    tick();
    // hover detection
    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("button, a, [role=button], input, [data-interactive]")) {
        ringRef.current?.classList.add("cursor-hover");
      }
    };
    const onOut = () => { ringRef.current?.classList.remove("cursor-hover"); };
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
    };
  }, []);
  return (
    <>
      <div ref={dotRef} className="fixed top-0 left-0 pointer-events-none z-[300] hidden lg:block"
        style={{ width: 5, height: 5, borderRadius: "50%", background: C.yellow }} />
      <div ref={ringRef} className="fixed top-0 left-0 pointer-events-none z-[300] hidden lg:block cursor-ring-el"
        style={{ width: 26, height: 26, borderRadius: "50%", border: `1.5px solid rgba(255,209,0,0.35)`, transition: "width 200ms, height 200ms, border 200ms, background 200ms" }} />
      <style>{`
        .cursor-ring-el.cursor-hover { width: 44px !important; height: 44px !important; margin-left: -9px; margin-top: -9px; background: rgba(255,209,0,0.06); }
      `}</style>
    </>
  );
}

/* Cinematic vignette shader for post-processing */
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uIntensity: { value: 0.25 },
    uSmoothness: { value: 0.45 },
  },
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

/* Subtle chromatic aberration â€” shifts R/B channels at screen edges */
const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    uStrength: { value: 0.003 },
  },
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   THREE.JS HERO SCENE â€” VFX Glowing Particles
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function HeroScene({ enabled }: { enabled: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled) return;
    const container = mountRef.current;
    if (!container) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const { THREE, EffectComposer, RenderPass, UnrealBloomPass, ShaderPass } = await loadThreeModules();
      if (cancelled) return;
      const W = container.clientWidth;
      const H = container.clientHeight;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(W, H);
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(72, W / H, 0.1, 2000);
      camera.position.z = 400;

      /* VFX Colors */
      const VFX_COLORS = [
        new THREE.Color("#4D8FFF"), new THREE.Color("#FFD100"),
        new THREE.Color("#FF6BF0"), new THREE.Color("#4ADE80"),
        new THREE.Color("#A855F7"), new THREE.Color("#38BDF8"),
        new THREE.Color("#FB923C"), new THREE.Color("#F87171"),
      ];

      /* Particles */
      const PC = 120;
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(PC * 3);
      const colors = new Float32Array(PC * 3);
      const sizes = new Float32Array(PC);
      const vel = new Float32Array(PC * 3);
      const phases = new Float32Array(PC);

      for (let i = 0; i < PC; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 1000;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 600;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
        const c = VFX_COLORS[i % VFX_COLORS.length];
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
        sizes[i] = 16 + Math.random() * 18;
        vel[i * 3] = (Math.random() - 0.5) * 0.3;
        vel[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
        vel[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
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
        varying float vMouseInfluence;
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
          /* Breathing from mouse proximity */
          float dist = length(position.xy - uMousePos);
          float proximity = 1.0 - smoothstep(0.0, 230.0, dist);
          float breath = 1.0 + proximity * uMouseActive * (0.6 + 0.3 * sin(uTime * 4.0 + position.x * 0.02));
          vMouseInfluence = proximity * uMouseActive;
          /* Depth-of-field: circle of confusion grows away from focus plane */
          float defocus = clamp(abs(position.z - uFocusZ) / uDofRange, 0.0, 1.0);
          vDefocus = defocus;
          float coc = 1.5 + defocus * 2.6;
          gl_PointSize = size * breath * coc * uPixelRatio * (300.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vMouseInfluence;
        varying float vDefocus;
        uniform float uTime;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float softness = 1.8 + vDefocus * 3.0;
          float gaussian = exp(-(d * d) * (8.0 / softness));
          float halo = exp(-(d * d) * (2.6 / softness));
          float pulse = 0.9 + 0.1 * sin(uTime * 2.0 + vColor.r * 6.28);
          float mouseMask = smoothstep(0.02, 0.55, vMouseInfluence);
          float breathBoost = 1.0 + vMouseInfluence * 0.8;
          float focusBright = 0.72 - vDefocus * 0.18;
          vec3 col = vColor * (gaussian * 1.8 + halo * 0.9) * pulse * breathBoost * focusBright;
          float alpha = (gaussian * 0.38 + halo * 0.22) * (1.0 - vDefocus * 0.08) * mouseMask;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
      scene.add(new THREE.Points(geo, pMat));

      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloomPass = new UnrealBloomPass(new THREE.Vector2(W, H), 1.6, 1.0, 0.04);
      composer.addPass(bloomPass);
      const vignettePass = new ShaderPass(VignetteShader);
      composer.addPass(vignettePass);

      const MOUSE_R = 180;
      const m3 = new THREE.Vector3(9999, 9999, 0);
      let mActive = false;

      const onMM = (e: MouseEvent) => {
      const r = container.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
        mActive = false;
        m3.set(9999, 9999, 0);
        return;
      }
      m3.set(((e.clientX-r.left)/r.width*2-1)*500, -((e.clientY-r.top)/r.height*2-1)*300, 0);
      mActive = true;
      };
      const onML = () => { mActive = false; m3.set(9999, 9999, 0); };
      window.addEventListener("mousemove", onMM, { passive: true });
      window.addEventListener("mouseleave", onML);

      const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      renderer.setSize(w, h); composer.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);

      let raf = 0;
      let running = false;
      const t0 = performance.now();
      const flags = { visible: true };

      const animate = () => {
      if (!flags.visible || document.hidden) { running = false; return; }
      running = true;
      raf = requestAnimationFrame(animate);
      const t = (performance.now() - t0) / 1000;
      pMat.uniforms.uTime.value = t;
      pMat.uniforms.uMousePos.value.set(m3.x, m3.y);
      pMat.uniforms.uMouseActive.value += ((mActive ? 1.0 : 0.0) - pMat.uniforms.uMouseActive.value) * 0.08;
      pMat.uniforms.uFocusZ.value = Math.sin(t * 0.15) * 80;
      const pos = geo.getAttribute("position") as THREE.BufferAttribute;

      for (let i = 0; i < PC; i++) {
        let px = pos.getX(i)+vel[i*3], py = pos.getY(i)+vel[i*3+1], pz = pos.getZ(i)+vel[i*3+2];
        px += Math.sin(t*0.5+phases[i])*0.15;
        py += Math.cos(t*0.4+phases[i]*1.3)*0.15;
        if(px>500)px=-500;if(px<-500)px=500;
        if(py>300)py=-300;if(py<-300)py=300;
        if(pz>150)pz=-150;if(pz<-150)pz=150;
        if (mActive) {
          const dx=m3.x-px, dy=m3.y-py, d=Math.sqrt(dx*dx+dy*dy);
          if (d<MOUSE_R&&d>1) { const f=(1-d/MOUSE_R)*1.2; px+=dx/d*f; py+=dy/d*f; }
        }
        pos.setXYZ(i, px, py, pz);
      }
      pos.needsUpdate = true;

      scene.rotation.y = Math.sin(t*0.05)*0.03;
      composer.render();
      };
      animate();

      const visObs = new IntersectionObserver(([e]) => {
        flags.visible = e.isIntersecting;
        if (e.isIntersecting && !running) animate();
      }, { rootMargin: "200px" });
      visObs.observe(container);

      const onVisChange = () => { if (!document.hidden && flags.visible && !running) animate(); };
      document.addEventListener("visibilitychange", onVisChange);

      cleanup = () => {
        flags.visible = false;
        cancelAnimationFrame(raf);
        visObs.disconnect();
        window.removeEventListener("mousemove", onMM);
        window.removeEventListener("mouseleave", onML);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVisChange);
        composer.dispose();
        renderer.dispose();
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [enabled]);
  if (!enabled) return null;
  return <div ref={mountRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 3, filter: "blur(28px) saturate(1.45)", transform: "scale(1.14)", mixBlendMode: "screen", opacity: 0.58 }} />;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MINI THREE.JS â€” VFX Glowing Particles for cards/sections
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function MiniThreeScene({ particleCount = 20, colors: colorProps = [C.blue, C.yellow], shapeCount: _sc = 2, enabled = true }: { particleCount?: number; colors?: string[]; shapeCount?: number; enabled?: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled) return;
    const container = mountRef.current;
    if (!container) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const { THREE, EffectComposer, RenderPass, UnrealBloomPass } = await loadThreeModules();
      if (cancelled) return;
      const W = container.clientWidth;
      const H = container.clientHeight;
      if (W === 0 || H === 0) return;
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(W, H);
      container.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 500);
      camera.position.z = 100;

    const VFX = colorProps.map(c => new THREE.Color(c));
    VFX.push(new THREE.Color("#FF6BF0"), new THREE.Color("#38BDF8"), new THREE.Color("#4ADE80"));

    const count = particleCount;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i*3]=(Math.random()-0.5)*180; pos[i*3+1]=(Math.random()-0.5)*130; pos[i*3+2]=(Math.random()-0.5)*60;
      const c = VFX[i % VFX.length];
      col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
      vel[i*3]=(Math.random()-0.5)*0.15; vel[i*3+1]=(Math.random()-0.5)*0.15; vel[i*3+2]=0;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

    const pMat = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: renderer.getPixelRatio() },
        uTime: { value: 0 },
        uMousePos: { value: new THREE.Vector2(9999, 9999) },
        uMouseActive: { value: 0.0 },
      },
      vertexShader: `
        attribute vec3 color; varying vec3 vColor; varying float vBreath;
        uniform float uPixelRatio; uniform float uTime; uniform vec2 uMousePos; uniform float uMouseActive;
        void main() { vColor = color; vec4 mvPos = modelViewMatrix * vec4(position,1.0);
          float dist = length(position.xy - uMousePos);
          float proximity = 1.0 - smoothstep(0.0, 70.0, dist);
          float breath = 1.0 + proximity * uMouseActive * (0.5 + 0.25 * sin(uTime * 3.5 + position.x * 0.05));
          vBreath = proximity * uMouseActive;
          gl_PointSize = 16.0 * breath * uPixelRatio * (150.0 / -mvPos.z); gl_Position = projectionMatrix * mvPos; }
      `,
      fragmentShader: `
        varying vec3 vColor; varying float vBreath;
        void main() { float d = length(gl_PointCoord - vec2(0.5)); if(d>0.5) discard;
          float gaussian = exp(-(d * d) * 7.0) * (0.55 + vBreath * 0.25);
          float halo = exp(-(d * d) * 2.4);
          float boost = 1.0 + vBreath * 0.6;
          vec3 col = vColor * (gaussian * 1.7 + halo * 0.7) * boost;
          float alpha = gaussian * 0.42 + halo * 0.18;
          gl_FragColor = vec4(col, alpha); }
      `,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    scene.add(new THREE.Points(geo, pMat));

    /* Bloom */
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(W, H), 1.35, 0.85, 0.06);
    composer.addPass(bloomPass);

    // Mouse
    const m3 = new THREE.Vector3(9999,9999,0);
    let mIn = false;
    const onMM = (e: MouseEvent) => {
      const r = container.getBoundingClientRect();
      m3.set(((e.clientX-r.left)/r.width*2-1)*90, -((e.clientY-r.top)/r.height*2-1)*65, 0);
      mIn = true;
    };
    const onML = () => { mIn = false; m3.set(9999,9999,0); };
    container.addEventListener("mousemove", onMM);
    container.addEventListener("mouseleave", onML);

    let raf: number;
    let running = false;
    const t0 = performance.now();
    const flags = { visible: false };

    const animate = () => {
      if (!flags.visible || document.hidden) { running = false; return; }
      running = true;
      raf = requestAnimationFrame(animate);
      const t = (performance.now() - t0) / 1000;
      pMat.uniforms.uTime.value = t;
      pMat.uniforms.uMousePos.value.set(m3.x, m3.y);
      pMat.uniforms.uMouseActive.value += ((mIn ? 1.0 : 0.0) - pMat.uniforms.uMouseActive.value) * 0.08;
      const pp = geo.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) {
        let x = pp.getX(i)+vel[i*3], y = pp.getY(i)+vel[i*3+1];
        if(x>90)vel[i*3]*=-1; if(x<-90)vel[i*3]*=-1;
        if(y>65)vel[i*3+1]*=-1; if(y<-65)vel[i*3+1]*=-1;
        if(mIn){const dx=m3.x-x,dy=m3.y-y,d=Math.sqrt(dx*dx+dy*dy);
          if(d<60&&d>1){const f=(1-d/60)*0.8;x+=dx/d*f;y+=dy/d*f;}}
        pp.setXYZ(i, x, y, pp.getZ(i));
      }
      pp.needsUpdate = true;
      composer.render();
    };

    /* Only animate when in viewport */
    const visObs = new IntersectionObserver(([e]) => {
      flags.visible = e.isIntersecting;
      if (e.isIntersecting && !running) animate();
    }, { rootMargin: "100px" });
    visObs.observe(container);

      cleanup = () => {
        flags.visible = false;
        cancelAnimationFrame(raf);
        visObs.disconnect();
        container.removeEventListener("mousemove", onMM);
        container.removeEventListener("mouseleave", onML);
        composer.dispose();
        renderer.dispose();
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [colorProps, enabled, particleCount]);
  if (!enabled) return null;
  return <div ref={mountRef} className="absolute inset-0" style={{ zIndex: 0, filter: "blur(18px) saturate(1.35)", transform: "scale(1.1)" }} />;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   THREE.JS â€” Hover-activated VFX glowing particles
   Colorful, bright, glowing, mouse-reactive
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function CardMicroScene({ accentColor, active, enabled = true }: { accentColor: string; active: boolean; enabled?: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ targetOpacity: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const container = mountRef.current;
    if (!container) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const { THREE, EffectComposer, RenderPass, UnrealBloomPass } = await loadThreeModules();
      if (cancelled) return;
      const W = container.clientWidth;
      const H = container.clientHeight;
      if (W === 0 || H === 0) return;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(W, H);
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 200);
      camera.position.z = 60;

    const count = 14;
    const accent = new THREE.Color(accentColor);
    const palette = [
      accent,
      new THREE.Color(accentColor).offsetHSL(0.15, 0, 0.1),
      new THREE.Color(accentColor).offsetHSL(-0.15, 0, 0.1),
      new THREE.Color("#FFD100"),
      new THREE.Color("#38BDF8"),
    ];

    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const drift = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i*3]=(Math.random()-0.5)*90; pos[i*3+1]=(Math.random()-0.5)*70; pos[i*3+2]=(Math.random()-0.5)*30;
      const c = palette[i % palette.length];
      col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
      drift[i*3]=(Math.random()-0.5)*0.12; drift[i*3+1]=(Math.random()-0.5)*0.12; drift[i*3+2]=0;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

    const pMat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uTime: { value: 0 },
        uMousePos: { value: new THREE.Vector2(9999, 9999) },
        uMouseActive: { value: 0.0 },
      },
      vertexShader: `
        attribute vec3 color; varying vec3 vColor; varying float vBreath;
        uniform float uPixelRatio; uniform float uTime; uniform vec2 uMousePos; uniform float uMouseActive;
        void main() { vColor = color; vec4 mvPos = modelViewMatrix * vec4(position,1.0);
          float dist = length(position.xy - uMousePos);
          float proximity = 1.0 - smoothstep(0.0, 40.0, dist);
          float breath = 1.0 + proximity * uMouseActive * (0.5 + 0.2 * sin(uTime * 3.0 + position.x * 0.08));
          vBreath = proximity * uMouseActive;
          gl_PointSize = 18.0 * breath * uPixelRatio * (100.0 / -mvPos.z); gl_Position = projectionMatrix * mvPos; }
      `,
      fragmentShader: `
        varying vec3 vColor; varying float vBreath; uniform float uOpacity;
        void main() { float d = length(gl_PointCoord - vec2(0.5)); if(d>0.5) discard;
          float gaussian = exp(-(d * d) * 7.0) * (0.5 + vBreath * 0.25);
          float halo = exp(-(d * d) * 2.2);
          float boost = 1.0 + vBreath * 0.7;
          vec3 col = vColor * (gaussian * 1.8 + halo * 0.75) * boost;
          float alpha = (gaussian * 0.42 + halo * 0.18) * uOpacity;
          gl_FragColor = vec4(col, alpha); }
      `,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    scene.add(new THREE.Points(geo, pMat));

    /* Bloom */
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(W, H), 1.35, 0.85, 0.06);
    composer.addPass(bloomPass);

    // Mouse
    const m3 = new THREE.Vector3(9999,9999,0);
    let mIn = false;
    const onMM = (e: MouseEvent) => {
      const r = container.getBoundingClientRect();
      m3.set(((e.clientX-r.left)/r.width*2-1)*45, -((e.clientY-r.top)/r.height*2-1)*35, 0);
      mIn = true;
    };
    const onML = () => { mIn = false; m3.set(9999,9999,0); };
    container.addEventListener("mousemove", onMM);
    container.addEventListener("mouseleave", onML);

    let opacity = 0;
    let targetOpacity = 0;
    let raf: number;
    let running = false;
    const state = { targetOpacity: 0 };
    const flags = { visible: false };
    sceneRef.current = state;

    const t0 = performance.now();
    const animate = () => {
      if (!flags.visible || document.hidden) { running = false; return; }
      running = true;
      raf = requestAnimationFrame(animate);
      const t = (performance.now() - t0) / 1000;
      targetOpacity = state.targetOpacity;
      opacity += (targetOpacity - opacity) * 0.08;
      pMat.uniforms.uOpacity.value = opacity;
      pMat.uniforms.uTime.value = t;
      pMat.uniforms.uMousePos.value.set(m3.x, m3.y);
      pMat.uniforms.uMouseActive.value += ((mIn ? 1.0 : 0.0) - pMat.uniforms.uMouseActive.value) * 0.08;

      if (opacity > 0.01) {
        const pp = geo.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < count; i++) {
          let x = pp.getX(i)+drift[i*3], y = pp.getY(i)+drift[i*3+1];
          if(Math.abs(x)>48)drift[i*3]*=-1; if(Math.abs(y)>38)drift[i*3+1]*=-1;
          if(mIn){const dx=m3.x-x,dy=m3.y-y,d=Math.sqrt(dx*dx+dy*dy);
            if(d<35&&d>1){const f=(1-d/35)*0.6;x+=dx/d*f;y+=dy/d*f;}}
          pp.setXYZ(i, x, y, pp.getZ(i));
        }
        pp.needsUpdate = true;
      }
      composer.render();
    };

    const visObs = new IntersectionObserver(([e]) => {
      flags.visible = e.isIntersecting;
      if (e.isIntersecting && !running) animate();
    }, { rootMargin: "100px" });
    visObs.observe(container);

      cleanup = () => {
        flags.visible = false;
        cancelAnimationFrame(raf);
        visObs.disconnect();
        container.removeEventListener("mousemove", onMM);
        container.removeEventListener("mouseleave", onML);
        composer.dispose();
        renderer.dispose();
        geo.dispose();
        pMat.dispose();
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
        sceneRef.current = null;
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [accentColor, enabled]);

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.targetOpacity = active ? 0.85 : 0;
  }, [active]);

  if (!enabled) return null;
  return <div ref={mountRef} className="absolute inset-0" style={{ zIndex: 0, filter: "blur(18px) saturate(1.35)", transform: "scale(1.1)" }} />;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   NAV BAR
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function LandingNav({ onEnterPortal, activeSection }: { onEnterPortal: () => void; activeSection: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = [
    { label: "About", id: "about" },
    { label: "Projects", id: "groups" },
    { label: "Outputs", id: "outputs" },
    { label: "Defense Day", id: "defense-day" },
  ];
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const scrollTo = (id: string) => {
    lerpScrollToElement(id);
    setMobileOpen(false);
  };

  return (
    <>
      <nav className="fixed left-4 right-4 lg:left-8 lg:right-8 z-[100] flex items-center justify-between px-5 lg:px-8 transition-all duration-[400ms]"
        style={{
          top: scrolled ? 12 : 20,
          height: scrolled ? 64 : 72,
          background: scrolled ? "rgba(4,12,34,0.86)" : "rgba(8,17,49,0.62)",
          backdropFilter: "blur(24px) saturate(1.25)",
          border: `1px solid ${scrolled ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.12)"}`,
          borderRadius: 16,
          boxShadow: scrolled ? "0 16px 50px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.06)" : "0 12px 42px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}>
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} data-interactive>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${withAlpha(C.blue, 0.18)}, ${withAlpha(C.yellow, 0.12)})`, border: `1px solid ${C.borderDef}` }}>
            <span style={{ fontFamily: font.h, fontSize: 15, fontWeight: 900, background: C.goldGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>H</span>
          </div>
          <div>
            <div style={{ fontFamily: font.h, fontSize: 18, fontWeight: 900, color: C.textPri, letterSpacing: "-0.01em", textTransform: "uppercase" }}>Hue <span style={{ color: C.yellow }}>We</span> Are</div>
            <div style={{ fontFamily: font.m, fontSize: 9, color: C.textTer, letterSpacing: "0.10em", marginTop: -1 }}>BMMA CAPSTONE DEFENSE 2026</div>
          </div>
        </div>
        {/* Center links â€” desktop */}
        <div className="hidden md:flex items-center" style={{ gap: 4 }}>
          {links.map(l => {
            const isActive = activeSection === l.id;
            return (
              <button key={l.id} onClick={() => scrollTo(l.id)} data-interactive
                className="relative px-4 py-2 rounded-lg transition-all duration-200"
                style={{
                  fontFamily: font.b, fontSize: 13, fontWeight: isActive ? 600 : 400,
                  background: isActive ? "rgba(77,143,255,0.08)" : "transparent",
                  color: isActive ? C.blue : C.textSec, border: "none",
                }}>
                {l.label}
                {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full" style={{ background: C.blue, boxShadow: `0 0 8px ${C.blueGlow}` }} />}
              </button>
            );
          })}
        </div>
        {/* Right CTA */}
        <div className="flex items-center gap-3">
          <button onClick={onEnterPortal} data-interactive
            className="hidden sm:inline-flex items-center gap-1.5 transition-all duration-200 hover:scale-[1.03] glass-btn-primary"
            style={{
              fontFamily: font.h, fontSize: 12, fontWeight: 700, color: C.base,
              borderRadius: 10, padding: "8px 20px", letterSpacing: "0.01em",
            }}>
            <span className="relative z-10 inline-flex items-center gap-1.5">View Portal <ChevronRight size={13} /></span>
          </button>
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded-lg transition-colors hover:bg-[rgba(255,255,255,0.06)]" style={{ color: C.textPri }} data-interactive>
            <Menu size={22} />
          </button>
        </div>
      </nav>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center gap-6"
          style={{ background: "rgba(7,9,15,0.97)", backdropFilter: "blur(20px)", animation: "mobileMenuFadeIn 300ms ease-out" }}>
          <button onClick={() => setMobileOpen(false)} className="absolute top-5 right-5 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.06)]"
            style={{ color: C.textPri, animation: "mobileMenuItemIn 400ms ease-out 50ms both" }} data-interactive><X size={24} /></button>
          <div className="mb-4" style={{ animation: "mobileMenuItemIn 400ms ease-out 80ms both" }}>
            <div className="text-center" style={{ fontFamily: font.m, fontSize: 10, fontWeight: 500, color: C.textTer, letterSpacing: "0.12em" }}>NAVIGATION</div>
          </div>
          {links.map((l, i) => (
            <button key={l.id} onClick={() => scrollTo(l.id)} data-interactive className="transition-all duration-200 hover:text-white"
              style={{
                fontFamily: font.h, fontSize: 24, fontWeight: 700,
                color: activeSection === l.id ? C.blue : C.textSec,
                background: "none", border: "none",
                animation: `mobileMenuItemIn 400ms ease-out ${120 + i * 60}ms both`,
              }}>{l.label}</button>
          ))}
          <button onClick={() => { setMobileOpen(false); onEnterPortal(); }} data-interactive
            className="mt-6 transition-all duration-200 hover:scale-[1.03] glass-btn-primary"
            style={{
              fontFamily: font.h, fontSize: 15, fontWeight: 700, color: C.base, borderRadius: 14, padding: "14px 36px",
              animation: `mobileMenuItemIn 400ms ease-out ${120 + links.length * 60 + 60}ms both`,
            }}>
            <span className="relative z-10">Enter Portal</span>
          </button>
        </div>
      )}
    </>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ANIMATED COUNT-UP HOOK
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function useCountUp(target: number, duration = 1600, startDelay = 600, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t0 = performance.now() + startDelay;
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - t0;
      if (elapsed < 0) { raf = requestAnimationFrame(tick); return; }
      const p = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration, startDelay]);
  return val;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TYPEWRITER TEXT â€” types out then blinks cursor
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function HeroTypewriterText({ text, startDelay = 800, charSpeed = 65 }: { text: string; startDelay?: number; charSpeed?: number }) {
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
          background: done ? C.yellow : C.textSec,
          animation: done ? "cursorBlink 1s step-end infinite" : "none",
          opacity: 1,
          borderRadius: 1,
        }}
      />
    </span>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   HERO ROTATING WORD â€” types / deletes / cycles through words
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function HeroRotatingWord({ words, startDelay = 600, typeSpeed = 70, deleteSpeed = 40, holdTime = 2200 }: {
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

  const cursorColor = phase === "hold" ? C.yellow : C.textSec;
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   HERO SECTION
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function HeroSection({ onEnterPortal, defenses, stats, richMotionEnabled, isMobile }: { onEnterPortal: () => void; defenses: LandingDefense[]; stats: LandingStats | null; richMotionEnabled: boolean; isMobile: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => { requestAnimationFrame(() => setLoaded(true)); }, []);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setScrollY(Math.min(window.scrollY, window.innerHeight * 1.2));
        raf = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  const stagger = (i: number) => ({
    opacity: loaded ? 1 : 0,
    transform: loaded ? "translateY(0)" : "translateY(30px)",
    transition: `opacity 700ms cubic-bezier(.22,1,.36,1) ${i * 100 + 100}ms, transform 700ms cubic-bezier(.22,1,.36,1) ${i * 100 + 100}ms`,
  });
  const scrollDown = () => lerpScrollToElement("about");
  const heroStats = [
    { icon: <Users size={22} />, value: stats?.students || 24, label: "Students", note: "Creative minds", accent: C.blue },
    { icon: <Layers size={22} />, value: stats?.groups || 8, label: "Projects", note: "Original works", accent: C.yellow },
    { icon: <Calendar size={22} />, value: stats?.upcomingDefenses || defenses.length || 1, label: "Defenses", note: "Scheduled sessions", accent: C.success },
  ];

  return (
    <section className="relative min-h-screen overflow-hidden flex items-center" style={{ background: C.base }}>

      {/* High-resolution static hero background */}
      <img
        src={isMobile ? heroBgMobile : heroBgDesktop}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover z-[0]"
        loading="eager"
        decoding="async"
        style={{
          objectPosition: "center center",
          transform: isMobile ? "scale(1.02)" : `translate3d(0, ${scrollY * 0.16}px, 0) scale(1.08)`,
          transformOrigin: "center top",
          willChange: "transform",
        }}
      />

      {/* Readability gradient keeps the left text column clear while preserving the full video. */}
      <div className="absolute inset-0 pointer-events-none z-[1]" style={{
        background: "linear-gradient(90deg, rgba(2,10,31,0.98) 0%, rgba(3,13,40,0.92) 31%, rgba(4,14,42,0.58) 55%, rgba(4,14,42,0.20) 78%, rgba(4,14,42,0.08) 100%)"
      }} />
      <div className="absolute inset-0 pointer-events-none z-[2]" style={{
        background: "radial-gradient(circle at 78% 28%, rgba(255,209,0,0.20), transparent 20%), radial-gradient(circle at 64% 48%, rgba(88,166,255,0.28), transparent 31%), radial-gradient(circle at 88% 62%, rgba(248,113,113,0.16), transparent 22%)",
        mixBlendMode: "screen",
      }} />

      <HeroScene enabled={richMotionEnabled} />

      {/* Top & bottom fades */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none z-[3]" style={{ height: 120, background: "linear-gradient(to bottom, #020A1F 0%, transparent 100%)" }} />
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-[3]" style={{ height: 240, background: "linear-gradient(to top, #020A1F 0%, rgba(2,10,31,0.34) 56%, transparent 100%)" }} />

      {/* Subtle noise overlay */}
      <div className="absolute inset-0 pointer-events-none z-[3] opacity-[0.025]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: "200px 200px" }} />

      {/* Content â€” left aligned */}
      <div className="relative z-[4] w-full lg:w-1/2 min-h-screen flex items-center px-8 md:px-14 lg:px-16 xl:px-24 pt-[96px] pb-28 lg:py-[120px]">
        <div className="w-full max-w-[620px]">

        {/* Program chip â€” frosted glass with glow border */}
        <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full mb-7 hero-chip" style={{
          ...stagger(0),
          background: "rgba(255,255,255,0.03)",
          border: `1px solid rgba(77,143,255,0.18)`,
          backdropFilter: "blur(16px)",
          boxShadow: "0 0 20px rgba(77,143,255,0.06), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}>
          <Shield size={13} style={{ color: C.yellow }} />
          <span style={{ fontFamily: font.m, fontSize: 11, fontWeight: 700, color: C.yellow, letterSpacing: "0.12em", textTransform: "uppercase" }}>Bachelor of Multimedia Arts</span>
        </div>

        {/* Main headline */}
        <h1 style={{ ...stagger(1), fontFamily: font.h, fontSize: "clamp(48px, 8vw, 84px)", fontWeight: 800, lineHeight: 0.88, margin: 0, letterSpacing: "-0.02em" }}>
          <span style={{ color: C.textPri, textShadow: "0 0 60px rgba(238,240,246,0.08)" }}>Hue </span><span style={{
            background: "linear-gradient(135deg, #FFD100 0%, #FFB800 30%, #FFA500 55%, #FFD100 100%)",
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 50px rgba(255,209,0,0.20)) drop-shadow(0 0 100px rgba(255,165,0,0.10))",
            animation: "goldShimmer 6s ease-in-out infinite",
          }}>We </span><span style={{ color: C.textPri, textShadow: "0 0 60px rgba(238,240,246,0.08)" }}>Are</span>
        </h1>
        <div style={{ ...stagger(2), fontFamily: font.h, fontSize: "clamp(17px, 2.4vw, 25px)", fontWeight: 800, color: C.textPri, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 14 }}>
          <span>Capstone Defense 2026</span>
        </div>

        {/* Accent line under headline */}
        <div className="mt-5 mb-1" style={{
          ...stagger(3),
          width: "clamp(120px, 20vw, 200px)", height: 2,
          background: "linear-gradient(90deg, rgba(255,209,0,0.6), rgba(77,143,255,0.5), transparent)",
          borderRadius: 2,
          boxShadow: "0 0 12px rgba(255,209,0,0.15)",
        }} />

        {/* Year tag */}
        <p style={{ ...stagger(4), fontFamily: font.m, fontSize: 13, color: C.textTer, letterSpacing: "0.12em", marginTop: 18, textTransform: "uppercase" }}>
          AY 2025-2026 - STI College San Fernando
        </p>

        {/* Subtitle */}
        <p style={{
          ...stagger(5),
          fontFamily: font.b,
          fontSize: "clamp(16px, 2vw, 21px)",
          color: "rgba(238,240,246,0.50)",
          lineHeight: 1.7,
          maxWidth: 480,
          margin: "22px 0 0",
          animation: "subtitleReveal 1.4s cubic-bezier(0.16, 1, 0.3, 1) 1.2s both",
        }}>
          A showcase of multimedia arts creativity addressing real-world issues through research, storytelling, design, and digital experiences.
        </p>

        {/* Date chips â€” dynamic from backend, fallback to static */}
        <div className="flex flex-wrap items-center justify-start gap-4 mt-10" style={stagger(6)}>
          {(() => {
            // Build chips from live defenses, grouping by date
            if (defenses.length > 0) {
              const byDate = new Map<string, LandingDefense[]>();
              defenses.forEach(d => {
                const arr = byDate.get(d.date) || [];
                arr.push(d);
                byDate.set(d.date, arr);
              });
              const accents = [C.blue, C.yellow, C.success, "#A78BFA"];
              return [...byDate.entries()].slice(0, 3).map(([date, slots], i) => {
                const formatted = new Date(date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" });
                const groupNames = slots.map(s => {
                  if (s.groupName) return s.groupName;
                  const gNum = String(s.group || "").replace(/\D/g, "");
                  return gNum ? `Group ${gNum}` : s.group;
                });
                const groupsStr = groupNames.length <= 2 ? groupNames.join(" & ") : `${groupNames.length} Groups`;
                return { label: `Defense - ${groupsStr}`, date: formatted, accent: accents[i % accents.length] };
              });
            }
            // Fallback
            return [
              { label: "Spectrum of Strength - Mendiculture", date: "May 16", accent: C.blue },
              { label: "Be More with BMMA - Pawtner in Care", date: "May 18", accent: C.yellow },
            ];
          })().map((s, i) => (
            <div key={s.label} className="group flex items-center gap-3.5 rounded-2xl px-7 py-[18px] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" data-interactive
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid rgba(255,255,255,0.07)`,
                backdropFilter: "blur(16px)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.04)",
                opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)",
                transition: `all 300ms ease, opacity 600ms ease-out ${(6 + i) * 100 + 400}ms, transform 600ms ease-out ${(6 + i) * 100 + 400}ms`,
              }}>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors duration-300"
                style={{ background: withAlpha(s.accent, 0.06), border: `1px solid ${withAlpha(s.accent, 0.09)}` }}>
                <Calendar size={22} style={{ color: s.accent }} />
              </div>
              <div className="text-left">
                <div style={{ fontFamily: font.h, fontSize: 28, fontWeight: 800, color: C.textPri, lineHeight: 1, letterSpacing: "-0.02em" }}>{s.date}</div>
                <div style={{ fontFamily: font.b, fontSize: 11, color: C.textTer, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex items-center justify-start gap-4 mt-10" style={stagger(8)}>
          <button onClick={scrollDown} data-interactive
            className="relative transition-all duration-300 hover:scale-[1.04] glass-btn-primary"
            style={{
              fontFamily: font.h, fontSize: 15, fontWeight: 700, color: C.base,
              borderRadius: 14, padding: "15px 36px",
            }}>
            <span className="relative z-10 inline-flex items-center gap-2">Explore Projects <ChevronRight size={16} /></span>
          </button>
          <button onClick={onEnterPortal} data-interactive
            className="transition-all duration-300 hover:-translate-y-0.5 glass-btn-secondary"
            style={{
              fontFamily: font.h, fontSize: 14, fontWeight: 700, color: C.textPri, borderRadius: 14,
              padding: "15px 30px",
            }}>
            <span className="relative z-10">Enter Portal</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-9" style={stagger(9)}>
          {heroStats.map((s, i) => (
            <div key={s.label} className="group rounded-2xl px-4 py-4 transition-all duration-300 hover:-translate-y-1" data-interactive
              style={{
                background: `linear-gradient(135deg, ${withAlpha(s.accent, 0.12)}, rgba(255,255,255,0.035))`,
                border: `1px solid ${withAlpha(s.accent, 0.28)}`,
                boxShadow: `0 12px 36px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.07), 0 0 28px ${withAlpha(s.accent, 0.06)}`,
                backdropFilter: "blur(18px)",
                opacity: loaded ? 1 : 0,
                transform: loaded ? "translateY(0)" : "translateY(20px)",
                transition: `all 300ms ease, opacity 600ms ease-out ${1050 + i * 80}ms, transform 600ms ease-out ${1050 + i * 80}ms`,
              }}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ color: s.accent, border: `1px solid ${withAlpha(s.accent, 0.40)}`, background: withAlpha(s.accent, 0.08) }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontFamily: font.h, fontSize: 28, fontWeight: 900, color: C.textPri, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontFamily: font.b, fontSize: 12, color: C.textSec, marginTop: 1 }}>{s.label}</div>
                  <div style={{ fontFamily: font.b, fontSize: 10, color: C.textTer, marginTop: 1 }}>{s.note}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-8 md:left-14 lg:left-16 xl:left-24 flex flex-col items-center gap-2"
          style={{ opacity: loaded ? 1 : 0, transition: "opacity 800ms ease-out 1200ms" }}>
          <div style={{ width: 1, height: 28, background: "linear-gradient(to bottom, rgba(238,240,246,0.15), transparent)", marginBottom: 4 }} />
          <ChevronDown size={18} style={{ color: C.textDis, animation: "bounceDown 2s ease-in-out infinite" }} />
          <span style={{ fontFamily: font.m, fontSize: 9, color: C.textDis, letterSpacing: "0.15em", textTransform: "uppercase" }}>Scroll</span>
        </div>
      </div>

      <style>{`
        @keyframes bounceDown{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
        @keyframes goldShimmer{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        @keyframes orbFloat1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-20px) scale(1.05)}66%{transform:translate(-20px,15px) scale(0.97)}}
        @keyframes orbFloat2{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(-25px,20px) scale(1.03)}70%{transform:translate(15px,-15px) scale(0.98)}}
        @keyframes orbFloat3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20px,25px) scale(1.06)}}
        @keyframes cursorBlink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes subtitleReveal{0%{opacity:0;transform:translateY(18px);filter:blur(6px)}100%{opacity:1;transform:translateY(0);filter:blur(0)}}
        .hero-orb{position:absolute;border-radius:50%;filter:blur(60px)}
        .hero-chip{transition:border-color 300ms,box-shadow 300ms}
        .hero-chip:hover{border-color:rgba(77,143,255,0.30);box-shadow:0 0 24px rgba(77,143,255,0.10),inset 0 1px 0 rgba(255,255,255,0.06)}
      `}</style>
    </section>
  );
}

/* â•â•â•â•â•â•â•â•â•ï¿½ï¿½ï¿½â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ABOUT SECTION
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function AnimatedStat({ target, accent, icon, label }: { target: number; accent: string; icon: React.ReactNode; label: string }) {
  const { ref, visible } = useInView(0.3);
  const val = useCountUp(target, 1400, 200, visible);
  return (
    <div ref={ref} className="rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1" data-interactive
      style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.borderSub}`, backdropFilter: "blur(8px)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: withAlpha(accent, 0.06), border: `1px solid ${withAlpha(accent, 0.09)}` }}>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div style={{ fontFamily: font.h, fontSize: 30, fontWeight: 800, color: C.textPri, letterSpacing: "-0.02em" }}>{val}</div>
      <div style={{ fontFamily: font.b, fontSize: 11, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function AboutSection({ stats: liveStats, groupCount }: { stats: LandingStats | null; groupCount: number }) {
  const stats = [
    { icon: <Users size={24} />, val: liveStats ? (liveStats.groups || groupCount) : (groupCount || 8), label: "Groups", accent: C.blue },
    { icon: <GraduationCap size={24} />, val: liveStats ? (liveStats.students || 24) : 24, label: "Students", accent: C.yellow },
    { icon: <Award size={24} />, val: liveStats ? (liveStats.panelists || 3) : 3, label: "Panelists", accent: "#A78BFA" },
    { icon: <Calendar size={24} />, val: liveStats ? (liveStats.upcomingDefenses || 1) : 1, label: "Defenses", accent: C.success },
  ];
  return (
    <section id="about" style={{ background: C.deep, padding: "120px clamp(20px, 5vw, 40px)" }}>
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* LEFT */}
        <FadeIn delay={0}>
          <SectionLabel color={C.blue}>About the Capstone</SectionLabel>
          <h2 style={{ fontFamily: font.h, fontSize: "clamp(32px, 4vw, 46px)", fontWeight: 800, color: C.textPri, lineHeight: 1.06, letterSpacing: "-0.02em" }}>
            Where Research Meets<br />Creative Excellence.
          </h2>
          <p className="mt-5" style={{ fontFamily: font.b, fontSize: 16, color: C.textSec, lineHeight: 1.85 }}>
            Hue We Are is the culminating capstone defense for Bachelor of Multimedia Arts students
            at STI College San Fernando. Each group undertakes original research, develops a multimedia solution, deploys
            it in a real-world context, and defends their findings before a panel.
          </p>
          <p className="mt-3" style={{ fontFamily: font.b, fontSize: 16, color: "rgba(238,240,246,0.45)", lineHeight: 1.85 }}>
            Projects span short films, photo exhibits, social media campaigns, infographic series, and documentary
            productions - all grounded in research methodology and community impact.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-10">
            {stats.map((s) => (
              <AnimatedStat key={s.label} target={s.val} accent={s.accent} icon={s.icon} label={s.label} />
            ))}
          </div>
        </FadeIn>

        {/* RIGHT - Class photo */}
        <FadeIn delay={150}>
          <div className="relative rounded-3xl overflow-hidden" style={{
            aspectRatio: "4/3", background: C.deep,
            border: `1px solid ${C.borderSub}`, boxShadow: "0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)",
          }}>
            <img src={bmmaClassPhoto} alt="BMMA Capstone Class - STI College San Fernando" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" style={{ objectPosition: "center 30%" }} />
            {/* Subtle vignette overlay */}
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(7,9,15,0.45) 100%)" }} />
            <div className="absolute bottom-0 left-0 right-0 p-8 z-[1]" style={{ background: "linear-gradient(to top, rgba(12,15,26,0.97) 20%, rgba(12,15,26,0.6) 60%, transparent)" }}>
              <div style={{ fontFamily: font.h, fontSize: 16, fontWeight: 700, color: C.textPri }}>Hue We Are - BMMA Capstone Defense</div>
              <div style={{ fontFamily: font.b, fontSize: 12, color: C.textTer, marginTop: 3 }}>STI College San Fernando - AY 2025-2026</div>
              <div className="flex flex-wrap gap-2 mt-4">
                {["Research-Based", "Multimedia", "Community"].map(p => (
                  <span key={p} className="rounded-full px-3.5 py-1.5" style={{ background: C.blueDim, border: `1px solid rgba(77,143,255,0.18)`, fontFamily: font.m, fontSize: 10, color: "#60A5FA", letterSpacing: "0.04em" }}>{p}</span>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   GROUP SHOWCASE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
interface GroupMember { initials: string; name: string; avatarUrl?: string | null; }
interface GroupData {
  id: number; name: string; type: string; title: string;
  area: string; status: string; members: GroupMember[] | string[];
  adviser?: string; photoUrl?: string | null; featureImageUrl?: string | null;
}

/* Fallback data if backend is unreachable */
const FALLBACK_GROUPS: GroupData[] = [
  { id: 1, name: "LumiÃ¨re", type: "Short Film", title: "Silhouettes of Memory: A Short Film on Generational Storytelling", area: "Visual narrative & cultural preservation through cinematic storytelling", status: "In Progress", members: [{ initials: "AR", name: "Angel Ramos" }, { initials: "BC", name: "Bianca Cruz" }, { initials: "CD", name: "Carlos Diaz" }], adviser: "Prof. Ana Cruz" },
  { id: 2, name: "Pixel Collective", type: "Photo Exhibit", title: "Chromatic Dialogues: Visual Narratives in Urban Space", area: "Photography as social commentary in urban Filipino communities", status: "In Progress", members: [{ initials: "DE", name: "Diana Espino" }, { initials: "EF", name: "Eduardo Flores" }, { initials: "FG", name: "Francesca Garcia" }], adviser: "Prof. Jose Reyes" },
  { id: 3, name: "Vanguard", type: "Social Media", title: "Amplify: Social Media Campaigns for Community Health Awareness", area: "Digital health literacy campaigns for barangay youth", status: "Pre-Defense", members: [{ initials: "GH", name: "Gabrielle Herrera" }, { initials: "HI", name: "Hugo IbaÃ±ez" }, { initials: "IJ", name: "Isabella Jimenez" }], adviser: "Prof. Ana Cruz" },
  { id: 4, name: "Epoch", type: "Documentary", title: "Roots & Routes: Documenting San Fernando's Creative Heritage", area: "Oral history documentation through multimedia storytelling", status: "In Progress", members: [{ initials: "JK", name: "Juan Kalinga" }, { initials: "KL", name: "Kayla Lagman" }, { initials: "LM", name: "Luis Morales" }], adviser: "Prof. Jose Reyes" },
  { id: 5, name: "Infoviz", type: "Infographic", title: "Data Decoded: Infographic Series on Local Environmental Impact", area: "Environmental data visualization for community awareness", status: "Submitted", members: [{ initials: "MN", name: "Maria Navarro" }, { initials: "NO", name: "Nathan Ocampo" }, { initials: "OP", name: "Olivia Perez" }], adviser: "Dr. Maria Santos" },
  { id: 6, name: "Lens & Light", type: "Short Film", title: "Unseen Threads: A Short Film on Student Mental Health", area: "Mental health advocacy through visual media narratives", status: "In Progress", members: [{ initials: "PQ", name: "Paolo Quinto" }, { initials: "QR", name: "Queen Ramos" }, { initials: "RS", name: "Rafael Santos" }], adviser: "Dr. Maria Santos" },
  { id: 7, name: "Canvas Lab", type: "Photo Exhibit", title: "Ground Level: Perspectives from Below the City Line", area: "Photographic exploration of marginalized urban communities", status: "Pre-Defense", members: [{ initials: "ST", name: "Sofia Torres" }, { initials: "TU", name: "Tomas Umali" }, { initials: "UV", name: "Ursula Valdez" }], adviser: "Prof. Ana Cruz" },
  { id: 8, name: "Echo Studio", type: "Documentary", title: "Woven Words: A Documentary on Indigenous Textile Art", area: "Documentary preservation of traditional Filipino textile arts", status: "In Progress", members: [{ initials: "VW", name: "Victor Wong" }, { initials: "WX", name: "Wilma Xavier" }, { initials: "XY", name: "Xavier Yu" }], adviser: "Prof. Jose Reyes" },
];

/** Normalize member to initials string */
function memberInitials(m: GroupMember | string): string {
  return typeof m === "string" ? m : m.initials;
}
function memberName(m: GroupMember | string): string {
  return typeof m === "string" ? m : m.name;
}
function memberAvatar(m: GroupMember | string): string | null {
  return typeof m === "string" ? null : m.avatarUrl || null;
}

function CreatorStrip({ groups }: { groups: GroupData[] }) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const creators = useMemo(() => {
    const seen = new Set<string>();
    return groups.flatMap((group) => (
      (group.members || []).map((member) => {
        const name = memberName(member);
        const key = `${name}-${memberInitials(member)}`.toLowerCase();
        return {
          key,
          name,
          initials: memberInitials(member),
          avatarUrl: memberAvatar(member),
          groupName: group.name && group.name !== `Group ${group.id}` ? group.name : `Group ${group.id}`,
        };
      })
    )).filter((creator) => {
      if (seen.has(creator.key)) return false;
      seen.add(creator.key);
      return true;
    });
  }, [groups]);

  if (creators.length === 0) return null;

  const scrollCreators = (direction: "prev" | "next") => {
    const el = carouselRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".creator-card");
    const step = card ? (card.offsetWidth + 12) * 3 : el.clientWidth * 0.75;
    el.scrollBy({ left: direction === "next" ? step : -step, behavior: "smooth" });
  };

  return (
    <FadeIn className="mb-12">
      <div className="relative overflow-hidden rounded-3xl creator-strip-shell"
        style={{
          background: "linear-gradient(135deg, rgba(88,166,255,0.095), rgba(255,255,255,0.022) 48%, rgba(255,209,0,0.045))",
          border: `1px solid ${withAlpha(C.blue, 0.16)}`,
          boxShadow: `0 18px 58px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.07), 0 0 38px ${withAlpha(C.blue, 0.04)}`,
          backdropFilter: "blur(18px)",
        }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(circle at 9% 12%, rgba(255,209,0,0.12), transparent 18%), radial-gradient(circle at 86% 38%, rgba(88,166,255,0.14), transparent 24%)",
        }} />
        <div className="relative z-[1] px-4 py-4 md:px-5 md:py-5">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <div>
              <div style={{ fontFamily: font.m, fontSize: 10, fontWeight: 700, color: C.yellow, letterSpacing: "0.12em", textTransform: "uppercase" }}>Creator Roster</div>
              <div className="mt-1" style={{ fontFamily: font.h, fontSize: "clamp(20px, 2.2vw, 26px)", fontWeight: 800, color: C.textPri, letterSpacing: "-0.01em" }}>Meet the BMMA Creators</div>
              <p className="mt-1 max-w-[560px]" style={{ fontFamily: font.b, fontSize: 13, color: C.textSec, lineHeight: 1.55 }}>
                The student researchers behind the capstone projects.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-full px-3.5 py-2" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.borderSub}`, fontFamily: font.m, fontSize: 10, color: C.textTer, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {creators.length} students
              </div>
              <button onClick={() => scrollCreators("prev")} aria-label="Previous students" data-interactive
                className="creator-nav-btn w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5 glass-pill"
                style={{ color: C.textPri }}>
                <ChevronLeft size={17} className="relative z-10" />
              </button>
              <button onClick={() => scrollCreators("next")} aria-label="Next students" data-interactive
                className="creator-nav-btn w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5 glass-pill"
                style={{ color: C.yellow }}>
                <ChevronRight size={17} className="relative z-10" />
              </button>
            </div>
          </div>

          <div className="min-w-0 relative">
            <div className="pointer-events-none absolute left-0 top-0 bottom-1 z-[2] w-10" style={{ background: `linear-gradient(90deg, rgba(5,15,40,0.94), transparent)` }} />
            <div className="pointer-events-none absolute right-0 top-0 bottom-1 z-[2] w-10" style={{ background: `linear-gradient(270deg, rgba(5,15,40,0.94), transparent)` }} />
            <div ref={carouselRef} className="creator-strip-list flex items-stretch gap-3 overflow-x-auto pb-1 scroll-smooth">
              {creators.map((creator) => (
                <div key={creator.key} data-interactive
                  className="creator-card shrink-0 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                  style={{
                    width: "clamp(96px, 8vw, 116px)",
                    background: "rgba(255,255,255,0.045)",
                    border: `1px solid ${C.borderSub}`,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}>
                  <div className="relative overflow-hidden" style={{ aspectRatio: "4/5", background: `linear-gradient(145deg, ${withAlpha(C.blue, 0.18)}, ${C.raised})` }}>
                    {creator.avatarUrl ? (
                      <img src={creator.avatarUrl} alt={creator.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" style={{ objectPosition: "center top" }} />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ fontFamily: font.h, fontSize: 24, fontWeight: 800, color: C.textPri }}>
                        {creator.initials}
                      </div>
                    )}
                    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 48%, rgba(2,10,31,0.86) 100%)" }} />
                  </div>
                  <div className="px-3 py-2.5">
                    <div className="truncate" title={creator.name} style={{ fontFamily: font.h, fontSize: 11, fontWeight: 700, color: C.textPri, lineHeight: 1.2 }}>{creator.name}</div>
                    <div className="truncate mt-1" title={creator.groupName} style={{ fontFamily: font.b, fontSize: 9, color: C.textTer, lineHeight: 1.2 }}>{creator.groupName}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

const typeConfig: Record<string, { gradient: string; icon: React.ReactNode; accent: string }> = {
  "Short Film": { gradient: "linear-gradient(145deg, #0A0010, #150020)", icon: <Film size={48} />, accent: "#A78BFA" },
  "Photo Exhibit": { gradient: "linear-gradient(145deg, #001012, #001C1E)", icon: <Camera size={48} />, accent: "#2DD4BF" },
  "Social Media": { gradient: "linear-gradient(145deg, #0E0018, #180028)", icon: <Share2 size={48} />, accent: "#C084FC" },
  "Documentary": { gradient: "linear-gradient(145deg, #001008, #001A10)", icon: <FileText size={48} />, accent: "#34D399" },
  "Infographic": { gradient: "linear-gradient(145deg, #120800, #201200)", icon: <Image size={48} />, accent: "#FBBF24" },
  "Other": { gradient: "linear-gradient(145deg, #0A0A18, #14142A)", icon: <FileText size={48} />, accent: "#94A3B8" },
};
const getTypeConfig = (type: string) => typeConfig[type] || typeConfig["Other"];

const statusBadge = (st: string) => {
  const map: Record<string, { c: string; bg: string }> = {
    "In Progress": { c: C.blue, bg: C.blueDim },
    "Pre-Defense": { c: C.yellow, bg: C.yellowDim },
    "Submitted": { c: "#4ADE80", bg: "rgba(74,222,128,0.10)" },
  };
  const s = map[st] || map["In Progress"];
  return <span className="px-2.5 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, color: s.c, background: s.bg }}>{st}</span>;
};

function GroupShowcase({ groups, loading = false, richMotionEnabled }: { groups: GroupData[]; loading?: boolean; richMotionEnabled: boolean }) {
  const [filter, setFilter] = useState("All");
  // Build filters dynamically from actual group types, preserving preferred order
  const preferredOrder = ["Short Film", "Photo Exhibit", "Social Media", "Documentary", "Infographic"];
  const uniqueTypes = [...new Set(groups.map(g => g.type))];
  const orderedTypes = preferredOrder.filter(t => uniqueTypes.includes(t));
  const extraTypes = uniqueTypes.filter(t => !preferredOrder.includes(t)).sort();
  const filters = ["All", ...orderedTypes, ...extraTypes];
  const filtered = filter === "All" ? groups : groups.filter(g => g.type === filter);
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);

  return (
    <section id="groups" style={{ background: C.base, padding: "120px clamp(20px, 5vw, 40px)", backgroundImage: "radial-gradient(rgba(255,255,255,0.010) 1px, transparent 1px)", backgroundSize: "32px 32px" }}>
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        <FadeIn className="text-center mb-14">
          <SectionLabel color={C.blue}>Research Groups</SectionLabel>
          <div className="relative inline-block">
            <div className="absolute -inset-x-10 top-1/2 -translate-y-1/2 h-[300px] rounded-full pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(77,143,255,0.06) 0%, transparent 70%)" }} />
            <h2 className="relative" style={{ fontFamily: font.h, fontSize: "clamp(36px, 5vw, 52px)", fontWeight: 800, color: C.textPri, letterSpacing: "-0.02em" }}>The Research Groups</h2>
          </div>
          <p className="mt-3 max-w-md mx-auto" style={{ fontFamily: font.b, fontSize: 17, color: C.textSec, lineHeight: 1.6 }}>{groups.length} team{groups.length !== 1 ? "s" : ""}. {groups.reduce((n, g) => n + (g.members?.length || 0), 0)} researchers. One shared defense.</p>
        </FadeIn>

        <CreatorStrip groups={groups} />

        {/* Loading skeleton overlay */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-3xl overflow-hidden" style={{ background: C.raised, border: `1px solid ${C.borderSub}` }}>
                <div style={{ aspectRatio: "4/3", background: C.elevated, animation: "shimmer 2s ease-in-out infinite", animationDelay: `${i * 150}ms` }} />
                <div className="p-5 space-y-3">
                  <div className="h-4 rounded-lg" style={{ width: "80%", background: C.elevated, animation: "shimmer 2s ease-in-out infinite" }} />
                  <div className="h-3 rounded-lg" style={{ width: "60%", background: C.elevated, animation: "shimmer 2s ease-in-out infinite" }} />
                  <div className="h-3 rounded-lg" style={{ width: "40%", background: C.elevated, animation: "shimmer 2s ease-in-out infinite" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filter bar */}
        <FadeIn className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {filters.map(f => {
            const active = filter === f;
            return (
              <button key={f} onClick={() => setFilter(f)} data-interactive
                className={`rounded-xl transition-all duration-250 ${active ? "glass-btn-blue" : "glass-pill"}`}
                style={{
                  fontFamily: font.b, fontSize: 13, fontWeight: active ? 600 : 400,
                  padding: "9px 22px",
                  color: active ? C.base : C.textSec,
                }}>
                <span className="relative z-10">{f}</span>
              </button>
            );
          })}
        </FadeIn>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map((g, i) => {
            const tc = getTypeConfig(g.type);
            return (
              <FadeIn key={g.id} delay={i * 65}>
                <div className="rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-2 group landing-group-card"
                  style={{ background: `linear-gradient(145deg, ${C.raised}, ${C.elevated})`, border: `1px solid ${C.borderSub}`, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
                  data-interactive onClick={() => setSelectedGroup(g)}
                  onMouseEnter={() => setHoveredCardId(g.id)} onMouseLeave={() => setHoveredCardId(null)}>
                  {/* Top visual */}
                  <div className="relative overflow-hidden" style={{ aspectRatio: "4/3", background: tc.gradient }}>
                    {g.photoUrl ? (
                      <img src={g.photoUrl} alt={g.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" style={{ zIndex: 0, objectPosition: "center top" }} />
                    ) : (
                      <CardMicroScene accentColor={tc.accent} active={hoveredCardId === g.id} enabled={richMotionEnabled} />
                    )}
                    {!g.photoUrl && <div className="absolute inset-0 flex items-center justify-center transition-transform duration-500 group-hover:scale-110" style={{ color: "rgba(255,255,255,0.08)", zIndex: 1 }}>{tc.icon}</div>}
                    {g.photoUrl && <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(7,9,15,0.10) 0%, rgba(7,9,15,0.35) 50%, rgba(22,27,46,0.95) 100%)", zIndex: 1 }} />}
                    <div className="absolute top-3 left-4 z-[2]">
                      <span className="px-2 py-0.5 rounded-md" style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)", fontFamily: font.m, fontSize: 10, color: "rgba(255,255,255,0.45)" }}>Group {g.id}</span>
                    </div>
                    <div className="absolute top-3 right-3 z-[2] rounded-lg px-2.5 py-1" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", border: `1px solid rgba(255,255,255,0.08)` }}>
                      <span style={{ fontFamily: font.m, fontSize: 10, color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em" }}>{g.type}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-24 z-[1]" style={{ background: "linear-gradient(to top, rgba(22,27,46,1), transparent)" }} />
                    <div className="absolute bottom-3 left-4 z-[2]">{statusBadge(g.status)}</div>
                  </div>
                  {/* Bottom */}
                  <div className="p-5">
                    <h3 className="line-clamp-1" style={{ fontFamily: font.h, fontSize: 16, fontWeight: 700, color: C.textPri, lineHeight: 1.35 }}>
                      {g.name && g.name !== `Group ${g.id}` ? g.name : `Group ${g.id}`}
                    </h3>
                    {g.title && (
                      <p className="line-clamp-2 mt-1" style={{ fontFamily: font.b, fontSize: 12, color: C.textSec, lineHeight: 1.45 }}>{g.title}</p>
                    )}
                    <div className="h-px my-4" style={{ background: `linear-gradient(90deg, ${C.borderHair}, ${C.borderSub}, ${C.borderHair})` }} />
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {g.members.map((m, j) => (
                          <div key={memberInitials(m)} className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold transition-transform duration-200 group-hover:translate-x-0.5 overflow-hidden"
                            style={{ background: C.elevated, border: `2px solid ${C.borderDef}`, color: C.textSec, zIndex: 3 - j }}>
                            {memberAvatar(m) ? <img src={memberAvatar(m)!} alt={memberName(m)} className="w-full h-full object-cover" loading="lazy" decoding="async" /> : memberInitials(m)}
                          </div>
                        ))}
                      </div>
                      <span className="transition-all duration-200 group-hover:translate-x-1" style={{ fontFamily: font.b, fontSize: 12, fontWeight: 600, color: tc.accent }}>View</span>
                    </div>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>

      {/* Group Detail Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setSelectedGroup(null)}
          style={{ background: "rgba(4,6,12,0.90)", backdropFilter: "blur(20px)" }}>
          <div className="relative w-full max-w-[940px] rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12"
            onClick={(e) => e.stopPropagation()} style={{ background: C.dark, border: `1px solid ${C.borderSub}`, boxShadow: "0 32px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03)" }}>
            <button onClick={() => setSelectedGroup(null)} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[rgba(255,255,255,0.08)]" style={{ color: C.textTer }} data-interactive><X size={18} /></button>
            {/* Left visual */}
            <div className="lg:col-span-5 relative" style={{ minHeight: 300, background: getTypeConfig(selectedGroup.type).gradient }}>
              {selectedGroup.photoUrl ? (
                <img src={selectedGroup.photoUrl} alt={selectedGroup.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" style={{ zIndex: 0, objectPosition: "center top" }} />
              ) : (
                <MiniThreeScene particleCount={20} shapeCount={3} colors={[C.stiBlue, C.yellow]} enabled={richMotionEnabled} />
              )}
              {selectedGroup.photoUrl && <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(7,9,15,0.10) 0%, rgba(7,9,15,0.25) 40%, rgba(17,21,39,0.90) 100%)", zIndex: 1 }} />}
              <div className="absolute bottom-0 left-0 right-0 p-7 z-[2]" style={{ background: "linear-gradient(to top, rgba(17,21,39,0.95), transparent)" }}>
                <div className="mt-1" style={{ fontFamily: font.h, fontSize: 24, fontWeight: 800, color: C.textPri, lineHeight: 1.15 }}>
                  {selectedGroup.name && selectedGroup.name !== `Group ${selectedGroup.id}` ? selectedGroup.name : `Group ${selectedGroup.id}`}
                </div>
                {selectedGroup.title && (
                  <div className="mt-1" style={{ fontFamily: font.b, fontSize: 13, color: "rgba(255,255,255,0.50)", lineHeight: 1.4 }}>{selectedGroup.title}</div>
                )}
                <div className="flex -space-x-2 mt-3">
                  {selectedGroup.members.map((m, j) => (
                    <div key={memberInitials(m)} className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden"
                      style={{ background: C.elevated, border: `2px solid ${C.borderDef}`, color: C.textSec, zIndex: 3 - j }}>
                      {memberAvatar(m) ? <img src={memberAvatar(m)!} alt={memberName(m)} className="w-full h-full object-cover" loading="lazy" decoding="async" /> : memberInitials(m)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Right content */}
            <div className="lg:col-span-7 p-8 lg:p-9 overflow-y-auto" style={{ background: C.raised, maxHeight: "80vh" }}>
              {/* Group identity */}
              <div style={{ fontFamily: font.b, fontSize: 10, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.10em" }}>GROUP NAME</div>
              <div className="mt-1" style={{ fontFamily: font.h, fontSize: 20, fontWeight: 800, color: C.textPri }}>
                {selectedGroup.name && selectedGroup.name !== `Group ${selectedGroup.id}` ? selectedGroup.name : `Group ${selectedGroup.id}`}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <div style={{ fontFamily: font.b, fontSize: 10, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.10em" }}>TYPE</div>
                  <div className="mt-1">
                    <span className="px-3 py-1 rounded-full" style={{ background: C.blueDim, fontSize: 12, fontWeight: 600, color: C.blue }}>{selectedGroup.type}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontFamily: font.b, fontSize: 10, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.10em" }}>STATUS</div>
                  <div className="mt-1">{statusBadge(selectedGroup.status)}</div>
                </div>
              </div>
              {selectedGroup.adviser && (
                <div className="mt-4">
                  <div style={{ fontFamily: font.b, fontSize: 10, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.10em" }}>ADVISER</div>
                  <div className="mt-1" style={{ fontFamily: font.h, fontSize: 14, fontWeight: 600, color: C.textPri }}>{selectedGroup.adviser}</div>
                </div>
              )}
              {/* Team members list */}
              <div className="mt-4">
                <div style={{ fontFamily: font.b, fontSize: 10, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.10em" }}>TEAM MEMBERS</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedGroup.members.map(m => (
                    <span key={memberInitials(m)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.borderSub}` }}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold overflow-hidden" style={{ background: C.elevated, color: C.textSec }}>
                        {memberAvatar(m) ? <img src={memberAvatar(m)!} alt={memberName(m)} className="w-full h-full object-cover" /> : memberInitials(m)}
                      </span>
                      <span style={{ fontFamily: font.b, fontSize: 12, color: C.textSec }}>{memberName(m)}</span>
                    </span>
                  ))}
                </div>
              </div>
              {/* Locked output */}
              <div className="mt-6 rounded-[16px] p-5 flex items-center gap-3" style={{ background: C.deep }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: C.yellowDim }}>
                  <Award size={18} style={{ color: C.yellow, opacity: 0.6 }} />
                </div>
                <div>
                  <div style={{ fontFamily: font.h, fontSize: 14, fontWeight: 700, color: C.textPri }}>Project details in the Outputs section</div>
                  <div style={{ fontFamily: font.b, fontSize: 12, color: C.textTer }}>Scroll down to "See What They Made" v</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PROJECT OUTPUTS SHOWCASE â€” Horizontal scroll
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function OutputsShowcase({ groups, richMotionEnabled }: { groups: GroupData[]; richMotionEnabled: boolean }) {
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);
  const cards = groups.map((g) => ({ ...g, ...getTypeConfig(g.type), heroImg: g.featureImageUrl || g.photoUrl || null }));
  const outputTypes = [...new Set(cards.map((card) => card.type))];

  return (
    <section id="outputs" className="relative overflow-hidden" style={{ background: C.deep, padding: "120px clamp(18px, 5vw, 40px)" }}>
      <MiniThreeScene particleCount={80} colors={[C.stiBlue, C.yellow, "#1E0040"]} shapeCount={0} enabled={richMotionEnabled} />
      <div className="relative z-[1] max-w-[1280px] mx-auto">
        {/* Header */}
        <FadeIn className="mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end">
            <div className="lg:col-span-7">
              <SectionLabel color={C.yellow}>Project Outputs</SectionLabel>
              <div className="relative inline-block">
                <div className="absolute -inset-x-10 top-1/2 -translate-y-1/2 h-[250px] rounded-full pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(255,209,0,0.055) 0%, transparent 70%)" }} />
                <h2 className="relative" style={{ fontFamily: font.h, fontSize: "clamp(36px, 5vw, 52px)", fontWeight: 800, color: C.textPri, letterSpacing: "-0.02em" }}>See What They Made</h2>
              </div>
              <p className="mt-3 max-w-xl" style={{ fontFamily: font.b, fontSize: 17, color: C.textSec, lineHeight: 1.65 }}>
                Browse the creative outputs produced from each research project, from campaign work to documentary and visual storytelling.
              </p>
            </div>
            <div className="lg:col-span-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.035)", border: `1px solid ${C.borderSub}`, backdropFilter: "blur(12px)" }}>
                  <div style={{ fontFamily: font.h, fontSize: 28, fontWeight: 900, color: C.textPri, lineHeight: 1 }}>{cards.length}</div>
                  <div style={{ fontFamily: font.b, fontSize: 11, color: C.textTer, marginTop: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Outputs</div>
                </div>
                <div className="rounded-2xl p-4" style={{ background: "rgba(255,209,0,0.055)", border: `1px solid ${withAlpha(C.yellow, 0.16)}`, backdropFilter: "blur(12px)" }}>
                  <div style={{ fontFamily: font.h, fontSize: 28, fontWeight: 900, color: C.yellow, lineHeight: 1 }}>{outputTypes.length}</div>
                  <div style={{ fontFamily: font.b, fontSize: 11, color: C.textTer, marginTop: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Media Types</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {outputTypes.slice(0, 5).map((type) => {
                  const cfg = getTypeConfig(type);
                  return (
                    <span key={type} className="rounded-full px-3 py-1.5" style={{ background: withAlpha(cfg.accent, 0.07), border: `1px solid ${withAlpha(cfg.accent, 0.12)}`, fontFamily: font.b, fontSize: 11, color: cfg.accent }}>
                      {type}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Showcase grid */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {cards.map((c, i) => (
              <FadeIn key={c.id} delay={i * 70} className="h-full">
                <div onClick={() => setSelectedGroup(groups.find(g => g.id === c.id) || null)}
                  className="h-full rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group cursor-pointer output-showcase-card" data-interactive style={{
                  minHeight: 420, background: `linear-gradient(145deg, ${C.raised}, ${C.dark})`, border: `1px solid ${C.borderSub}`,
                  display: "flex", flexDirection: "column", boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                }}>
                  {/* Visual */}
                  <div className="relative" style={{ minHeight: 230, background: c.gradient }}>
                    {c.heroImg ? (
                      <img src={c.heroImg} alt={c.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center transition-transform duration-500 group-hover:scale-110" style={{ color: "rgba(255,255,255,0.09)" }}>{c.icon}</div>
                    )}
                    {c.heroImg && <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(7,9,15,0.10) 0%, rgba(7,9,15,0.35) 50%, rgba(17,21,39,0.95) 100%)", zIndex: 1 }} />}
                    <div className="absolute top-4 left-4 z-[2] px-3 py-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.46)", backdropFilter: "blur(10px)", border: `1px solid rgba(255,255,255,0.09)` }}>
                      <span style={{ fontFamily: font.m, fontSize: 10, color: c.accent, letterSpacing: "0.06em", textTransform: "uppercase" }}>{c.type}</span>
                    </div>
                    <div className="absolute top-4 right-4 z-[2] px-2.5 py-1 rounded-lg" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}>
                      <span style={{ fontFamily: font.m, fontSize: 10, color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em" }}>Group {c.id}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-24 z-[2]" style={{ background: `linear-gradient(to top, ${C.dark}, transparent)` }} />
                  </div>
                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1" style={{ background: C.dark }}>
                    <div style={{ fontFamily: font.b, fontSize: 11, color: C.textTer, marginBottom: 8 }}>
                      {c.name && c.name !== `Group ${c.id}` ? c.name : `Group ${c.id}`}
                    </div>
                    <h4 className="line-clamp-2" style={{ fontFamily: font.h, fontSize: 16, fontWeight: 800, color: C.textPri, lineHeight: 1.2 }}>{c.title}</h4>
                    {c.area && (
                      <p className="line-clamp-2" style={{ fontFamily: font.b, fontSize: 12, color: C.textSec, lineHeight: 1.6, marginTop: 10 }}>{c.area}</p>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-4" style={{ borderTop: `1px solid ${C.borderHair}` }}>
                      <div className="flex -space-x-2">
                        {c.members.slice(0, 3).map((m, j) => (
                          <div key={`${memberInitials(m)}-${j}`} className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold overflow-hidden"
                            style={{ background: C.elevated, border: `2px solid ${C.borderDef}`, color: C.textSec, zIndex: 3 - j }}>
                            {memberAvatar(m) ? <img src={memberAvatar(m)!} alt={memberName(m)} className="w-full h-full object-cover" loading="lazy" decoding="async" /> : memberInitials(m)}
                          </div>
                        ))}
                      </div>
                      <span className="inline-flex items-center gap-1 transition-transform duration-200 group-hover:translate-x-1" style={{ fontFamily: font.b, fontSize: 12, fontWeight: 700, color: c.accent }} data-interactive>
                        View project <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .output-showcase-card:hover{border-color:rgba(255,209,0,0.18)!important;box-shadow:0 18px 60px rgba(0,0,0,0.32),0 0 34px rgba(255,209,0,0.06)!important}
        @media (max-width:767px){.output-showcase-card{min-height:auto!important}.output-showcase-card>div:first-child{min-height:220px!important}}
      `}</style>

      {/* Group Detail Modal â€” uses feature image for "See What They Made" context */}
      {selectedGroup && (() => {
        const modalHero = selectedGroup.featureImageUrl || selectedGroup.photoUrl || null;
        return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setSelectedGroup(null)}
          style={{ background: "rgba(4,6,12,0.90)", backdropFilter: "blur(20px)" }}>
          <div className="relative w-full max-w-[940px] rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12"
            onClick={(e) => e.stopPropagation()} style={{ background: C.dark, border: `1px solid ${C.borderSub}`, boxShadow: "0 32px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03)" }}>
            <button onClick={() => setSelectedGroup(null)} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[rgba(255,255,255,0.08)]" style={{ color: C.textTer }} data-interactive><X size={18} /></button>
            {/* Left visual â€” feature image preferred */}
            <div className="lg:col-span-5 relative" style={{ minHeight: 300, background: getTypeConfig(selectedGroup.type).gradient }}>
              {modalHero ? (
                <img src={modalHero} alt={selectedGroup.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" style={{ zIndex: 0, objectPosition: "center top" }} />
              ) : (
                <MiniThreeScene particleCount={20} shapeCount={3} colors={[C.stiBlue, C.yellow]} enabled={richMotionEnabled} />
              )}
              {modalHero && <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(7,9,15,0.10) 0%, rgba(7,9,15,0.25) 40%, rgba(17,21,39,0.90) 100%)", zIndex: 1 }} />}
              <div className="absolute bottom-0 left-0 right-0 p-7 z-[2]" style={{ background: "linear-gradient(to top, rgba(17,21,39,0.95), transparent)" }}>
                <div style={{ fontFamily: font.b, fontSize: 10, color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {selectedGroup.name && selectedGroup.name !== `Group ${selectedGroup.id}` ? selectedGroup.name : `Group ${selectedGroup.id}`}
                </div>
                <div className="mt-1" style={{ fontFamily: font.h, fontSize: 22, fontWeight: 700, color: C.textPri }}>{selectedGroup.title}</div>
              </div>
            </div>
            {/* Right content */}
            <div className="lg:col-span-7 p-8 lg:p-9 overflow-y-auto" style={{ background: C.raised, maxHeight: "80vh" }}>
              {/* Project title */}
              <div style={{ fontFamily: font.b, fontSize: 10, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.10em" }}>PROJECT TITLE</div>
              <div className="mt-1" style={{ fontFamily: font.h, fontSize: 18, fontWeight: 800, color: C.textPri, lineHeight: 1.25 }}>{selectedGroup.title}</div>
              {/* Description */}
              {selectedGroup.area && (
                <div className="mt-4">
                  <div style={{ fontFamily: font.b, fontSize: 10, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.10em" }}>DESCRIPTION</div>
                  <p className="mt-1.5" style={{ fontFamily: font.b, fontSize: 14, color: C.textSec, lineHeight: 1.7 }}>{selectedGroup.area}</p>
                </div>
              )}
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <div style={{ fontFamily: font.b, fontSize: 10, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.10em" }}>TYPE</div>
                  <div className="mt-1"><span className="px-3 py-1 rounded-full" style={{ background: C.blueDim, fontSize: 12, fontWeight: 600, color: C.blue }}>{selectedGroup.type}</span></div>
                </div>
                <div>
                  <div style={{ fontFamily: font.b, fontSize: 10, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.10em" }}>STATUS</div>
                  <div className="mt-1">{statusBadge(selectedGroup.status)}</div>
                </div>
              </div>
              {selectedGroup.adviser && (
                <div className="mt-4">
                  <div style={{ fontFamily: font.b, fontSize: 10, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.10em" }}>ADVISER</div>
                  <div className="mt-1" style={{ fontFamily: font.h, fontSize: 14, fontWeight: 600, color: C.textPri }}>{selectedGroup.adviser}</div>
                </div>
              )}
              <div className="mt-4">
                <div style={{ fontFamily: font.b, fontSize: 10, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.10em" }}>TEAM MEMBERS</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedGroup.members.map(m => (
                    <span key={memberInitials(m)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.borderSub}` }}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold overflow-hidden" style={{ background: C.elevated, color: C.textSec }}>
                        {memberAvatar(m) ? <img src={memberAvatar(m)!} alt={memberName(m)} className="w-full h-full object-cover" loading="lazy" decoding="async" /> : memberInitials(m)}
                      </span>
                      <span style={{ fontFamily: font.b, fontSize: 12, color: C.textSec }}>{memberName(m)}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </section>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   DEFENSE DAY SECTION
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function DefenseDaySection({ defenses, defenseDates }: { defenses: LandingDefense[]; defenseDates: string[] }) {
  const hasReal = defenses.length > 0;

  // Determine the target date: earliest upcoming defense, or fallback
  const targetDateStr = defenseDates.length > 0 ? defenseDates[0] : "2026-05-02";
  const defenseDate = new Date(targetDateStr + "T08:00:00+08:00");
  const formattedDefDate = defenseDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const weekdayStr = defenseDate.toLocaleDateString("en-US", { weekday: "long" });

  const calcCountdown = () => {
    const diff = Math.max(0, defenseDate.getTime() - Date.now());
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { d, h, m, s, past: diff === 0 };
  };
  const [countdown, setCountdown] = useState(calcCountdown);
  useEffect(() => {
    setCountdown(calcCountdown());
    const iv = setInterval(() => setCountdown(calcCountdown), 1000);
    return () => clearInterval(iv);
  }, [targetDateStr]);

  // Derive venue from first defense with a room, or fallback
  const firstRoom = defenses.find(d => d.room && d.room !== "TBD")?.room;
  const venue = firstRoom || "TBA";
  const venueFull = firstRoom ? `${firstRoom} - STI College San Fernando` : "STI College San Fernando";
  // Derive first/last time slot
  const validTimes = defenses.filter(d => d.time && d.time !== "TBD");
  const firstTime = validTimes.length > 0 ? validTimes[0].time : "8:00 AM";
  const lastTime = validTimes.length > 1 ? validTimes[validTimes.length - 1].time : "4:00 PM";

  // Group defenses by date for multi-day support
  const defensesByDate = useMemo(() => {
    const map = new Map<string, LandingDefense[]>();
    defenses.forEach(d => {
      const key = d.date || "TBD";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    });
    return map;
  }, [defenses]);

  // Format a defense label
  const defenseLabel = (d: LandingDefense) => {
    const gNum = String(d.group || "").replace(/\D/g, "");
    const groupDisplay = d.groupName || (gNum ? `Group ${gNum}` : d.group || "-");
    return { groupDisplay, projectTitle: d.groupTitle || d.title || "" };
  };

  const countdownUnits = [
    { v: countdown.d, l: "Days", accent: C.yellow },
    { v: countdown.h, l: "Hours", accent: C.yellow },
    { v: countdown.m, l: "Min", accent: C.yellow },
    { v: countdown.s, l: "Sec", accent: withAlpha(C.yellow, 0.6) },
  ];

  return (
    <section id="defense-day" style={{ background: C.base, padding: "120px clamp(16px, 5vw, 40px)" }}>
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <FadeIn className="text-center mb-14">
          <SectionLabel color={C.error}>
            {countdown.past ? "Defense Day" : "Upcoming Defense"}
            {defenseDates.length > 0 ? ` - ${formattedDefDate}` : ""}
          </SectionLabel>
          <h2 style={{ fontFamily: font.h, fontSize: "clamp(36px, 5vw, 52px)", fontWeight: 800, color: C.textPri, letterSpacing: "-0.02em" }}>
            The Final Presentation
          </h2>
          <p className="mt-3 max-w-lg mx-auto" style={{ fontFamily: font.b, fontSize: 17, color: C.textSec, lineHeight: 1.6 }}>
            Every group presents their research, output, and findings before a panel of evaluators.
          </p>
        </FadeIn>

        {/* Countdown row */}
        <FadeIn className="mb-14">
          <div className="rounded-3xl p-8 sm:p-10 text-center" style={{
            background: `linear-gradient(180deg, ${withAlpha(C.yellow, 0.03)} 0%, transparent 100%)`,
            border: `1px solid ${withAlpha(C.yellow, 0.08)}`,
          }}>
            <div style={{ fontFamily: font.m, fontSize: 10, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 20 }}>
              {countdown.past ? "DEFENSE HAS STARTED" : "TIME REMAINING"}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              {countdownUnits.map((u, i) => (
                <div key={u.l} className="flex flex-col items-center">
                  <div className="rounded-2xl text-center py-4 px-3 sm:px-5" style={{
                    minWidth: 76,
                    background: withAlpha(C.yellow, 0.04),
                    border: `1px solid ${withAlpha(C.yellow, 0.10)}`,
                    boxShadow: `0 0 40px ${withAlpha(C.yellow, 0.03)}, inset 0 1px 0 rgba(255,255,255,0.03)`,
                  }}>
                    <span style={{
                      fontFamily: font.h, fontSize: "clamp(32px, 6vw, 52px)", fontWeight: 800,
                      color: u.accent, textShadow: `0 0 30px ${C.yellowGlow}`, lineHeight: 1, letterSpacing: "-0.02em",
                    }}>
                      {String(u.v).padStart(2, "0")}
                    </span>
                  </div>
                  <span className="mt-2.5" style={{ fontFamily: font.m, fontSize: 10, color: C.textTer, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {u.l}
                  </span>
                </div>
              ))}
            </div>
            {/* Date + venue summary */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {[
                { icon: <Calendar size={13} />, text: `${weekdayStr}, ${formattedDefDate}` },
                { icon: <Clock size={13} />, text: `${firstTime} - ${lastTime}` },
                { icon: <MapPin size={13} />, text: venueFull },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5" style={{ fontFamily: font.b, fontSize: 13, color: C.textSec }}>
                  <span style={{ color: C.textTer }}>{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Defense schedule grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT - Schedule timeline */}
          <FadeIn className="lg:col-span-7" delay={0}>
            <div className="flex items-center justify-between mb-5">
              <div style={{ fontFamily: font.h, fontSize: 18, fontWeight: 700, color: C.textPri }}>
                Defense Schedule
              </div>
              {hasReal && (
                <span className="px-2.5 py-1 rounded-full" style={{
                  fontFamily: font.m, fontSize: 10, color: C.success,
                  background: withAlpha(C.success, 0.08), border: `1px solid ${withAlpha(C.success, 0.15)}`,
                }}>
                  {defenses.length} slot{defenses.length !== 1 ? "s" : ""} scheduled
                </span>
              )}
            </div>

            {hasReal ? (
              <div className="space-y-3">
                {defenses.slice(0, 8).map((d, i) => {
                  const { groupDisplay, projectTitle } = defenseLabel(d);
                  const timeStr = d.time && d.time !== "TBD" ? d.time : "TBA";
                  const roomStr = d.room && d.room !== "TBD" ? d.room : null;
                  const dateLabel = d.date
                    ? new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "TBA";
                  return (
                    <FadeIn key={d.id || i} delay={i * 60}>
                      <div className="group rounded-2xl px-5 py-4 flex items-start gap-4 transition-all duration-300 hover:bg-[rgba(255,255,255,0.04)]" style={{
                        background: withAlpha("#fff", 0.015),
                        border: `1px solid ${C.borderHair}`,
                      }}>
                        {/* Time badge */}
                        <div className="shrink-0 text-center pt-0.5" style={{ minWidth: 56 }}>
                          <div style={{ fontFamily: font.m, fontSize: 13, fontWeight: 600, color: C.blue, lineHeight: 1.2 }}>
                            {timeStr}
                          </div>
                          <div className="mt-1" style={{ fontFamily: font.m, fontSize: 9, color: C.textTer, letterSpacing: "0.04em" }}>
                            {dateLabel}
                          </div>
                        </div>
                        {/* Divider dot */}
                        <div className="flex flex-col items-center pt-1.5 shrink-0">
                          <div className="w-2.5 h-2.5 rounded-full" style={{
                            background: C.blue,
                            boxShadow: `0 0 8px ${withAlpha(C.blue, 0.3)}`,
                          }} />
                          {i < Math.min(defenses.length, 8) - 1 && (
                            <div className="w-px flex-1 mt-1" style={{ background: C.borderDef, minHeight: 20 }} />
                          )}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span style={{ fontFamily: font.h, fontSize: 15, fontWeight: 700, color: C.textPri }}>
                              {groupDisplay}
                            </span>
                            {roomStr && (
                              <span className="px-2 py-0.5 rounded-md" style={{
                                fontFamily: font.m, fontSize: 9, color: C.textTer,
                                background: withAlpha("#fff", 0.04), border: `1px solid ${C.borderHair}`,
                              }}>
                                {roomStr}
                              </span>
                            )}
                          </div>
                          {projectTitle && (
                            <div className="mt-1 truncate" style={{ fontFamily: font.b, fontSize: 13, color: C.textSec }}>
                              {projectTitle}
                            </div>
                          )}
                        </div>
                      </div>
                    </FadeIn>
                  );
                })}
                {defenses.length > 8 && (
                  <div className="text-center pt-2" style={{ fontFamily: font.b, fontSize: 13, color: C.textTer }}>
                    +{defenses.length - 8} more slot{defenses.length - 8 !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            ) : (
              /* Empty state */
              <div className="rounded-2xl p-10 text-center" style={{
                background: withAlpha("#fff", 0.015),
                border: `1px dashed ${C.borderDef}`,
              }}>
                <Calendar size={32} style={{ color: C.textDis, margin: "0 auto 12px" }} />
                <div style={{ fontFamily: font.h, fontSize: 16, fontWeight: 700, color: C.textSec }}>
                  Schedule Coming Soon
                </div>
                <p className="mt-2 max-w-xs mx-auto" style={{ fontFamily: font.b, fontSize: 13, color: C.textTer, lineHeight: 1.6 }}>
                  Defense slots will appear here once the coordinator publishes the schedule.
                </p>
              </div>
            )}
          </FadeIn>

          {/* RIGHT â€” Defense day info card */}
          <FadeIn className="lg:col-span-5" delay={150}>
            <div className="rounded-3xl overflow-hidden" style={{
              background: C.deep,
              border: `1px solid ${C.borderSub}`,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}>
              {/* Top â€” Class photo */}
              <div className="relative" style={{ height: 200, background: C.base }}>
                <img src={bmmaClassPhoto} alt="BMMA Class" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" style={{ objectPosition: "center 25%" }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(7,9,15,0.10) 0%, rgba(17,21,39,0.85) 100%)" }} />
                <div className="absolute bottom-0 left-0 right-0 p-6 z-[1]">
                  <div style={{ fontFamily: font.h, fontSize: 20, fontWeight: 700, color: C.textPri, textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>
                    Final Defense Day
                  </div>
                  <div className="mt-1" style={{ fontFamily: font.b, fontSize: 13, color: C.textSec, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
                    Hue We Are - BMMA Capstone Defense
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="p-6" style={{ background: C.dark }}>
                <div className="space-y-3">
                  {[
                    { icon: <Calendar size={14} />, label: "Date", value: `${weekdayStr}, ${formattedDefDate}`, accent: C.blue },
                    { icon: <Clock size={14} />, label: "Time", value: `${firstTime} - ${lastTime}`, accent: C.blue },
                    { icon: <MapPin size={14} />, label: "Venue", value: venue === "TBA" ? "To Be Announced" : venue, accent: C.blue },
                    { icon: <Users size={14} />, label: "Groups", value: hasReal ? `${defenses.length} defense slot${defenses.length !== 1 ? "s" : ""}` : "TBA", accent: C.blue },
                    { icon: <Shirt size={14} />, label: "Attire", value: "Corporate / Business", accent: C.warning },
                  ].map((row, i) => (
                    <div key={row.label} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{
                      background: withAlpha("#fff", 0.02),
                      border: `1px solid ${C.borderHair}`,
                    }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{
                        background: withAlpha(row.accent, 0.06),
                        border: `1px solid ${withAlpha(row.accent, 0.10)}`,
                      }}>
                        <span style={{ color: row.accent }}>{row.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <div style={{ fontFamily: font.m, fontSize: 9, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          {row.label}
                        </div>
                        <div className="truncate" style={{ fontFamily: font.h, fontSize: 13, fontWeight: 600, color: C.textPri, marginTop: 1 }}>
                          {row.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Attire reminder pill */}
                <div className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{
                  background: withAlpha(C.warning, 0.06),
                  border: `1px solid ${withAlpha(C.warning, 0.12)}`,
                }}>
                  <Shirt size={14} />
                  <span style={{ fontFamily: font.b, fontSize: 12, fontWeight: 500, color: C.warning }}>
                    Corporate attire is required for all presenters
                  </span>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PORTAL CTA SECTION
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function PortalCTA({ onEnterPortal, richMotionEnabled }: { onEnterPortal: () => void; richMotionEnabled: boolean }) {
  return (
    <section style={{ background: C.deep, padding: "100px clamp(20px, 5vw, 40px)" }}>
      <FadeIn className="max-w-[720px] mx-auto">
        <div className="relative rounded-3xl overflow-hidden text-center" style={{
          background: `linear-gradient(145deg, ${C.dark}, ${C.raised})`,
          border: `1px solid ${C.borderSub}`, padding: "70px 44px",
          boxShadow: "0 0 100px rgba(77,143,255,0.06), 0 20px 60px rgba(0,0,0,0.3)",
        }}>
          <MiniThreeScene particleCount={30} colors={[C.blue, C.yellow, "#ffffff"]} shapeCount={0} enabled={richMotionEnabled} />
          {/* Decorative glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${withAlpha(C.blue, 0.25)}, ${withAlpha(C.yellow, 0.19)}, transparent)` }} />
          <div className="relative z-[1]">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: `linear-gradient(135deg, ${withAlpha(C.blue, 0.08)}, ${withAlpha(C.yellow, 0.06)})`, border: `1px solid ${C.borderDef}` }}>
              <Shield size={24} style={{ color: C.yellow }} />
            </div>
            <h2 style={{ fontFamily: font.h, fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, color: C.textPri, lineHeight: 1.08, letterSpacing: "-0.02em" }}>Ready to Begin?</h2>
            <p className="max-w-[440px] mx-auto mt-4" style={{ fontFamily: font.b, fontSize: 17, color: C.textSec, lineHeight: 1.65 }}>
              Sign in to track your progress, submit your manuscript, and prepare for your final defense.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
              {[
                { icon: <ClipboardList size={13} />, text: "Track Progress" },
                { icon: <FileText size={13} />, text: "Submit Manuscript" },
                { icon: <Award size={13} />, text: "Defense Ready" },
              ].map(c => (
                <span key={c.text} className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.borderSub}`, fontFamily: font.b, fontSize: 12, color: C.textSec }}>
                  <span style={{ color: C.textTer }}>{c.icon}</span>{c.text}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-center mt-9">
              <button onClick={onEnterPortal} data-interactive
                className="relative transition-all duration-300 hover:scale-[1.04] glass-btn-primary"
                style={{
                  fontFamily: font.h, fontSize: 15, fontWeight: 700, color: C.base,
                  borderRadius: 14, padding: "15px 44px",
                }}>
                <span className="relative z-10">Enter Portal</span>
              </button>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}



/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   FOOTER
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function Footer({ onEnterPortal }: { onEnterPortal: () => void }) {
  return (
    <footer style={{ background: C.deepest, borderTop: `1px solid ${C.borderHair}` }}>
      {/* Top accent line */}
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${withAlpha(C.blue, 0.12)}, ${withAlpha(C.yellow, 0.08)}, transparent)` }} />
      <div className="max-w-[1200px] mx-auto px-6 sm:px-10 pt-16 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-14">
          {/* Left */}
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${withAlpha(C.blue, 0.08)}, ${withAlpha(C.yellow, 0.06)})`, border: `1px solid ${C.borderDef}` }}>
                <span style={{ fontFamily: font.h, fontSize: 13, fontWeight: 800, background: C.goldGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>R</span>
              </div>
              <div style={{ fontFamily: font.h, fontSize: 18, fontWeight: 800, color: C.textPri }}>Hue We Are</div>
            </div>
            <div style={{ fontFamily: font.m, fontSize: 10, color: C.textTer, letterSpacing: "0.08em", textTransform: "uppercase" }}>BMMA Capstone Defense - AY 2025-2026</div>
            <div className="mt-1" style={{ fontFamily: font.b, fontSize: 13, color: C.textSec }}>STI College San Fernando</div>
            <p className="mt-4 max-w-[340px]" style={{ fontFamily: font.b, fontSize: 14, color: C.textTer, lineHeight: 1.7 }}>
              The official capstone defense portal for Bachelor of Multimedia Arts students. A showcase of multimedia arts creativity addressing real-world issues through research, storytelling, design, and digital experiences.
            </p>
          </div>
          {/* Right - link columns */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-12">
            <div>
              <div style={{ fontFamily: font.m, fontSize: 10, fontWeight: 500, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 16 }}>THE PORTAL</div>
              {["Student Login", "Panelist Login", "Adviser Login", "Coordinator Login"].map(l => (
                <button key={l} onClick={onEnterPortal} className="block mb-3 transition-all duration-200 hover:text-[#EEF0F6] hover:translate-x-1" data-interactive
                  style={{ fontFamily: font.b, fontSize: 13, color: C.textTer, background: "none", border: "none" }}>{l}</button>
              ))}
            </div>
            <div>
              <div style={{ fontFamily: font.m, fontSize: 10, fontWeight: 500, color: C.textTer, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 16 }}>QUICK LINKS</div>
              {["About", "Groups", "Outputs", "Defense Day"].map(l => (
                <button key={l} onClick={() => lerpScrollToElement(l.toLowerCase().replace(" ", "-"))}
                  className="block mb-3 transition-all duration-200 hover:text-[#EEF0F6] hover:translate-x-1" data-interactive
                  style={{ fontFamily: font.b, fontSize: 13, color: C.textTer, background: "none", border: "none" }}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-7 gap-2" style={{ borderTop: `1px solid ${C.borderHair}` }}>
          <span style={{ fontFamily: font.b, fontSize: 11, color: C.textDis }}>(c) {new Date().getFullYear()} STI College San Fernando. All rights reserved.</span>
          <span style={{ fontFamily: font.m, fontSize: 10, color: C.textDis, letterSpacing: "0.06em" }}>BMMA PROGRAM</span>
        </div>
      </div>
    </footer>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ACTIVE SECTION TRACKER
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function useActiveSection() {
  const [active, setActive] = useState("");
  useEffect(() => {
    const ids = ["about", "groups", "outputs", "defense-day"];
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
    }, { threshold: 0.3 });
    ids.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);
  return active;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   DATA FETCHING â€” Groups + Live stats from KV store
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function useLandingData() {
  const [groups, setGroups] = useState<GroupData[]>(FALLBACK_GROUPS);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"portal" | "seed" | "fallback">("fallback");
  const [live, setLive] = useState<LandingLiveData>({
    stats: null, defenses: [], defenseDates: [], announcements: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      // Fetch groups + live data in parallel
      const [groupsResult, liveResult] = await Promise.allSettled([
        (async () => {
          const res = await fetch(`${API_BASE}/landing/groups`, { headers: apiHeaders });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (data.groups && data.groups.length > 0) return { groups: data.groups, src: data.source || "seed" };

          // No real or seeded groups â€” seed fallback data
          console.log("No landing groups found, seeding...");
          await fetch(`${API_BASE}/landing/groups/seed`, { method: "POST", headers: apiHeaders });
          const res2 = await fetch(`${API_BASE}/landing/groups`, { headers: apiHeaders });
          if (!res2.ok) throw new Error(`Refetch failed: HTTP ${res2.status}`);
          const data2 = await res2.json();
          return data2.groups?.length > 0 ? { groups: data2.groups, src: data2.source || "seed" } : null;
        })(),
        (async () => {
          const res = await fetch(`${API_BASE}/landing/data`, { headers: apiHeaders });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        })(),
      ]);

      if (cancelled) return;

      if (groupsResult.status === "fulfilled" && groupsResult.value) {
        const { groups: fetchedGroups, src } = groupsResult.value;
        console.log(`[Landing] Loaded ${fetchedGroups.length} groups (source: ${src}), images:`, fetchedGroups.map((g: any) => ({ id: g.id, name: g.name, photoUrl: g.photoUrl || null, featureImageUrl: g.featureImageUrl || null })));
        setGroups(fetchedGroups);
        setSource(src === "portal" ? "portal" : "seed");
      } else {
        console.log("Landing groups fetch error, using fallback data:", groupsResult.status === "rejected" ? groupsResult.reason : "empty");
        setSource("fallback");
      }

      if (liveResult.status === "fulfilled" && liveResult.value) {
        const d = liveResult.value;
        setLive({
          stats: d.stats || null,
          defenses: d.defenses || [],
          defenseDates: d.defenseDates || [],
          announcements: d.announcements || [],
        });
      } else {
        console.log("Landing live data fetch error:", liveResult.status === "rejected" ? liveResult.reason : "empty");
      }

      if (!cancelled) setLoading(false);
    }

    fetchAll();
    return () => { cancelled = true; };
  }, []);

  return { groups, loading, source, live };
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   BACK-TO-TOP BUTTON
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} data-interactive
      className="fixed bottom-6 right-6 z-[90] w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-0.5"
      style={{
        background: withAlpha(C.blue, 0.12), border: `1px solid ${withAlpha(C.blue, 0.20)}`,
        backdropFilter: "blur(16px)", boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 20px ${withAlpha(C.blue, 0.08)}`,
        animation: "backToTopIn 300ms ease-out",
      }}>
      <ArrowUp size={16} style={{ color: C.blue }} />
    </button>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   LANDING PAGE â€” Main Export
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export function LandingPage({ onEnterPortal }: { onEnterPortal: () => void }) {
  const activeSection = useActiveSection();
  const { groups, loading, source, live } = useLandingData();
  const richMotionEnabled = useRichMotionEnabled();
  const deferredSectionsReady = useDeferredSectionReady();
  const isMobile = useMediaQuery("(max-width: 767px)");

  // Activate lerp-based smooth scroll (desktop only, 0.08 factor)
  useLerpScroll(0.08);

  return (
    <div className="landing-root" style={{ background: C.base, color: C.textPri, overflowX: "hidden" }}>
      <ScrollProgress />
      <LandingNav onEnterPortal={onEnterPortal} activeSection={activeSection} />
      <HeroSection onEnterPortal={onEnterPortal} defenses={live.defenses} stats={live.stats} richMotionEnabled={richMotionEnabled} isMobile={isMobile} />
      <SectionDivider accent={C.blue} />
      <AboutSection stats={live.stats} groupCount={groups.length} />
      {deferredSectionsReady ? (
        <>
          <SectionDivider accent={C.blue} />
          <GroupShowcase groups={groups} loading={loading} richMotionEnabled={richMotionEnabled} />
          <SectionDivider accent={C.yellow} />
          <OutputsShowcase groups={groups} richMotionEnabled={richMotionEnabled} />
          <SectionDivider accent={C.error} />
          <DefenseDaySection defenses={live.defenses} defenseDates={live.defenseDates} />
          <SectionDivider accent={C.blue} />
          <PortalCTA onEnterPortal={onEnterPortal} richMotionEnabled={richMotionEnabled} />
        </>
      ) : (
        <section style={{ background: C.base, padding: "80px 20px 120px" }}>
          <div className="max-w-[1280px] mx-auto">
            <div className="rounded-3xl p-8" style={{ background: C.raised, border: `1px solid ${C.borderSub}` }}>
              <div className="h-6 w-32 rounded-lg" style={{ background: C.elevated }} />
              <div className="mt-4 h-12 max-w-xl rounded-xl" style={{ background: C.elevated }} />
              <div className="mt-3 h-4 max-w-2xl rounded-lg" style={{ background: C.elevated }} />
            </div>
          </div>
        </section>
      )}
      <Footer onEnterPortal={onEnterPortal} />
      <BackToTop />
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes mobileMenuFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes mobileMenuItemIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes backToTopIn{from{opacity:0;transform:scale(0.8) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes shimmer{0%,100%{opacity:0.4}50%{opacity:0.7}}
        @keyframes glassBreath{0%,100%{box-shadow:0 4px 24px rgba(255,209,0,0.12),0 0 60px rgba(255,209,0,0.06),inset 0 1px 0 rgba(255,255,255,0.15)}50%{box-shadow:0 6px 32px rgba(255,209,0,0.18),0 0 80px rgba(255,209,0,0.08),inset 0 1px 0 rgba(255,255,255,0.22)}}
        @keyframes glassBreathBlue{0%,100%{box-shadow:0 4px 24px rgba(77,143,255,0.12),0 0 60px rgba(77,143,255,0.06),inset 0 1px 0 rgba(255,255,255,0.12)}50%{box-shadow:0 6px 32px rgba(77,143,255,0.18),0 0 80px rgba(77,143,255,0.08),inset 0 1px 0 rgba(255,255,255,0.18)}}
        @keyframes prismBorder{0%{border-color:rgba(255,255,255,0.12)}25%{border-color:rgba(167,139,250,0.25)}50%{border-color:rgba(77,143,255,0.25)}75%{border-color:rgba(45,212,191,0.25)}100%{border-color:rgba(255,255,255,0.12)}}
        .glass-btn-primary{position:relative;overflow:hidden;background:linear-gradient(135deg,rgba(255,209,0,0.92),rgba(255,180,0,0.95),rgba(255,209,0,0.92))!important;border:1px solid rgba(255,255,255,0.25)!important;backdrop-filter:blur(16px)!important;box-shadow:0 4px 24px rgba(255,209,0,0.15),0 0 60px rgba(255,209,0,0.06),inset 0 1px 0 rgba(255,255,255,0.25),inset 0 -1px 0 rgba(0,0,0,0.08)!important;animation:glassBreath 4s ease-in-out infinite}
        .glass-btn-primary::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(135deg,transparent 30%,rgba(255,255,255,0.25) 45%,rgba(255,255,255,0.08) 50%,transparent 55%);transform:rotate(25deg);transition:transform 600ms cubic-bezier(0.23,1,0.32,1);pointer-events:none;z-index:1}
        .glass-btn-primary:hover::before{transform:rotate(25deg) translateX(60%)}
        .glass-btn-primary::after{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(180deg,rgba(255,255,255,0.12) 0%,transparent 40%,transparent 60%,rgba(0,0,0,0.06) 100%);pointer-events:none;z-index:1}
        .glass-btn-primary:hover{box-shadow:0 8px 40px rgba(255,209,0,0.25),0 0 100px rgba(255,209,0,0.10),inset 0 1px 0 rgba(255,255,255,0.35),inset 0 -1px 0 rgba(0,0,0,0.06)!important;animation:none}
        .glass-btn-primary:active{transform:scale(0.97)!important;filter:brightness(0.95)}
        .glass-btn-secondary{position:relative;overflow:hidden;background:linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03),rgba(255,255,255,0.06))!important;border:1px solid rgba(255,255,255,0.12)!important;backdrop-filter:blur(20px) saturate(1.4)!important;box-shadow:0 4px 20px rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.10),inset 0 -1px 0 rgba(255,255,255,0.03)!important;animation:prismBorder 6s ease-in-out infinite}
        .glass-btn-secondary::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(135deg,transparent 35%,rgba(255,255,255,0.08) 48%,rgba(167,139,250,0.06) 50%,transparent 55%);transform:rotate(25deg);transition:transform 600ms cubic-bezier(0.23,1,0.32,1);pointer-events:none;z-index:1}
        .glass-btn-secondary:hover::before{transform:rotate(25deg) translateX(50%)}
        .glass-btn-secondary::after{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(180deg,rgba(255,255,255,0.04) 0%,transparent 50%);pointer-events:none;z-index:1}
        .glass-btn-secondary:hover{background:linear-gradient(145deg,rgba(255,255,255,0.10),rgba(255,255,255,0.06),rgba(255,255,255,0.10))!important;border-color:rgba(255,255,255,0.22)!important;box-shadow:0 8px 32px rgba(0,0,0,0.20),inset 0 1px 0 rgba(255,255,255,0.18),inset 0 -1px 0 rgba(255,255,255,0.04)!important;animation:none}
        .glass-btn-secondary:active{transform:scale(0.97)!important}
        .glass-btn-blue{position:relative;overflow:hidden;background:linear-gradient(135deg,rgba(77,143,255,0.88),rgba(60,120,255,0.92),rgba(77,143,255,0.88))!important;border:1px solid rgba(255,255,255,0.20)!important;backdrop-filter:blur(16px)!important;box-shadow:0 4px 24px rgba(77,143,255,0.15),0 0 60px rgba(77,143,255,0.06),inset 0 1px 0 rgba(255,255,255,0.20),inset 0 -1px 0 rgba(0,0,0,0.10)!important;animation:glassBreathBlue 4s ease-in-out infinite}
        .glass-btn-blue::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:linear-gradient(135deg,transparent 30%,rgba(255,255,255,0.20) 45%,rgba(255,255,255,0.06) 50%,transparent 55%);transform:rotate(25deg);transition:transform 600ms cubic-bezier(0.23,1,0.32,1);pointer-events:none;z-index:1}
        .glass-btn-blue:hover::before{transform:rotate(25deg) translateX(60%)}
        .glass-btn-blue::after{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(180deg,rgba(255,255,255,0.10) 0%,transparent 40%,transparent 60%,rgba(0,0,0,0.06) 100%);pointer-events:none;z-index:1}
        .glass-btn-blue:hover{box-shadow:0 8px 40px rgba(77,143,255,0.25),0 0 100px rgba(77,143,255,0.10),inset 0 1px 0 rgba(255,255,255,0.30)!important;animation:none}
        .glass-btn-blue:active{transform:scale(0.97)!important;filter:brightness(0.95)}
        .glass-pill{position:relative;overflow:hidden;background:linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))!important;border:1px solid rgba(255,255,255,0.07)!important;backdrop-filter:blur(12px) saturate(1.2)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,0.05)!important;transition:all 300ms cubic-bezier(0.23,1,0.32,1)!important}
        .glass-pill::after{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(180deg,rgba(255,255,255,0.03) 0%,transparent 50%);pointer-events:none}
        .glass-pill:hover{background:linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))!important;border-color:rgba(255,255,255,0.14)!important;box-shadow:0 4px 16px rgba(0,0,0,0.10),inset 0 1px 0 rgba(255,255,255,0.08)!important}
        .glass-icon-btn{position:relative;overflow:hidden;background:linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))!important;border:1px solid rgba(255,255,255,0.10)!important;backdrop-filter:blur(20px) saturate(1.3)!important;box-shadow:0 4px 20px rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,255,255,0.10)!important;transition:all 250ms cubic-bezier(0.23,1,0.32,1)!important}
        .glass-icon-btn::after{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(180deg,rgba(255,255,255,0.06) 0%,transparent 50%);pointer-events:none}
        .glass-icon-btn:hover{background:linear-gradient(145deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))!important;border-color:rgba(255,255,255,0.20)!important;box-shadow:0 8px 32px rgba(0,0,0,0.30),inset 0 1px 0 rgba(255,255,255,0.18)!important;transform:translateY(-50%) scale(1.08)!important}
        .glass-icon-btn:active{transform:translateY(-50%) scale(0.95)!important}
        .outputs-arrow-btn{position:relative;overflow:hidden;cursor:pointer;background:linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))!important;border:1px solid rgba(255,255,255,0.12)!important;backdrop-filter:blur(24px) saturate(1.4)!important;box-shadow:0 4px 20px rgba(0,0,0,0.30),inset 0 1px 0 rgba(255,255,255,0.10)!important;transition:background 250ms ease,border-color 250ms ease,box-shadow 250ms ease,scale 250ms ease!important}
        .outputs-arrow-btn::after{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(180deg,rgba(255,255,255,0.06) 0%,transparent 50%);pointer-events:none}
        .outputs-arrow-btn:hover{background:linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.07))!important;border-color:rgba(255,255,255,0.22)!important;box-shadow:0 8px 32px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.18)!important;scale:1.1!important}
        .outputs-arrow-btn:active{scale:0.93!important}
        .creator-strip-list{scrollbar-width:none;scroll-snap-type:x mandatory;scroll-padding-inline:12px}
        .creator-strip-list::-webkit-scrollbar{display:none}
        .creator-card{scroll-snap-align:start}
        .creator-card:hover{border-color:rgba(88,166,255,0.30)!important;box-shadow:0 12px 32px rgba(0,0,0,0.24),0 0 28px rgba(88,166,255,0.08)!important}
        .creator-nav-btn:hover{border-color:rgba(255,209,0,0.22)!important}
        @media (max-width:1023px){.creator-strip-list{scroll-padding-inline:8px}}
        @media (max-width:639px){.creator-strip-shell{border-radius:22px!important}.creator-nav-btn{width:42px!important;height:42px!important}}
        .glass-btn-primary>*,.glass-btn-secondary>*,.glass-btn-blue>*{position:relative;z-index:2}
      `}</style>
      {/* Data source indicator (dev-visible) */}
      {source !== "fallback" && (
        <div className="fixed bottom-3 left-3 z-[50] px-2.5 py-1 rounded-full"
          style={{ background: source === "portal" ? "rgba(74,222,128,0.10)" : "rgba(250,204,21,0.10)", border: `1px solid ${source === "portal" ? "rgba(74,222,128,0.20)" : "rgba(250,204,21,0.20)"}` }}>
          <span style={{ fontFamily: font.b, fontSize: 10, color: source === "portal" ? C.success : C.yellow }}>
            * {source === "portal" ? "Live portal data" : "Seeded demo data"}
          </span>
        </div>
      )}
    </div>
  );
}




