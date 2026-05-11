import { useEffect, useRef } from "react";
import { loadThreeModules } from "../lib/three-loader";
import { useHeavyEffectsEnabled } from "../lib/effects";

/**
 * Atmospheric morphing mesh — two blobs (STI Blue + STI Yellow)
 * with slow vertex displacement via sine waves.
 * Used in dark hero cards across student pages.
 */
export function MorphingMesh() {
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
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.z = 4;

    /* ── Blob helper ── */
    const createBlob = (color: string, opacity: number, xOff: number) => {
      const geo = new THREE.PlaneGeometry(5, 5, 48, 48);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity,
        wireframe: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.x = xOff;
      scene.add(mesh);

      // store original positions
      const posArr = geo.getAttribute("position");
      const origZ = new Float32Array(posArr.count);
      for (let i = 0; i < posArr.count; i++) {
        origZ[i] = posArr.getZ(i);
      }
      // random frequency per vertex
      const freqs = new Float32Array(posArr.count);
      const phases = new Float32Array(posArr.count);
      for (let i = 0; i < posArr.count; i++) {
        freqs[i] = 0.3 + Math.random() * 0.7;
        phases[i] = Math.random() * Math.PI * 2;
      }
      return { mesh, geo, origZ, freqs, phases };
    };

    const blob1 = createBlob("#003087", 0.2, -0.8);
    const blob2 = createBlob("#FFD100", 0.15, 0.8);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    let animId: number;
    const startTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = (performance.now() - startTime) / 1000;

      [blob1, blob2].forEach((blob) => {
        const posAttr = blob.geo.getAttribute("position");
        for (let i = 0; i < posAttr.count; i++) {
          const x = posAttr.getX(i);
          const y = posAttr.getY(i);
          const newZ = blob.origZ[i] + Math.sin(x * blob.freqs[i] + t * 0.5 + blob.phases[i]) *
            Math.cos(y * blob.freqs[i] * 0.8 + t * 0.3) * 0.35;
          posAttr.setZ(i, newZ);
        }
        posAttr.needsUpdate = true;
      });

      renderer.render(scene, camera);
    };
    animate();

    cleanup = () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      blob1.geo.dispose();
      (blob1.mesh.material as any).dispose();
      blob2.geo.dispose();
      (blob2.mesh.material as any).dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
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
