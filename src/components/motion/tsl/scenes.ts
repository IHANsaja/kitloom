/**
 * Small WebGL scenes written with three.js TSL node materials.
 *
 * This module pulls in three.js, which is large. It must only ever be reached through the
 * dynamic import in ../Scenes.tsx, so pages that never show a scene never download it.
 * Colours are read from the design tokens at mount time; nothing here hard-codes a colour.
 */
import * as THREE from "three/webgpu";
import { abs, color, float, floor, fract, max, mix, positionLocal, sin, smoothstep, step, time, uv, vec2, vec3 } from "three/tsl";

export type SceneName = "loom" | "kit";

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

/** About: a kit as an open frame, with its files in orbit around it. */
const kit: Builder = (scene, camera) => {
  const outline = (tint: THREE.Color, inner: number) => {
    const material = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const edge = smoothstep(inner, 0.5, max(abs(uv().x.sub(0.5)), abs(uv().y.sub(0.5))));
    material.colorNode = color(tint);
    material.opacityNode = mix(float(0.05), float(1), edge);
    return material;
  };

  const group = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 1.7), outline(token("--color-lime"), 0.465));
  group.add(box);

  const sheetMaterial = outline(token("--color-fg-2"), 0.44);
  const sheets = [0, 1, 2, 3].map((index) => {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.66), sheetMaterial);
    sheet.userData.phase = (index / 4) * Math.PI * 2;
    group.add(sheet);
    return sheet;
  });

  scene.add(group);
  camera.position.set(0, 1.3, 4.7);
  camera.lookAt(0, 0, 0);
  return (seconds) => {
    box.rotation.y = seconds * 0.35;
    box.rotation.x = Math.sin(seconds * 0.3) * 0.2;
    for (const sheet of sheets) {
      const angle = seconds * 0.5 + (sheet.userData.phase as number);
      sheet.position.set(Math.cos(angle) * 1.65, Math.sin(angle * 2) * 0.3, Math.sin(angle) * 1.65);
      sheet.rotation.y = -angle + Math.PI / 2;
    }
  };
};

const BUILDERS: Record<SceneName, Builder> = { loom, kit };

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
