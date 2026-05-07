/* ═══════════════════════════════════════════════════════
   SHARED — CardGlowScene
   Hover-activated Three.js particle system with
   UnrealBloom post-processing (cinematic dark premium).

   Used across Student, Panelist & Coordinator portals.
   Two density presets via `compact` prop:
     compact=false (default) → 14 particles, wider spread   (hero cards)
     compact=true            → 10 particles, tighter spread (stat cards)
   ═══════════════════════════════════════════════════════ */
import { useEffect, useRef } from "react";
import { THREE, EffectComposer, RenderPass, UnrealBloomPass } from "../lib/three-exports";

interface CardGlowSceneProps {
  /** Accent colour for the particles (hex string) */
  accentColor: string;
  /** Whether the effect is active (usually tied to hover state) */
  active: boolean;
  /**
   * When true uses fewer particles with a tighter spread —
   * ideal for small stat cards. Default false (hero-sized cards).
   */
  compact?: boolean;
}

export function CardGlowScene({ accentColor, active, compact = false }: CardGlowSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ targetOpacity: number } | null>(null);

  /* ── Preset parameters ── */
  const COUNT       = compact ? 10 : 14;
  const SPREAD_X    = compact ? 70 : 90;
  const SPREAD_Y    = compact ? 50 : 70;
  const SPREAD_Z    = compact ? 20 : 30;
  const DRIFT_SPEED = compact ? 0.10 : 0.12;
  const BOUND_X     = compact ? 38 : 48;
  const BOUND_Y     = compact ? 28 : 38;
  const MOUSE_SX    = compact ? 35 : 45;
  const MOUSE_SY    = compact ? 25 : 35;
  const ATTRACT_R   = compact ? 30 : 35;
  const ATTRACT_F   = compact ? 0.5 : 0.6;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const W = container.clientWidth, H = container.clientHeight;
    if (W === 0 || H === 0) return;

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    container.appendChild(renderer.domElement);

    /* ── Scene / Camera ── */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 200);
    camera.position.z = 60;

    /* ── Particles ── */
    const accent = new THREE.Color(accentColor);
    const palette = [
      accent,
      new THREE.Color(accentColor).offsetHSL(0.15, 0, 0.1),
      new THREE.Color(accentColor).offsetHSL(-0.15, 0, 0.1),
      new THREE.Color("#FFD100"),
      new THREE.Color("#38BDF8"),
    ];

    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const drift = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * SPREAD_X;
      pos[i * 3 + 1] = (Math.random() - 0.5) * SPREAD_Y;
      pos[i * 3 + 2] = (Math.random() - 0.5) * SPREAD_Z;
      const c = palette[i % palette.length];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      drift[i * 3]     = (Math.random() - 0.5) * DRIFT_SPEED;
      drift[i * 3 + 1] = (Math.random() - 0.5) * DRIFT_SPEED;
      drift[i * 3 + 2] = 0;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

    /* ── Shader material ── */
    const pMat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity:     { value: 0 },
        uPixelRatio:  { value: renderer.getPixelRatio() },
        uTime:        { value: 0 },
        uMousePos:    { value: new THREE.Vector2(9999, 9999) },
        uMouseActive: { value: 0.0 },
      },
      vertexShader: `
        attribute vec3 color; varying vec3 vColor; varying float vBreath;
        uniform float uPixelRatio; uniform float uTime; uniform vec2 uMousePos; uniform float uMouseActive;
        void main() {
          vColor = color;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          float dist = length(position.xy - uMousePos);
          float proximity = 1.0 - smoothstep(0.0, 40.0, dist);
          float breath = 1.0 + proximity * uMouseActive * (0.5 + 0.2 * sin(uTime * 3.0 + position.x * 0.08));
          vBreath = proximity * uMouseActive;
          gl_PointSize = 18.0 * breath * uPixelRatio * (100.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor; varying float vBreath; uniform float uOpacity;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float gaussian = exp(-(d * d) * 7.0) * (0.5 + vBreath * 0.25);
          float halo     = exp(-(d * d) * 2.2);
          float boost     = 1.0 + vBreath * 0.7;
          vec3 col  = vColor * (gaussian * 1.8 + halo * 0.75) * boost;
          float alpha = (gaussian * 0.42 + halo * 0.18) * uOpacity;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    scene.add(new THREE.Points(geo, pMat));

    /* ── Bloom post-processing ── */
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 1.35, 0.85, 0.06));

    /* ── Mouse tracking ── */
    const m3 = new THREE.Vector3(9999, 9999, 0);
    let mIn = false;
    const onMM = (e: MouseEvent) => {
      const r = container.getBoundingClientRect();
      m3.set(
        ((e.clientX - r.left) / r.width * 2 - 1) * MOUSE_SX,
        -((e.clientY - r.top) / r.height * 2 - 1) * MOUSE_SY,
        0,
      );
      mIn = true;
    };
    const onML = () => { mIn = false; m3.set(9999, 9999, 0); };
    container.addEventListener("mousemove", onMM);
    container.addEventListener("mouseleave", onML);

    /* ── Animation loop ── */
    let opacity = 0;
    let raf: number;
    const state = { targetOpacity: 0 };
    sceneRef.current = state;

    const t0 = performance.now();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = (performance.now() - t0) / 1000;

      opacity += (state.targetOpacity - opacity) * 0.08;
      pMat.uniforms.uOpacity.value = opacity;
      pMat.uniforms.uTime.value = t;
      pMat.uniforms.uMousePos.value.set(m3.x, m3.y);
      pMat.uniforms.uMouseActive.value += ((mIn ? 1.0 : 0.0) - pMat.uniforms.uMouseActive.value) * 0.08;

      if (opacity > 0.01) {
        const pp = geo.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < COUNT; i++) {
          let x = pp.getX(i) + drift[i * 3];
          let y = pp.getY(i) + drift[i * 3 + 1];
          if (Math.abs(x) > BOUND_X) drift[i * 3] *= -1;
          if (Math.abs(y) > BOUND_Y) drift[i * 3 + 1] *= -1;
          if (mIn) {
            const dx = m3.x - x, dy = m3.y - y, d = Math.sqrt(dx * dx + dy * dy);
            if (d < ATTRACT_R && d > 1) {
              const f = (1 - d / ATTRACT_R) * ATTRACT_F;
              x += (dx / d) * f;
              y += (dy / d) * f;
            }
          }
          pp.setXYZ(i, x, y, pp.getZ(i));
        }
        pp.needsUpdate = true;
      }

      composer.render();
    };
    animate();

    /* ── Cleanup ── */
    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener("mousemove", onMM);
      container.removeEventListener("mouseleave", onML);
      composer.dispose();
      renderer.dispose();
      geo.dispose();
      pMat.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, [accentColor]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Fade opacity on active change ── */
  useEffect(() => {
    if (sceneRef.current) sceneRef.current.targetOpacity = active ? 0.85 : 0;
  }, [active]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0"
      style={{ zIndex: 0, borderRadius: "inherit", filter: "blur(18px) saturate(1.35)", transform: "scale(1.1)" }}
    />
  );
}
