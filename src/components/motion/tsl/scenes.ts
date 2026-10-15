/**
 * Small WebGL scenes written with three.js TSL node materials.
 *
 * This module pulls in three.js, which is large. It must only ever be reached through the
 * dynamic import in ../Scenes.tsx, so pages that never show a scene never download it.
 * Colours are read from the design tokens at mount time; nothing here hard-codes a colour.
 */
import * as THREE from "three/webgpu";
import { abs, color, floor, fract, max, mix, positionLocal, sin, smoothstep, step, time, uv, vec2, vec3 } from "three/tsl";

export type SceneName = "loom";

export interface SceneHandle {
  setRunning(running: boolean): void;
  dispose(): void;
}

type Update = (seconds: number) => void;
type Builder = (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => Update;

function token(name: string): THREE.Color {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color(value || "#ffffff");
}

/** Hero: a sheet of warp and weft that ripples, with lime weft threads running across it. */
const loom: Builder = (scene, camera) => {
  const material = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });

  const p = positionLocal;
  const ripple = sin(p.x.mul(1.4).add(time.mul(0.7)))
    .mul(0.14)
    .add(sin(p.y.mul(2.2).sub(time.mul(0.5))).mul(0.09));
  material.positionNode = vec3(p.x, p.y, ripple);

  const cell = uv().mul(vec2(36, 24));
  const warp = smoothstep(0.43, 0.5, abs(fract(cell.x).sub(0.5)));
  const weft = smoothstep(0.43, 0.5, abs(fract(cell.y).sub(0.5)));
  const threads = max(warp, weft);

  // A pseudo-random value per weft row decides which rows carry a shuttle, and its phase.
  const seed = fract(sin(floor(cell.y).mul(12.9898)).mul(43758.5453));
  const head = fract(time.mul(0.12).add(seed));
  const shuttle = smoothstep(0, 0.12, abs(uv().x.sub(head)))
    .oneMinus()
    .mul(weft)
    .mul(step(0.72, seed));

  const fade = smoothstep(0.05, 0.6, uv().x)
    .mul(smoothstep(0, 0.3, uv().y))
    .mul(smoothstep(0, 0.2, uv().y.oneMinus()));

  material.colorNode = mix(color(token("--color-line-control")), color(token("--color-lime")), shuttle);
  material.opacityNode = threads.mul(0.3).add(shuttle).mul(fade);

  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(10, 6.5, 140, 90), material);
  sheet.rotation.x = -1.02;
  scene.add(sheet);
  camera.position.set(0, 0.9, 6.4);
  camera.lookAt(0, -0.5, 0);
  return () => undefined;
};

const BUILDERS: Record<SceneName, Builder> = { loom };

/**
 * Mounts a scene into `host` and returns a handle. Uses three's WebGL 2 backend
 * (`forceWebGL`) so behaviour is the same across browsers. Throws if WebGL is unavailable;
 * the caller keeps showing its SVG fallback in that case.
 */
export async function mountScene(name: SceneName, host: HTMLElement): Promise<SceneHandle> {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "display:block;width:100%;height:100%";
  host.appendChild(canvas);

  let renderer: THREE.WebGPURenderer;
  try {
    renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: true, forceWebGL: true });
    await renderer.init();
  } catch (error) {
    canvas.remove();
    throw error;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  const update = BUILDERS[name](scene, camera);

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = host;
    if (width === 0 || height === 0) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  const started = performance.now();
  const frame = () => {
    update((performance.now() - started) / 1000);
    renderer.render(scene, camera);
  };

  let running = false;
  return {
    setRunning(next) {
      if (next === running) return;
      running = next;
      void renderer.setAnimationLoop(next ? frame : null);
    },
    dispose() {
      running = false;
      void renderer.setAnimationLoop(null);
      observer.disconnect();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
      });
      renderer.dispose();
      canvas.remove();
    },
  };
}
