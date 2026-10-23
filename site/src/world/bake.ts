// Builds a place exported by the game (places/<place>/day/) in 3D, ported from the game's Core/BakedArt.cs: the
// ground as meshes over the relief, every item and decal as a card standing on its feet line and leaning back to face
// the camera, every house from its model's faces. Everything plays one shared loop, so the whole place stays in step.
// Lights (lit windows, lamps, fireflies) show at dusk and night only and are never graded; day items (butterflies)
// show only in the morning and at midday.
import * as THREE from 'three';
import { json, pixels, texture, unroll, type Clip, type Item, type Place, type Pt } from './data';
import { caster, MAX_LAMPS, pixel, shared } from './pixel';
import { LIGHT_LAYER } from './post';
import { Relief } from './relief';
import { Lean, Mesh, STRETCH, world } from './space';

/** How far toward the camera a light stands from its wall, and each item from the one before it on the same feet line. */
const LIGHT_NUDGE = 0.5, TIE_NUDGE = 0.02;
/** How far a light glows past half its size (art px). */
const LAMP_REACH = 40;

/** A piece whose frame changes through the loop: its vertices in its mesh, and its frames and sequence. */
interface Track {
  geometry: THREE.BufferGeometry;
  first: number;
  count: number;
  frames: Pt[];
  seq: number[];
  offset: number;
  shown: number;
}

export interface Built {
  group: THREE.Group;
  data: Place;
  relief: Relief;
  /** What shows only after dark, and only by day. */
  lights: THREE.Group;
  day: THREE.Group;
  /** The lamps that glow on what is near them (place space, reach), for the shader. */
  lamps: THREE.Vector4[];
  /** Named items, to show or hide. */
  items: Map<string, THREE.Object3D>;
  /** Advances every animated piece to time t (seconds). */
  update(t: number): void;
  /** Each mesh with the material it casts the sun's shadow with. */
  casters: [THREE.Mesh, THREE.ShaderMaterial][];
}

