// The HD-2D finish over the view, made cheap for a browser. The game uses URP's Bokeh depth of field, HDR bloom and a
// vignette; the cancelled Unity web build ran that at about 6 fps, so here the depth of field is a tilt-shift blur in
// one pass, its radius growing above and below a sharp band round where the camera looks, and the bloom is the
// lights alone, drawn small, blurred twice and added back.
import * as THREE from 'three';

const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const scene = new THREE.Scene();
scene.add(quad);
quad.frustumCulled = false;

const passVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const B = { src: { value: null as THREE.Texture | null }, step: { value: new THREE.Vector2() } };
const blur = new THREE.ShaderMaterial({
  uniforms: B,
  vertexShader: passVertex,
  fragmentShader: /* glsl */ `
    uniform sampler2D src;
    uniform vec2 step;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(src, vUv) * 0.227;
      c += (texture2D(src, vUv + step * 1.385) + texture2D(src, vUv - step * 1.385)) * 0.316;
      c += (texture2D(src, vUv + step * 3.231) + texture2D(src, vUv - step * 3.231)) * 0.070;
      gl_FragColor = c;
    }
  `,
  depthTest: false,
  depthWrite: false,
});

const F = {
  src: { value: null as THREE.Texture | null },
  glow: { value: null as THREE.Texture | null },
  px: { value: new THREE.Vector2() },
  /** Where the sharp band sits (0 bottom, 1 top), how tall it is, and how far the blur reaches past it (CSS px). */
  focus: { value: 0.5 },
  band: { value: 0.16 },
  reach: { value: 7 },
  bloom: { value: 0 },
  vignette: { value: 0.38 },
};
const finish = new THREE.ShaderMaterial({
  uniforms: F,
  vertexShader: passVertex,
  fragmentShader: /* glsl */ `
    uniform sampler2D src, glow;
    uniform vec2 px;
    uniform float focus, band, reach, bloom, vignette;
    varying vec2 vUv;
    // A golden-angle spiral of taps: an even disc of blur in one pass.
    void main() {
      float d = max(abs(vUv.y - focus) - band, 0.0) / (1.0 - band);
      float r = reach * smoothstep(0.0, 1.0, d * 1.6);
      vec3 c = texture2D(src, vUv).rgb;
      if (r > 0.35) {
        vec3 sum = c;
        float n = 1.0;
        for (int i = 1; i < 24; i++) {
          float k = float(i);
          float a = k * 2.39996, l = sqrt(k / 24.0) * r;
          sum += texture2D(src, vUv + vec2(cos(a), sin(a)) * l * px).rgb;
          n += 1.0;
        }
        c = sum / n;
      }
      c += texture2D(glow, vUv).rgb * bloom;
      vec2 v = vUv - 0.5;
      c *= 1.0 - vignette * smoothstep(0.35, 0.95, length(v * vec2(1.15, 1.0)));
      gl_FragColor = vec4(c, 1.0);
    }
  `,
  depthTest: false,
  depthWrite: false,
});

export const LIGHT_LAYER = 1;

export class Post {
  private readonly main = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
  private readonly a = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false, type: THREE.HalfFloatType });
  private readonly b = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false, type: THREE.HalfFloatType });
  readonly finish = F;

  constructor() {
    for (const t of [this.a, this.b]) t.texture.minFilter = t.texture.magFilter = THREE.LinearFilter;
  }

  resize(renderer: THREE.WebGLRenderer) {
    const s = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.main.setSize(s.x, s.y);
    this.a.setSize(Math.ceil(s.x / 4), Math.ceil(s.y / 4));
    this.b.setSize(Math.ceil(s.x / 4), Math.ceil(s.y / 4));
    F.px.value.set(1 / s.x, 1 / s.y).multiplyScalar(renderer.getPixelRatio());
  }

  render(renderer: THREE.WebGLRenderer, world: THREE.Scene, camera: THREE.PerspectiveCamera, glowing: boolean) {
    renderer.setRenderTarget(this.main);
    renderer.render(world, camera);
    if (glowing) {
      // The lights alone, small: the glow round lit windows and lamps.
      const bg = world.background;
      world.background = null;
      camera.layers.set(LIGHT_LAYER);
      renderer.setRenderTarget(this.a);
      renderer.setClearColor(0x000000, 1);
      renderer.clear();
      renderer.render(world, camera);
      camera.layers.set(0);
      world.background = bg;
      for (let i = 0; i < 2; i++) {
        this.pass(renderer, this.a, this.b, 1, 0);
        this.pass(renderer, this.b, this.a, 0, 1);
      }
    }
    F.src.value = this.main.texture;
    F.glow.value = this.a.texture;
    quad.material = finish;
    renderer.setRenderTarget(null);
    renderer.render(scene, ortho);
  }

  private pass(renderer: THREE.WebGLRenderer, from: THREE.WebGLRenderTarget, to: THREE.WebGLRenderTarget, x: number, y: number) {
    B.src.value = from.texture;
    B.step.value.set(x / from.width, y / from.height).multiplyScalar(1.5);
    quad.material = blur;
    renderer.setRenderTarget(to);
    renderer.render(scene, ortho);
  }
}
