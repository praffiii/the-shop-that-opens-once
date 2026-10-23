// Draws the game's exported pixel art in the 3D view, ported from the game's Shaders/Pixel.shader. Art is graded for
// the time of day unless it is a light: out = in * mul + add + shade * (1 - luma), on sRGB 0-255, as the game's
// ArtSource/kit.js grades it, so colours stay as stored (textures carry no colour space, nothing is converted).
// Art is cut out (a texel is there or not, and writes depth), so the ground, the standing cards and the ants hide
// each other by depth. A light is blended over the art instead, never graded. The world moves a little: a piece with
// a sway bends in the wind, each row shifted by whole texels; cloud shadows drift over everything graded. Faces
// turned from the sun are shaded, and the sun's own shadows (shadow.ts) fall on everything cut out. After dark the
// lamps glow on what is near them, in four steps.
import * as THREE from 'three';
import { STRETCH } from './space';

export const MAX_LAMPS = 32;

/** The uniforms every piece of art shares: one object, so setting a value sets it everywhere. */
export const shared = {
  uTime: { value: 0 },
  uMul: { value: new THREE.Vector3(1, 1, 1) },
  uAdd: { value: new THREE.Vector3() },
  uShade: { value: new THREE.Vector3() },
  uClouds: { value: 0 },
  uShadowTint: { value: new THREE.Vector3(0.64, 0.68, 0.82) },
  uLampTint: { value: new THREE.Vector4(1, 0.72, 0.38, 0) },
  uLamps: { value: Array.from({ length: MAX_LAMPS }, () => new THREE.Vector4()) },
  uLampCount: { value: 0 },
  uRim: { value: new THREE.Vector4() },
  uStretch: { value: STRETCH.clone() },
  /** Toward the sun, in the stretched world. */
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uSunMap: { value: null as THREE.Texture | null },
  uSunMatrix: { value: new THREE.Matrix4() },
  uSunOn: { value: 0 },
  // Where the ants stand (place space), each casting a small dark spot, and how many there are.
  uFeet: { value: Array.from({ length: 16 }, () => new THREE.Vector4()) },
  uFeetCount: { value: 0 },
};

