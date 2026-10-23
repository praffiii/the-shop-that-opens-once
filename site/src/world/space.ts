// The game's 3D space for a place, as Core/Art.cs and Core/Place.cs set it up, in three.js's right-handed axes:
// 1 unit is 1 art pixel, x right, y up, z toward the camera. Art is drawn as seen from the camera, so a point h px up
// lies h px further back: art point (x, row) on a surface h high is (x, h, row + h). The place is then stretched so
// art pixels show square through a camera looking down PITCH degrees.
import * as THREE from 'three';

export const PITCH = 35;
const rad = (PITCH * Math.PI) / 180;
const COS2 = Math.cos(rad) ** 2;
const SIN2 = 1 - COS2;

/** How the place is stretched: heights by 1 / cos of the tilt, depths by 1 / sin. */
export const STRETCH = new THREE.Vector3(1, 1 / Math.cos(rad), 1 / Math.sin(rad));
/** Where the camera looks from, per unit of distance, before the stretch: up and back along the tilt. */
export const BACK = new THREE.Vector3(0, Math.sin(rad), Math.cos(rad));

/**
 * How high a point up px up something standing is lifted from its feet. Standing things face the camera: they lean
 * back as far as it looks down, so each px up goes cos² px up (and, through world(), sin² px back).
 */
export const Lean = (up: number) => up * COS2;
export { SIN2 };

/** Art point (x, row) on a surface h px high, in the place's space. */
export const world = (x: number, row: number, h: number): [number, number, number] => [x, h, row + h];

/**
 * A mesh being built for the pixel shader (pixel.ts). Each vertex carries its place point, the art point it shows
 * relative to its piece (texel), the piece's current frame and size in the atlas, its sway (amplitude in texels,
 * phase, and a fixed shade) and, for a house's face, its outward normal in the stretched world (zero for cards).
 */
export class Mesh {
  readonly pos: number[] = [];
  readonly texel: number[] = [];
  readonly frame: number[] = [];
  readonly size: number[] = [];
  readonly sway: number[] = [];
  readonly normal: number[] = [];
  readonly index: number[] = [];

  get count() {
    return this.pos.length / 3;
  }

  /** A quad from four corners, top left first, with the texels they show. */
  quad(
    a: number[], b: number[], c: number[], d: number[],
    ta: number[], tb: number[], tc: number[], td: number[],
    o: { frame?: number[]; size?: number[]; sway?: number[]; normal?: number[] } = {},
  ) {
    const v = this.count;
    const frame = o.frame ?? [0, 0], size = o.size ?? [0, 0], sway = o.sway ?? [0, 0, 0], normal = o.normal ?? [0, 0, 0];
    for (const [p, t] of [[a, ta], [b, tb], [c, tc], [d, td]] as const) {
      this.pos.push(p[0]!, p[1]!, p[2]!);
      this.texel.push(t[0]!, t[1]!);
      this.frame.push(frame[0]!, frame[1]!);
      this.size.push(size[0]!, size[1]!);
      this.sway.push(sway[0]!, sway[1]!, sway[2]!);
      this.normal.push(normal[0]!, normal[1]!, normal[2]!);
    }
    this.index.push(v, v + 1, v + 2, v, v + 2, v + 3);
  }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('texel', new THREE.Float32BufferAttribute(this.texel, 2));
    g.setAttribute('frame', new THREE.Float32BufferAttribute(this.frame, 2));
    g.setAttribute('size', new THREE.Float32BufferAttribute(this.size, 2));
    g.setAttribute('sway', new THREE.Float32BufferAttribute(this.sway, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normal, 3));
    g.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(this.index, 1) : new THREE.Uint16BufferAttribute(this.index, 1));
    g.computeBoundingSphere();
    return g;
  }
}
