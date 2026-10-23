// The page's world: the Market Square, alive, with Satria for the visitor to walk and villagers to talk to; and the
// Banyan Grove at night, where Marlow's shop opens at midnight, its door lit and its seven lanterns lighting one by one;
// and at the end everyone in Bellwood gathered in the square at midnight.
import * as THREE from 'three';
import { Ant } from './world/ant';
import { build, type Built } from './world/bake';
import { json, pixels, type Cast, type Grades } from './world/data';
import { apply, gradeColor, looks } from './world/grade';
import { MAX_FEET, MAX_LAMPS, shared } from './world/pixel';
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
/** Where the grove's camera looks: the banyan's door with its arc of lanterns over it (art px). */
const SHOP = { x: 300, y: 212 };
/** Where Marlow stands in his door, and where Satria waits before it. */
const MARLOW = { x: 300, y: 258 }, VISITOR = { x: 300, y: 276 };
/**
 * Everyone the visitor meets by the fifth night, gathered before the square's fountain as for a photo, back row to
 * front (art px rows): the grown-ups behind, the children in front with Satria and Marlow among them. Satria's late
 * parents, Marlow's own name and the flashbacks' young faces stay out; they are the ending's.
 */
const GATHERED = [
  { row: 672, ids: ['bram', 'arlo', 'neighbour_a', 'shopper', 'florist', 'farmhand', 'herder', 'fisher', 'salter', 'porter', 'neighbour_b', 'valdo'] },
  { row: 696, ids: ['breadboy', 'mia', 'helen', 'mender', 'nora', 'theo', 'leo', 'sam', 'baker', 'gardener'] },
  { row: 720, ids: ['gigi', 'kiko', 'pip', 'courier', 'marlow', 'kid', 'lulu', 'grandkid'] },
];
/** Where the gathering stands round (art px), how far apart, and who cheers and who waves. */
const GATHER = { x: 640, y: 700, gap: 22 };
/** How wide the gathering stands (art px), its longest row and a margin. */
const CROWD = 290;
const CHEER = new Set(['breadboy', 'gigi', 'kiko', 'pip', 'kid', 'lulu', 'grandkid']), WAVE = new Set(['courier', 'marlow']);
/** How near (art px) Satria must stand to talk to someone. */
export const REACH = 30;
/** How far over the feet a head is, in art px, for the bubble over it. */
export const HEAD = 36;

export class Hero {
  readonly view: View;
  private readonly post = new Post();
  private readonly sun: Sun;
  private square!: Built;
  private grove!: Built;
  /** Which place the world shows. */
  where: 'square' | 'grove' = 'square';
  /** Marlow in his door, and Satria waiting before it, in the grove. */
  private marlow!: Ant;
  private visitor!: Ant;
  private walk!: WalkMap;
  private grades!: ReturnType<typeof looks>;
  player!: Player;
  villagers: Villager[] = [];
  /** Everyone gathered in the square, shown in its place of the wandering villagers while `gathered`. */
  private crowd: Ant[] = [];
  gathered = false;
  /** The time of day, 0 morning .. 3 night, easing toward day. */
  time = 0;
  day = 0;
  /** Whom the camera follows: Satria unless a section says otherwise. */
  subject: Ant | null = null;
  private cam = { x: 640, y: 640 };
  private vel = { x: 0, y: 0 };
  private lead = { x: 0, y: 0 };
  private last = { x: 0, y: 0 };
  private followed: Ant | null = null;
  private snapping = false;
  private bg = new THREE.Color();
  running = true;

  private get place() {
    return this.where === 'grove' ? this.grove : this.square;
  }

  constructor(canvas: HTMLCanvasElement, small: boolean) {
    this.view = new View(canvas);
    this.sun = new Sun(small ? 2048 : 4096);
  }

  async load() {
    const [place, grove, grades, cast, mask] = await Promise.all([
      build(ART, 'square'),
      build(ART, 'grove'),
      json<Grades>(`${ART}/grades.json`),
      json<Cast>(`${ART}/chars/chars.json`),
      pixels(`${ART}/places/square/walk.png`),
    ]);
    [this.square, this.grove] = [place, grove];
    this.grades = looks(grades);
    this.walk = WalkMap.fromImage(mask);
    for (const p of [place, grove]) {
      this.view.scene.add(p.group);
      this.sun.add(p.casters, [p.lights]);
    }
    // The epilogue's empty roots never show here, nor the grove's daytime beetle.
    for (const name of ['shop_gone', 'crawler_0']) grove.items.get(name)!.visible = false;
    [this.marlow, this.visitor] = await Promise.all([Ant.make('marlow', cast, ART, grove.relief), Ant.make('courier', cast, ART, grove.relief)]);
    for (const a of [this.marlow, this.visitor]) {
      grove.group.add(a.mesh);
      this.sun.add([[a.mesh, a.caster]]);
    }
    this.marlow.place(MARLOW.x, MARLOW.y);
    this.marlow.turn('front');
    this.visitor.place(VISITOR.x, VISITOR.y);
    this.visitor.turn('back');
    this.stage(0, false);
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
    void this.gather(cast, place);
    this.last = { ...courier!.feet };
    this.resize();
  }