export async function build(root: string, place: string): Promise<Built> {
  const dir = `${root}/places/${place}/day`;
  const data = await json<Place>(`${dir}/place.json`);
  const [height, atlases] = await Promise.all([
    pixels(`${root}/places/${place}/height.png`),
    Promise.all(Array.from({ length: data.atlases }, (_, i) => texture(`${dir}/atlas_${i}.png`))),
  ]);
  const relief = new Relief(height, data.origin);
  const group = new THREE.Group();
  group.scale.copy(STRETCH);
  const lights = new THREE.Group(), day = new THREE.Group();
  group.add(lights, day);
  const tracks: Track[] = [];
  const lamps: THREE.Vector4[] = [];
  const items = new Map<string, THREE.Object3D>();
  const casters: [THREE.Mesh, THREE.ShaderMaterial][] = [];

  const add = (m: Mesh, map: THREE.Texture, into: THREE.Object3D, light = false) => {
    const mesh = new THREE.Mesh(m.geometry(), pixel(map, { light }));
    mesh.frustumCulled = false;
    if (light) {
      mesh.renderOrder = 1;
      mesh.layers.enable(LIGHT_LAYER);
    } else casters.push([mesh, caster(map)]);
    into.add(mesh);
    return mesh;
  };

  // The ground: its pictures over the relief, one mesh each.
  const bottom = Math.max(...data.below.chunks.map(c => c.at[1]));
  await Promise.all(data.below.chunks.map(async c => {
    const tex = await texture(`${dir}/${c.image}`);
    const img = tex.image as { width: number; height: number };
    add(relief.mesh(c.at[0], c.at[1], img.width, img.height, c.at[1] === bottom), tex, group);
  }));

  // A card: the rows above its feet standing and leaning back, the rows below lying on the ground in front.
  const card = (m: Mesh, clip: Clip, at: Pt, feetRow: number, ground: number, offset: number) => {
    const first = m.count;
    const pad = Math.ceil(clip.sway ?? 0);
    const x0 = at[0] - pad, x1 = at[0] + clip.size[0] + pad, top = at[1], bot = top + clip.size[1];
    const feet = Math.min(Math.max(feetRow, top), bot);
    const sway = [clip.sway ?? 0, at[0] * 0.013 + at[1] * 0.004, 0];
    const frame = clip.frames[unroll(clip.seq)[offset % unroll(clip.seq).length]!]!;
    const band = (r0: number, r1: number, up: (r: number) => number) => {
      [r0, r1] = [Math.max(r0, top), Math.min(r1, bot)];
      if (r1 <= r0) return;
      const p = (x: number, r: number) => world(x, r, ground + up(r));
      const t = (x: number, r: number) => [x - at[0], r - at[1]];
      m.quad(p(x0, r0), p(x1, r0), p(x1, r1), p(x0, r1), t(x0, r0), t(x1, r0), t(x1, r1), t(x0, r1), { frame, size: clip.size, sway });
    };
    band(feet, bot, () => 0);
    band(top, feet, r => Lean(feetRow - r));
    return first;
  };

  const track = (geometry: () => THREE.BufferGeometry, first: number, count: number, clip: Clip, offset: number) => {
    const seq = unroll(clip.seq);
    if (new Set(seq).size < 2) return;
    // The geometry exists only once the mesh is built; tracks are resolved then.
    pending.push(() => tracks.push({ geometry: geometry(), first, count, frames: clip.frames, seq, offset, shown: -1 }));
  };
  const pending: (() => void)[] = [];

  // The decals: one clip placed many times, grouped by atlas.
  const decals = new Map<number, Mesh>();
  for (const [ci, x, y, offset] of data.below.decals) {
    const clip = data.clips[ci]!;
    let m = decals.get(clip.atlas);
    if (!m) decals.set(clip.atlas, (m = new Mesh()));
    const feet = y + clip.size[1];
    const first = card(m, clip, [x, y], feet, relief.under(x + clip.size[0] / 2, feet), offset);
    const mesh = m;
    track(() => meshOf.get(mesh)!.geometry, first, m.count - first, clip, offset);
  }
  const meshOf = new Map<Mesh, THREE.Mesh>();
  for (const [a, m] of decals) meshOf.set(m, add(m, atlases[a]!, group));

  // The items: cards and houses, each its own mesh so it can be shown or hidden by name.
  const ties = new Map<number, number>();
  for (const it of data.items) {
    const light = !!it.light, into = light ? lights : it.day ? day : group;
    const atlas = atlases[it.atlas]!;
    if (it.model) {
      const mesh = add(house(it, relief, lamps), atlas, into, light);
      mesh.name = it.name;
      items.set(it.name, mesh);
      continue;
    }
    const n = (ties.get(it.y) ?? -1) + 1;
    ties.set(it.y, n);
    const on = it.on ?? [it.at[0] + it.size[0] / 2, it.y];
    const ground = relief.under(on[0], on[1]) + (it.lift ?? 0) + n * TIE_NUDGE + (light ? LIGHT_NUDGE : 0);
    const m = new Mesh();
    card(m, it, it.at, it.y, ground, 0);
    const mesh = add(m, atlas, into, light);
    mesh.name = it.name;
    items.set(it.name, mesh);
    track(() => mesh.geometry, 0, m.count, it, 0);
    if (light && !it.name.startsWith('firefly')) {
      const mx = it.at[0] + it.size[0] / 2, my = it.at[1] + it.size[1] / 2;
      const [px, py, pz] = world(mx, my, ground + it.y - my);
      lamps.push(new THREE.Vector4(px, py, pz, Math.max(...it.size) / 2 + LAMP_REACH));
    }
  }
  for (const p of pending) p();

  let sample = -1;
  return {
    group, data, relief, lights, day, lamps, items, casters,
    update(t: number) {
      const s = Math.floor(t * data.fps) % data.loop;
      if (s === sample) return;
      sample = s;
      const dirty = new Set<THREE.BufferGeometry>();
      for (const k of tracks) {
        const f = k.seq[(s + k.offset) % k.seq.length]!;
        if (f === k.shown) continue;
        k.shown = f;
        const attr = k.geometry.getAttribute('frame') as THREE.BufferAttribute;
        const [fx, fy] = k.frames[f]!;
        for (let v = k.first; v < k.first + k.count; v++) attr.setXY(v, fx, fy);
        dirty.add(k.geometry);
      }
      for (const g of dirty) (g.getAttribute('frame') as THREE.BufferAttribute).needsUpdate = true;
    },
  };
}

/**
 * A house built in 3D (game/ArtSource/model.js), standing on the ground at its front line: each face its picture
 * from the atlas on its four corners, with its outward normal so the shader shades it by how far it turns from the
 * sun. A lit window is a face of a light model glowing over its wall.
 */
function house(it: Item, relief: Relief, lamps: THREE.Vector4[]) {
  const m = new Mesh();
  const model = it.model!;
  const [ax, ay] = model.at;
  const ground = relief.under(ax, ay);
  const frame = it.frames[0]!;
  const v = new THREE.Vector3(), e = new THREE.Vector3(), f = new THREE.Vector3();
  for (const face of model.faces) {
    const p = face.corners.map(([cx, up, back]) => world(ax + cx, ay - back - up, ground + up));
    const [rx, ry, rw, rh] = face.rect;
    // The face's outward normal where the place's stretch lengthens heights and depths.
    v.fromArray(p[0]!).multiply(STRETCH);
    e.fromArray(p[1]!).multiply(STRETCH).sub(v);
    f.fromArray(p[3]!).multiply(STRETCH).sub(v);
    const n = it.light ? [0, 0, 0] : e.clone().cross(f).normalize().negate().toArray();
    m.quad(p[0]!, p[1]!, p[2]!, p[3]!, [rx, ry], [rx + rw, ry], [rx + rw, ry + rh], [rx, ry + rh], { frame, normal: n });
    if (it.light && lamps.length < MAX_LAMPS * 4) {
      const c = p[0]!.map((x, k) => (x + p[2]![k]!) / 2);
      lamps.push(new THREE.Vector4(c[0], c[1], c[2], Math.max(rw, rh) / 2 + LAMP_REACH));
    }
  }
  return m;
}

export { shared };
