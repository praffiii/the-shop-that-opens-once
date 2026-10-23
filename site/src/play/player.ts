// Satria, played: WASD or the arrow keys walk, a tap of Shift switches between running and walking (the game's own
// controls), and a tap or click on the ground walks him there along a path. Feet stay on the walk map, sliding
// along walls.
import type { Ant } from '../world/ant';
import { RUN_SPEED, SPEED } from '../world/ant';
import type { V, WalkMap } from './walkmap';

const KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};

export class Player {
  private readonly held = new Set<string>();
  /** Taken by the visitor: their first key or tap hands Satria over. */
  active = false;
  /** Keys and taps are ignored while someone talks. */
  paused = false;
  /** The hero is scrolled away: the keys go back to the page. */
  away = false;
  onTake: (() => void) | null = null;
  onRun: ((running: boolean) => void) | null = null;

  constructor(readonly ant: Ant, private readonly walk: WalkMap) {
    window.addEventListener('keydown', e => {
      if (this.paused || this.away || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code in KEYS) {
        e.preventDefault();
        this.held.add(e.code);
        this.take();
        this.ant.stop();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (e.repeat) return;
        this.ant.running = !this.ant.running;
        this.onRun?.(this.ant.running);
      }
    });
    window.addEventListener('keyup', e => this.held.delete(e.code));
    window.addEventListener('blur', () => this.held.clear());
  }

  private take() {
    if (this.active) return;
    this.active = true;
    this.onTake?.();
  }

  /** Walks to an art point the visitor tapped; resolves true on arrival. */
  goTo(p: V) {
    if (this.paused || this.away) return Promise.resolve(false);
    this.take();
    return this.ant.walk(this.walk.path(this.ant.feet, p));
  }

  update(dt: number) {
    let x = 0, y = 0;
    if (!this.paused && !this.away) for (const k of this.held) (x += KEYS[k]![0]), (y += KEYS[k]![1]);
    if (x || y) {
      const len = Math.hypot(x, y), speed = (this.ant.running ? RUN_SPEED : SPEED) * dt;
      const from = this.ant.feet, to = this.walk.slide(from, { x: (x / len) * speed, y: (y / len) * speed });
      if (to !== from) this.ant.moveBy(to.x - from.x, to.y - from.y);
      else this.ant.moveBy(x * 0.001, y * 0.001);
    } else if (!this.ant.walking && ['walk', 'run', 'carryWalk'].includes(this.ant.currentPose)) this.ant.setPose('idle');
    this.ant.update(dt);
  }
}
