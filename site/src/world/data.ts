// The shapes of what the game's exporter writes (game/ArtSource/bake.js, export-world.js): a place's place.json,
// chars/chars.json and grades.json. Positions are art pixels, y down, as drawn.
import * as THREE from 'three';

export type Pt = [number, number];
/** A run of one frame held for so many loop samples. */
export type Run = [frame: number, count: number];

export interface Clip {
  atlas: number;
  size: Pt;
  frames: Pt[];
  seq: Run[];
  sway?: number;
}

export interface Face {
  /** The face's picture in its model's sheet, from the item's first frame: x, y, w, h. */
  rect: [number, number, number, number];
  /** Corners top left, top right, bottom right, bottom left: x across, up, and rows back (already times DEEP). */
  corners: [number, number, number][];
}

export interface Item extends Clip {
  name: string;
  /** The feet row it stands on. */
  y: number;
  at: Pt;
  light?: boolean;
  day?: boolean;
  /** Where a card hung on a house stands (the house's front), and how high up it hangs. */
  on?: Pt;
  lift?: number;
  model?: { at: Pt; faces: Face[] };
}

export interface Place {
  size: Pt;
  origin: Pt;
  bg: string;
  fps: number;
  loop: number;
  atlases: number;
  below: { chunks: { image: string; at: Pt }[]; decals: [clip: number, x: number, y: number, offset: number][] };
  clips: Clip[];
  items: Item[];
  anchors: Record<string, Pt>;
}

export interface Pose {
  row: number;
  frames: number;
  fps: number;
  /** Art px walked per frame, for the poses that advance by distance. */
  stride: number;
  /** Where the hand is in each frame, from the feet. */
  hand: Pt[];
}

export interface Cast {
  cell: Pt;
  feet: Pt;
  flippedFeetX: number;
  chars: Record<string, { kid: boolean; moods: string[]; poses: Record<string, Pose> }>;
}

export type Phase = 'morning' | 'midday' | 'dusk' | 'night';
export type Grades = Record<Phase, { mul: number[]; add: number[]; shade: number[] }>;

const loader = new THREE.TextureLoader();
const textures = new Map<string, Promise<THREE.Texture>>();

/** A pixel-art texture: point sampled, no mipmaps, rows top down, colours used as stored (the shader grades in sRGB). */
export function texture(url: string): Promise<THREE.Texture> {
  let t = textures.get(url);
  if (!t) {
    t = loader.loadAsync(url).then(tex => {
      tex.magFilter = tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.flipY = false;
      tex.colorSpace = THREE.NoColorSpace;
      return tex;
    });
    textures.set(url, t);
  }
  return t;
}

export async function json<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json() as Promise<T>;
}

/** An image's pixels, for masks the code reads (heights, where feet may go). */
export async function pixels(url: string): Promise<ImageData> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  return g.getImageData(0, 0, img.width, img.height);
}

/** A clip's runs spelled out, one frame per loop sample. */
export const unroll = (seq: Run[]) => seq.flatMap(([f, n]) => Array<number>(n).fill(f));
