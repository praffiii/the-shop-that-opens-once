// The hero: the Market Square in the morning, alive, with Satria for the visitor to walk and villagers to talk to.
import * as THREE from 'three';
import { Ant } from './world/ant';
import { build, type Built } from './world/bake';
import { json, pixels, type Cast, type Grades } from './world/data';
import { apply, gradeColor, looks } from './world/grade';
import { MAX_LAMPS, shared } from './world/pixel';
import { Post } from './world/post';
import { STRETCH } from './world/space';
import { Sun } from './world/sun';
import { View } from './world/view';
import { Player } from './play/player';
import { SQUARE_MORNING, Villager } from './play/villagers';
import { WalkMap, type V } from './play/walkmap';
import type { Talk } from './ui/talk';

export const ART = '/art';
/** How far past the place's edge the camera may look (art px); the forest goes on there. */
const OVERSCAN = 96;
const LEAD = 26, FOLLOW = 0.35;
/** How near (art px) Satria must stand to talk to someone. */
export const REACH = 30;
/** How far over the feet a head is, in art px, for the bubble over it. */
export const HEAD = 36;

export class Hero {
  readonly view: View;
  private readonly post = new Post();
  private readonly sun: Sun;
  private place!: Built;
  private walk!: WalkMap;
  private grades!: ReturnType<typeof looks>;
  player!: Player;
  villagers: Villager[] = [];
  /** The time of day, 0 morning .. 3 night. */
  time = 0;
  private cam = { x: 640, y: 640 };
  private vel = { x: 0, y: 0 };
  private lead = { x: 0, y: 0 };
  private last = { x: 0, y: 0 };
  private bg = new THREE.Color();
  running = true;

  constructor(canvas: HTMLCanvasElement, small: boolean) {
    this.view = new View(canvas);
    this.sun = new Sun(small ? 2048 : 4096);
  }

  async load() {
    const [place, grades, cast, mask] = await Promise.all([
      build(ART, 'square'),
      json<Grades>(`${ART}/grades.json`),
      json<Cast>(`${ART}/chars/chars.json`),
      pixels(`${ART}/places/square/walk.png`),
    ]);
    this.place = place;
    this.grades = looks(grades);
    this.walk = WalkMap.fromImage(mask);
    this.view.scene.add(place.group);
    this.sun.add(place.casters, [place.lights]);
    const ants = await Promise.all(['courier', ...SQUARE_MORNING.map(p => p.id)].map(id => Ant.make(id, cast, ART, place.relief)));
    for (const a of ants) {
      place.group.add(a.mesh);
      this.sun.add([[a.mesh, a.caster]]);
    }
    const [courier, ...rest] = ants;
    courier!.place(640, 712);
    courier!.faceTo(600);
    this.player = new Player(courier!, this.walk);
    this.villagers = rest.map((a, i) => new Villager(SQUARE_MORNING[i]!, a, this.walk, i * 3 + 1));
    this.cam = { ...courier!.feet };
    this.last = { ...courier!.feet };
    this.resize();
  }

  resize() {
    this.view.zoom = Math.min(Math.max(innerHeight / 330, 2), 4);
    this.view.resize();
    this.post.resize(this.view.renderer);
  }

  /** The villager Satria is near enough to talk to, the nearest. */
  near(): Villager | null {
    const f = this.player.ant.feet;
    let best: Villager | null = null, d = REACH;
    for (const v of this.villagers) {
      const e = Math.hypot(v.ant.feet.x - f.x, (v.ant.feet.y - f.y) * 1.4);
      if (e < d) (best = v), (d = e);
    }
    return best;
  }

  /** The villager standing at an art point someone tapped, if any. */
  villagerAt(p: V): Villager | null {
    let best: Villager | null = null, d = 18;
    for (const v of this.villagers) {
      const e = Math.hypot(v.ant.feet.x - p.x, v.ant.feet.y - 12 - p.y);
      if (e < d) (best = v), (d = e);
    }
    return best;
  }

  /** Where someone's head is on the screen (CSS px). */
  head(v: Villager): V {
    const f = this.screen(v.ant.feet);
    return { x: f.x, y: f.y - HEAD * this.view.zoom };
  }

  /** Satria and someone talk: both stop and turn to each other, and their lines play in the box. */
  async talk(v: Villager, box: Talk) {
    if (box.open || v.talking) return;
    const me = this.player;
    me.paused = true;
    me.ant.stop();
    me.ant.faceTo(v.ant.feet.x);
    v.listen(me.ant.feet.x);
    const feet = [me.ant, v.ant].map(a => this.screen(a.feet).y);
    await box.say(v.def.label, v.def.id, v.line(), 'neutral', feet);
    box.close();
    v.done();
    me.paused = false;
  }

