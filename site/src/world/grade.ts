// The time of day as a colour grade on everything outdoors, ported from the game's Core/Grade.cs: grades.json (from
// ArtSource/kit.js), cloud shadows that fade toward night, the sun turning with the day (low in the morning and at
// dusk), lamplight after dark and a rim of sky light on the ants. Here the time runs on a number, 0 morning, 1 midday,
// 2 dusk, 3 night, so the page's scroll can turn the light smoothly between any two.
import * as THREE from 'three';
import type { Grades, Phase } from './data';
import { shared } from './pixel';

export const PHASES: Phase[] = ['morning', 'midday', 'dusk', 'night'];

interface Look {
  mul: THREE.Vector3;
  add: THREE.Vector3;
  shade: THREE.Vector3;
  clouds: number;
  lamp: THREE.Vector4;
  rim: THREE.Vector4;
  sun: THREE.Vector3;
  shadow: THREE.Vector3;
}

// (height above the horizon, turn from north, shadow colour): shadows fall away from the camera, west in the morning,
// east at dusk; the moon's are faint.
const SUN: Record<Phase, [number, number, number[]]> = {
  morning: [28, -64, [0.6, 0.64, 0.82]],
  midday: [52, -32, [0.64, 0.68, 0.82]],
  dusk: [24, 58, [0.62, 0.54, 0.72]],
  night: [50, -36, [0.78, 0.78, 0.88]],
};

/** Toward the sun in three.js's axes, from the game's Unity Euler angles (z flipped). */
function toSun(height: number, turn: number) {
  const h = (height * Math.PI) / 180, t = (turn * Math.PI) / 180;
  return new THREE.Vector3(-Math.sin(t) * Math.cos(h), Math.sin(h), Math.cos(t) * Math.cos(h)).normalize();
}

export function looks(grades: Grades): Look[] {
  return PHASES.map(p => {
    const g = grades[p];
    const [height, turn, tint] = SUN[p];
    return {
      mul: new THREE.Vector3().fromArray(g.mul),
      add: new THREE.Vector3().fromArray(g.add),
      shade: new THREE.Vector3().fromArray(g.shade),
      clouds: { morning: 0.8, midday: 1, dusk: 0.4, night: 0 }[p],
      lamp: new THREE.Vector4(1, 0.72, 0.38, { morning: 0, midday: 0, dusk: 0.6, night: 1 }[p]),
      rim: { morning: new THREE.Vector4(), midday: new THREE.Vector4(), dusk: new THREE.Vector4(1, 0.82, 0.66, 0.45), night: new THREE.Vector4(0.7, 0.8, 1, 0.35) }[p],
      sun: toSun(height, turn),
      shadow: new THREE.Vector3().fromArray(tint),
    };
  });
}

/** Sets the light to time t (0 morning .. 3 night). Returns the sun's direction. */
export function apply(all: Look[], t: number) {
  const i = Math.min(Math.max(Math.floor(t), 0), 2), k = Math.min(Math.max(t - i, 0), 1);
  const a = all[i]!, b = all[i + 1]!;
  const u = shared;
  u.uMul.value.lerpVectors(a.mul, b.mul, k);
  u.uAdd.value.lerpVectors(a.add, b.add, k);
  u.uShade.value.lerpVectors(a.shade, b.shade, k);
  u.uClouds.value = a.clouds + (b.clouds - a.clouds) * k;
  u.uLampTint.value.lerpVectors(a.lamp, b.lamp, k);
  u.uRim.value.lerpVectors(a.rim, b.rim, k);
  u.uShadowTint.value.lerpVectors(a.shadow, b.shadow, k);
  u.uSunDir.value.copy(a.sun).lerp(b.sun, k).normalize();
  return u.uSunDir.value;
}

/** A colour that is not art (the sky behind the forest) graded as the shader grades art. */
export function gradeColor(hex: string, out: THREE.Color) {
  const c = new THREE.Color(hex);
  const s = 1 - (0.299 * c.r + 0.587 * c.g + 0.114 * c.b);
  const m = shared.uMul.value, a = shared.uAdd.value, h = shared.uShade.value;
  const ch = (v: number, mm: number, aa: number, hh: number) => Math.min(Math.max(v * mm + (aa + hh * s) / 255, 0), 1);
  return out.setRGB(ch(c.r, m.x, a.x, h.x), ch(c.g, m.y, a.y, h.y), ch(c.b, m.z, a.z, h.z));
}