const vertex = /* glsl */ `
  attribute vec2 texel;
  attribute vec2 frame;
  attribute vec2 size;
  attribute vec3 sway;
  varying vec2 vUv;
  varying vec4 vRect;
  varying vec3 vSway;
  varying vec3 vArt;
  varying vec3 vNormal;
  void main() {
    vNormal = normal;
    vUv = frame + texel;
    vRect = vec4(frame, frame + size);
    vSway = sway;
    vArt = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D map;
  uniform vec2 atlas;
  uniform float light;
  uniform float actor;
  uniform float fade;
  uniform float uTime;
  uniform vec3 uMul, uAdd, uShade, uShadowTint, uStretch;
  uniform float uClouds;
  uniform vec4 uLampTint;
  uniform vec4 uLamps[${MAX_LAMPS}];
  uniform float uLampCount;
  uniform vec4 uRim;
  uniform sampler2D uSunMap;
  uniform mat4 uSunMatrix;
  uniform float uSunOn;
  uniform vec4 uFeet[16];
  uniform float uFeetCount;
  uniform vec3 uSunDir;
  uniform mat4 modelMatrix;
  varying vec2 vUv;
  varying vec4 vRect;
  varying vec3 vSway;
  varying vec3 vArt;
  varying vec3 vNormal;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + 1.0), f.x), f.y);
  }

  // The texel shown, bent by the wind: rows bend from a third of the way up, most at the top.
  vec4 texel() {
    vec2 uv = vUv;
    if (vSway.x > 0.0) {
      float row = floor(uv.y) + 0.5;
      float h = clamp((vRect.w - row) / max(1.0, vRect.w - vRect.y), 0.0, 1.0);
      float bend = pow(clamp((h - 0.3) / 0.7, 0.0, 1.0), 1.5);
      float wave = sin(uTime * 1.6 + vSway.y) * 0.7 + sin(uTime * 0.55 + vSway.y * 1.9) * 0.3;
      uv.x -= floor(vSway.x * bend * wave + 0.5);
      if (uv.x < vRect.x || uv.x > vRect.z) return vec4(0.0);
    }
    return texture2D(map, uv / atlas);
  }

  const float bayer[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);

  // How lit by the sun the art pixel round this point is: 1 in the light, 0 in shadow.
  float sunlight(vec3 at) {
    if (uSunOn < 0.5) return 1.0;
    vec4 p = uSunMatrix * modelMatrix * vec4(at, 1.0);
    vec3 s = p.xyz / p.w * 0.5 + 0.5;
    if (any(lessThan(s.xy, vec2(0.0))) || any(greaterThan(s.xy, vec2(1.0)))) return 1.0;
    return s.z - 0.0015 > texture2D(uSunMap, s.xy).r ? 0.0 : 1.0;
  }

  void main() {
    vec4 c = texel();
    if (light > 0.5) {
      if (c.a < 0.01) discard;
      gl_FragColor = c;
      return;
    }
    if (c.a < 0.5) discard;
    ivec2 q = ivec2(gl_FragCoord.xy) & 3;
    if (fade < (bayer[q.y * 4 + q.x] + 0.5) / 16.0) discard;
    vec3 s = c.rgb;
    float shade = 1.0 - dot(s, vec3(0.299, 0.587, 0.114));
    s = clamp(s * uMul + (uAdd + uShade * shade) / 255.0, 0.0, 1.0);
    vec3 art = floor(vArt) + 0.5;
    if (uClouds > 0.0) {
      vec2 p = floor(vArt.xz) + uTime * vec2(7.0, 2.5);
      float n = noise(p / 260.0) * 0.6 + noise(p / 96.0) * 0.28 + noise(p / 31.0) * 0.12;
      s *= mix(vec3(1.0), vec3(0.8, 0.84, 0.94), step(0.6, n) * uClouds);
    }
    // A house's face turned from the sun is in its own shade, in quarter steps, as the game shades it.
    float away = dot(vNormal, vNormal) > 0.0 ? 1.0 - floor(clamp(dot(vNormal, uSunDir) * 3.0, 0.0, 1.0) * 4.0 + 0.5) / 4.0 : 0.0;
    float sun = min(sunlight(art), 1.0 - max(vSway.z, away));
    s *= mix(uShadowTint, vec3(1.0), sun);
    if (actor > 0.5) {
      // Caught by the sky along the top edge, where the texel above is clear.
      float above = texture2D(map, (vUv - vec2(0.0, 1.0)) / atlas).a;
      s = mix(s, uRim.rgb, uRim.a * step(above, 0.5));
    } else {
      for (int k = 0; k < 16; k++) {
        if (float(k) >= uFeetCount) break;
        vec3 d = (art - uFeet[k].xyz) * uStretch / uFeet[k].w;
        vec2 e = d.xz * vec2(1.0, 2.6);
        s *= mix(vec3(1.0), uShadowTint, step(dot(e, e), 1.0) * step(abs(d.y), 0.4) * 0.8);
      }
    }
    float glow = 0.0;
    for (int l = 0; l < ${MAX_LAMPS}; l++) {
      if (float(l) >= uLampCount) break;
      glow += clamp(1.0 - distance(art * uStretch, uLamps[l].xyz * uStretch) / uLamps[l].w, 0.0, 1.0);
    }
    glow = floor(clamp(glow, 0.0, 1.0) * 4.0) / 4.0 * uLampTint.a;
    s = s * (1.0 + uLampTint.rgb * glow * 0.8) + uLampTint.rgb * glow * 0.04;
    gl_FragColor = vec4(clamp(s, 0.0, 1.0), 1.0);
  }
`;

/** The material for one atlas (or a ground chunk). A light is blended over the art and never graded. */
export function pixel(map: THREE.Texture, o: { light?: boolean; actor?: boolean } = {}) {
  const img = map.image as { width: number; height: number };
  return new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      map: { value: map },
      atlas: { value: new THREE.Vector2(img.width, img.height) },
      light: { value: o.light ? 1 : 0 },
      actor: { value: o.actor ? 1 : 0 },
      fade: { value: 1 },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    side: THREE.DoubleSide,
    transparent: !!o.light,
    depthWrite: !o.light,
  });
}

/** What the sun's shadow map is drawn with: the same cut-out, nothing else. */
export function caster(map: THREE.Texture) {
  const img = map.image as { width: number; height: number };
  return new THREE.ShaderMaterial({
    uniforms: { ...shared, map: { value: map }, atlas: { value: new THREE.Vector2(img.width, img.height) } },
    vertexShader: vertex,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform vec2 atlas;
      uniform float uTime;
      varying vec2 vUv;
      varying vec4 vRect;
      varying vec3 vSway;
      varying vec3 vArt;
      void main() {
        vec2 uv = vUv;
        if (vSway.x > 0.0) {
          float row = floor(uv.y) + 0.5;
          float h = clamp((vRect.w - row) / max(1.0, vRect.w - vRect.y), 0.0, 1.0);
          float bend = pow(clamp((h - 0.3) / 0.7, 0.0, 1.0), 1.5);
          float wave = sin(uTime * 1.6 + vSway.y) * 0.7 + sin(uTime * 0.55 + vSway.y * 1.9) * 0.3;
          uv.x -= floor(vSway.x * bend * wave + 0.5);
          if (uv.x < vRect.x || uv.x > vRect.z) discard;
        }
        if (texture2D(map, uv / atlas).a < 0.5) discard;
        gl_FragColor = vec4(gl_FragCoord.z, 0.0, 0.0, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });
}