  // The gathering loads after the rest, being shown only at the page's end.
  private async gather(cast: Cast, square: Built) {
    const rows = await Promise.all(GATHERED.map(r => Promise.all(r.ids.map(id => Ant.make(id, cast, ART, square.relief)))));
    rows.forEach((ants, r) => {
      const { row, ids } = GATHERED[r]!;
      ants.forEach((a, i) => {
        a.place(GATHER.x + (i - (ids.length - 1) / 2) * GATHER.gap, row);
        a.faceTo(GATHER.x);
        const id = ids[i]!;
        if (CHEER.has(id)) a.setPose('cheer');
        else if (WAVE.has(id)) a.setPose('wave');
        else a.turn('front');
        // Each a little way into its pose, so they do not all move as one.
        a.update(((i * 7 + r * 3) % 10) / 10);
        a.mesh.visible = false;
        square.group.add(a.mesh);
        this.sun.add([[a.mesh, a.caster]]);
      });
    });
    this.crowd = rows.flat();
  }

  resize() {
    this.fit();
    this.view.resize();
    this.post.resize(this.view.renderer);
  }

  // Each art pixel some CSS px across, by the window's height; the gathering is wider than a phone's window at that, so
  // there the camera stands back, by whole pixels, to take everyone in.
  private fit() {
    const base = Math.min(Math.max(this.view.canvas.clientHeight / 330, 2), 4);
    this.view.zoom = this.gathered ? Math.min(base, Math.max(1, Math.floor(this.view.canvas.clientWidth / CROWD))) : base;
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

  /**
   * The shop at midnight: `lit` of its seven lanterns burning, and whether its door is open, the closed sign gone, the
   * door lit and Marlow in it (waving his visitor in once the lanterns are all lit).
   */
  stage(lit: number, open: boolean) {
    const items = this.grove.items, show = (name: string, on: boolean) => (items.get(name)!.visible = on);
    for (let i = 0; i < 7; i++) {
      show(`shop_lantern_${i}`, i < lit);
      show(`shop_lantern_${i}_day`, i >= lit);
    }
    show('shop_closed', !open);
    show('shop_lit', open);
    this.marlow.mesh.visible = open;
    const wave = lit >= 7;
    if (wave !== (this.marlow.currentPose === 'wave')) {
      this.marlow.setPose(wave ? 'wave' : 'idle');
      if (!wave) this.marlow.turn('front');
    }
  }

  /** Cuts straight to the subject on the next frame, as a film cuts (a new window, a new subject). */
  snap() {
    this.snapping = true;
  }

  // The camera eases after its subject, a little ahead of where they walk.
  private follow(dt: number) {
    const who = this.subject ?? this.player.ant;
    // In the grove the camera holds on the shop, low enough in a short window to keep Satria in it.
    const below = VISITOR.y + 30 - this.view.canvas.clientHeight / this.view.zoom / 2;
    const f = this.where === 'grove' ? { x: SHOP.x, y: Math.max(SHOP.y, below) + 16 } : this.gathered ? GATHER : who.feet;
    if (who !== this.followed) (this.followed = who), (this.last = { ...f });
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
    if (this.snapping) {
      this.snapping = false;
      this.cam = { x: tx, y: ty };
      this.vel = { x: 0, y: 0 };
      return;
    }
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
    this.square.group.visible = this.where === 'square';
    this.grove.group.visible = this.where === 'grove';
    this.place.update(t);
    this.player.update(dt);
    for (const v of this.villagers) v.update(dt);
    this.marlow.update(dt);
    this.visitor.update(dt);
    const crowd = this.gathered && this.crowd.length > 0;
    for (const a of this.crowd) {
      a.mesh.visible = crowd;
      if (crowd) a.update(dt);
    }
    this.player.ant.mesh.visible = !crowd;
    for (const v of this.villagers) v.ant.mesh.visible = !crowd;
    this.feet();
    this.fit();
    this.follow(dt);
    this.time += (this.day - this.time) * Math.min(1, dt * 3);
    const dir = apply(this.grades, this.time);
    const dark = this.time > 1.6;
    this.place.lights.visible = dark;
    // The grove's day pieces are its shop's shut sign and unlit lanterns, which the shop's stage shows.
    this.place.day.visible = this.where === 'grove' || this.time < 2;
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
    const all =
      this.where === 'grove' ? [this.marlow, this.visitor].filter(a => a.mesh.visible)
      : this.gathered && this.crowd.length ? this.crowd.slice(0, MAX_FEET)
      : [this.player.ant, ...this.villagers.map(v => v.ant)];
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
