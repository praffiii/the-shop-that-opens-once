// An ant drawn from its exported sheet (chars/<id>.png), ported from the game's Actors/Ant.cs. It stands on its feet
// as a card leaning back to face the camera, plays a pose, faces left or right (mirrored), and walking mostly up or
// down the screen turns toward the camera or away from it where its sheet has that view (pose_front, pose_back).
// Walking poses advance their frames by the distance walked, every other pose by time.
import * as THREE from 'three';
import type { Cast } from './data';
import { texture } from './data';
import { caster, pixel } from './pixel';
import type { Relief } from './relief';
import { Lean, Mesh, world } from './space';

/** Walking pace in art px per second. */
export const SPEED = 56, RUN_SPEED = 104;
const WALKS = new Set(['walk', 'carryWalk', 'run']);
/** How far toward the camera an ant stands from its feet line. */
const NUDGE = 0.3;
const TALL = 30;

type Heading = 'side' | 'front' | 'back';

/** A card of one cell of a sheet, its feet pixel at the origin: rows above standing and leaning, rows below lying. */
function cellMesh(cast: Cast) {
  const [w, h] = cast.cell, [fx, fy] = cast.feet;
  const m = new Mesh();
  const x0 = -fx, x1 = w - fx;
  const band = (r0: number, r1: number, up: (r: number) => number) =>
    m.quad(world(x0, r0, up(r0)), world(x1, r0, up(r0)), world(x1, r1, up(r1)), world(x0, r1, up(r1)),
      [0, r0 + fy], [w, r0 + fy], [w, r1 + fy], [0, r1 + fy], { size: [w, h] });
  band(0, h - fy, () => 0);
  band(-fy, 0, r => Lean(-r));
  return m.geometry();
}

export class Ant {
  readonly mesh: THREE.Mesh;
  readonly caster: THREE.ShaderMaterial;
  feet = { x: 0, y: 0 };
  facing = 1;
  pace = 1;
  running = false;
  carrying = false;
  private heading: Heading = 'side';
  private pose = 'idle';
  private frame = 0;
  private time = 0;
  private step = 0;
  private path: { x: number; y: number }[] = [];
  /** Settles the walk in progress: true on arrival, false when another walk or a stop takes over. */
  private done: ((arrived: boolean) => void) | null = null;
  /** A foot touched the ground. */
  onStep: (() => void) | null = null;

  private constructor(readonly id: string, private readonly cast: Cast, map: THREE.Texture, private readonly relief: Relief) {
    this.mesh = new THREE.Mesh(cellMesh(cast), pixel(map, { actor: true }));
    this.mesh.frustumCulled = false;
    this.caster = caster(map);
  }

  static async make(id: string, cast: Cast, root: string, relief: Relief) {
    return new Ant(id, cast, await texture(`${root}/chars/${id}.png`), relief);
  }

  get info() {
    return this.cast.chars[this.id]!;
  }

  has(pose: string) {
    return pose in this.info.poses;
  }

  get walking() {
    return this.path.length > 0;
  }

  private get gait() {
    return this.running && this.has('run') ? 'run' : this.carrying ? 'carryWalk' : 'walk';
  }

  setPose(p: string) {
    if (p === this.pose) return;
    this.pose = p;
    this.time = this.step = 0;
    this.frame = 0;
    this.show(0);
  }

  get currentPose() {
    return this.pose;
  }

  faceTo(x: number) {
    this.heading = 'side';
    if (Math.abs(x - this.feet.x) > 1) this.facing = x > this.feet.x ? 1 : -1;
    this.show(this.frame);
  }

  turn(h: Heading) {
    this.heading = h;
    this.show(this.frame);
  }

  /** Puts it at feet (art px). */
  place(x: number, y: number) {
    this.feet = { x, y };
    this.show(this.frame);
  }

  /** Steps by m (keys or a path): faces the way it goes and moves the legs by the distance. */
  moveBy(mx: number, my: number) {
    if (Math.abs(my) > Math.abs(mx)) this.heading = my > 0 ? 'front' : 'back';
    else if (Math.abs(mx) > 0.01) {
      this.heading = 'side';
      this.facing = mx > 0 ? 1 : -1;
    }
    this.feet = { x: this.feet.x + mx, y: this.feet.y + my };
    if (this.pose !== this.gait) this.setPose(this.gait);
    this.step += Math.hypot(mx, my);
    const p = this.current();
    while (this.step >= p.stride) {
      this.step -= p.stride;
      this.frame = (this.frame + 1) % p.frames;
      if (this.frame % Math.max(1, p.frames / 2) === 0) this.onStep?.();
    }
    this.show(this.frame);
  }

  /** Walks through points; resolves true on arrival, false if another walk or stop took over. */
  walk(points: { x: number; y: number }[]) {
    this.settle(false);
    this.path = points.slice();
    if (!this.path.length) return Promise.resolve(true);
    this.setPose(this.gait);
    return new Promise<boolean>(done => (this.done = done));
  }

  stop() {
    this.path = [];
    this.settle(false);
    if (WALKS.has(this.pose)) this.setPose(this.carrying ? 'carry' : 'idle');
  }

  private settle(arrived: boolean) {
    const done = this.done;
    this.done = null;
    done?.(arrived);
  }

  update(dt: number) {
    if (this.path.length) {
      const to = this.path[0]!;
      const dx = to.x - this.feet.x, dy = to.y - this.feet.y, d = Math.hypot(dx, dy);
      const reach = (this.running ? RUN_SPEED : SPEED) * this.pace * dt;
      if (d <= reach) {
        this.moveBy(dx, dy);
        this.path.shift();
        if (!this.path.length) {
          if (WALKS.has(this.pose)) this.setPose(this.carrying ? 'carry' : 'idle');
          this.settle(true);
        }
      } else this.moveBy((dx / d) * reach, (dy / d) * reach);
    } else if (!WALKS.has(this.pose)) {
      this.time += dt;
      const p = this.current();
      const f = Math.floor(this.time * p.fps) % p.frames;
      if (f !== this.frame) this.show(f);
    }
  }

  // The pose's frames as it is turned, if the sheet has that view; else the side view, which faces and flips.
  private turned() {
    if (this.heading === 'side') return null;
    return this.info.poses[`${this.pose}_${this.heading}`] ?? null;
  }

  private current() {
    return this.turned() ?? this.info.poses[this.pose] ?? this.info.poses['idle']!;
  }

  private show(f: number) {
    const p = this.current();
    this.frame = f % p.frames;
    const [w, h] = this.cast.cell;
    const attr = this.mesh.geometry.getAttribute('frame') as THREE.BufferAttribute;
    for (let v = 0; v < attr.count; v++) attr.setXY(v, this.frame * w, p.row * h);
    attr.needsUpdate = true;
    const side = this.turned() ? 1 : this.facing;
    const fx = Math.round(this.feet.x), fy = Math.round(this.feet.y);
    // Mirrored round the feet pixel's left edge; one pixel over keeps the feet on the same column.
    this.mesh.scale.x = side;
    this.mesh.position.set(...world(fx + (side < 0 ? 1 : 0), fy, this.relief.stand(fx, fy, TALL) + NUDGE));
  }
}
