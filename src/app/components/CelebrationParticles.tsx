import { useEffect, useRef } from "react";
import { loadThreeModules } from "../lib/three-loader";
import { useHeavyEffectsEnabled } from "../lib/effects";

/**
 * Gentle celebration particles — small circles floating upward
 * in STI Blue, STI Yellow, and success green.
 */
export function CelebrationParticles() {
  const mountRef = useRef<HTMLDivElement>(null);
  const heavyEffectsEnabled = useHeavyEffectsEnabled();

  useEffect(() => {
    if (!heavyEffectsEnabled) return;
    const container = mountRef.current;
    if (!container) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
    const { THREE } = await loadThreeModules();
    if (cancelled) return;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const w = container.clientWidth;
    const h = container.clientHeight;
    const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 100);
    camera.position.z = 10;

    const COUNT = 40;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    const velocities: { x: number; y: number; rot: number }[] = [];

    const palette = [
      [0, 0.19, 0.53],   // #003087
      [1, 0.82, 0],       // #FFD100
      [0.09, 0.64, 0.29], // #16A34A
    ];

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * w;
      positions[i3 + 1] = (Math.random() - 0.5) * h;
      positions[i3 + 2] = 0;

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i3] = c[0];
      colors[i3 + 1] = c[1];
      colors[i3 + 2] = c[2];

      sizes[i] = 2 + Math.random() * 4;

      velocities.push({
        x: (Math.random() - 0.5) * 0.3,
        y: 0.3 + Math.random() * 0.5,
        rot: (Math.random() - 0.5) * 0.02,
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uPixelRatio: { value: renderer.getPixelRatio() } },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vY;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vY = position.y;
          gl_PointSize = size * uPixelRatio;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vY;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.15, d) * 0.6;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const posAttr = geo.getAttribute("position") as any;
      const hh = h / 2 + 10;

      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        let px = posAttr.array[i3] as number;
        let py = posAttr.array[i3 + 1] as number;
        px += velocities[i].x;
        py += velocities[i].y;
        if (py > hh) { py = -hh; px = (Math.random() - 0.5) * w; }
        (posAttr.array as Float32Array)[i3] = px;
        (posAttr.array as Float32Array)[i3 + 1] = py;
      }
      posAttr.needsUpdate = true;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      renderer.setSize(cw, ch);
      camera.left = -cw / 2; camera.right = cw / 2;
      camera.top = ch / 2; camera.bottom = -ch / 2;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    cleanup = () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [heavyEffectsEnabled]);

  if (!heavyEffectsEnabled) return null;

  return <div ref={mountRef} className="absolute inset-0" style={{ zIndex: 0 }} />;
}