  /** Walks over to someone tapped, then talks if they are still within reach. */
  async reach(v: Villager, box: Talk) {
    const [dx, dy] = v.def.spot;
    await this.player.goTo({ x: v.ant.feet.x + dx, y: v.ant.feet.y + dy });
    if (this.near() === v) await this.talk(v, box);
  }

  /** Where on the screen (CSS px) an art point stands, raised by up px. */
  screen(p: V, up = 0): V {
    const h = this.place.relief.under(p.x, p.y) + up;
    const v = new THREE.Vector3(p.x, h, p.y + h).multiply(STRETCH).project(this.view.camera);
    return { x: ((v.x + 1) / 2) * this.view.canvas.clientWidth, y: ((1 - v.y) / 2) * this.view.canvas.clientHeight };
  }

  /** The art point on the ground under a screen point (CSS px). */
  pick(sx: number, sy: number): V {
    const ndc = new THREE.Vector2((sx / this.view.canvas.clientWidth) * 2 - 1, -(sy / this.view.canvas.clientHeight) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.view.camera);
    const h = this.place.relief.under(this.cam.x, this.cam.y) * STRETCH.y;
    const t = (h - ray.ray.origin.y) / ray.ray.direction.y;
    const p = ray.ray.origin.clone().addScaledVector(ray.ray.direction, t);
    const z = p.z / STRETCH.z, y = p.y / STRETCH.y;
    return { x: p.x, y: z - y };
  }

  private follow(dt: number) {
    const f = this.player.ant.feet;
    const step = { x: f.x - this.last.x, y: f.y - this.last.y };
    this.last = { ...f };
    const moving = Math.hypot(step.x, step.y) > 0.01;
    const n = Math.hypot(step.x, step.y) || 1;
    const goal = moving ? { x: (step.x / n) * LEAD, y: (step.y / n) * LEAD } : { x: 0, y: 0 };
    const k = Math.min(1, dt * 2);
    this.lead.x += (goal.x - this.lead.x) * k;
    this.lead.y += (goal.y - this.lead.y) * k;
    const [w, h] = this.place.data.size;
    const vw = this.view.canvas.clientWidth / this.view.zoom, vh = this.view.canvas.clientHeight / this.view.zoom;
    const clamp = (v: number, size: number, view: number) =>
      size <= view ? size / 2 : Math.min(Math.max(v, view / 2 - OVERSCAN), size - view / 2 + OVERSCAN);
    const tx = clamp(f.x + this.lead.x, w, vw), ty = clamp(f.y + this.lead.y - 16, h, vh);
    // A critically damped spring, as Unity's SmoothDamp follows.
    const omega = 2 / FOLLOW, x = omega * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    for (const a of ['x', 'y'] as const) {
      const target = a === 'x' ? tx : ty, change = this.cam[a] - target;
      const temp = (this.vel[a] + omega * change) * dt;
      this.vel[a] = (this.vel[a] - omega * temp) * e;
      this.cam[a] = target + (change + temp) * e;
    }
  }

  frame(dt: number, t: number) {
    if (!this.running) return;
    shared.uTime.value = t;
    this.place.update(t);
    this.player.update(dt);
    for (const v of this.villagers) v.update(dt);
    this.feet();
    this.follow(dt);
    const dir = apply(this.grades, this.time);
    const dark = this.time > 1.6;
    this.place.lights.visible = dark;
    this.place.day.visible = this.time < 2;
    this.lamps();
    this.view.scene.background = gradeColor(this.place.data.bg, this.bg);
    this.view.look(this.cam.x, this.cam.y, this.place.relief.under(this.cam.x, this.cam.y));
    const c = new THREE.Vector3(this.cam.x, 0, this.cam.y).multiply(STRETCH);
    this.sun.render(this.view.renderer, this.view.scene, dir, c, 900);
    this.post.finish.bloom.value = Math.min(Math.max((this.time - 1.6) / 0.8, 0), 1) * 1.3;
    this.post.render(this.view.renderer, this.view.scene, this.view.camera, dark);
  }

  // Each ant casts a small dark spot on what it stands on.
  private feet() {
    const all = [this.player.ant, ...this.villagers.map(v => v.ant)];
    shared.uFeetCount.value = all.length;
    all.forEach((a, i) => {
      const h = this.place.relief.under(a.feet.x, a.feet.y);
      shared.uFeet.value[i]!.set(Math.round(a.feet.x) + 0.5, h, Math.round(a.feet.y) + h - 1, 7);
    });
  }

  // The lamps nearest the camera glow on what is round them; the shader takes only so many.
  private lamps() {
    const { x, y } = this.cam;
    const sorted = this.place.lamps.slice().sort((a, b) => Math.hypot(a.x - x, a.z - y) - Math.hypot(b.x - x, b.z - y));
    const n = Math.min(sorted.length, MAX_LAMPS);
    for (let i = 0; i < n; i++) shared.uLamps.value[i]!.copy(sorted[i]!);
    shared.uLampCount.value = n;
  }
}
