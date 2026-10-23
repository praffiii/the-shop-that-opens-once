// The Market Square on a morning, as the game's Core/Places.cs has it: Mia carries crates from home to set out her
// stall, Pip runs letters to the neighbours' doors, Sam sweeps outside the hall, the flower seller waters her pots
// and a shopper goes round the stalls. Their rounds and lines are the game's own. They live like the game's
// Actors/Villager.cs: walk to each stop, keep its pose a while, carry their load between stops where the game does.
import type { Ant } from '../world/ant';
import type { WalkMap } from './walkmap';

export interface Stop {
  at: [number, number];
  pose: string;
  facing: number;
  wait: number;
  carry?: boolean;
}

export interface Person {
  id: string;
  label: string;
  /** Where Satria stands to talk, from their feet. */
  spot: [number, number];
  lines: string[];
  /** Standing still in one pose, or a round of stops. */
  at?: [number, number];
  pose?: string;
  facing?: number;
  round?: Stop[];
  pace?: number;
}

export const SQUARE_MORNING: Person[] = [
  {
    id: 'mia', label: 'Mia', spot: [0, 12],
    round: [
      { at: [950, 628], pose: 'lift', facing: -1, wait: 2.5, carry: true },
      { at: [562, 568], pose: 'lift', facing: -1, wait: 3 },
    ],
    lines: [
      'Cabbages up front, carrots behind. If Pip runs past you, tell him to stop for breakfast.',
      'Heavy crate, light heart. That\'s what my mother said. She never lifted a crate.',
      'You\'re the courier? Pip\'s not stopped talking about you since you came.',
    ],
  },
  {
    id: 'pip', label: 'Pip', spot: [0, 12], pace: 1.2,
    round: [
      { at: [310, 628], pose: 'lift', facing: -1, wait: 2, carry: true },
      { at: [1110, 602], pose: 'crouch', facing: -1, wait: 2 },
      { at: [310, 628], pose: 'lift', facing: 1, wait: 2, carry: true },
      { at: [140, 602], pose: 'crouch', facing: -1, wait: 2 },
    ],
    lines: [
      'Letters! The post office is shut, so I carry them myself. One day I\'ll be a real courier, like you!',
      'This one\'s for the hall. Sam always says thank you very properly. I like that.',
      'Can\'t stop! Mail waits for no one! That\'s what couriers say, right?',
    ],
  },
  {
    id: 'sam', label: 'Sam', spot: [-18, -4], at: [614, 404], pose: 'sweep', facing: 1,
    lines: [
      'Steps first, then the ledgers. Everything in its order, or nothing can ever be found again.',
      'Mind the wet step. I\'ve only swept it once, and once is not finished.',
      'The hall opens at nine. It has opened at nine since 1931. I see no reason to change it.',
    ],
  },
  {
    id: 'florist', label: 'Flower seller', spot: [-16, 6],
    round: [
      { at: [406, 692], pose: 'water', facing: 1, wait: 5 },
      { at: [136, 692], pose: 'water', facing: 1, wait: 5 },
      { at: [520, 748], pose: 'lift', facing: 1, wait: 4 },
    ],
    lines: [
      'Little and often, that\'s the trick with pots. Too much water and they sulk.',
      'Geraniums like the sun, ferns like the shade, and I like a bit of both.',
      'Your mother bought red geraniums every spring. Never once let one die.',
    ],
  },
  {
    id: 'shopper', label: 'Shopper', spot: [-16, 6],
    round: [
      { at: [1110, 628], pose: 'lift', facing: -1, wait: 3, carry: true },
      { at: [760, 750], pose: 'lift', facing: -1, wait: 4, carry: true },
      { at: [594, 750], pose: 'lift', facing: -1, wait: 4, carry: true },
      { at: [500, 576], pose: 'lift', facing: 1, wait: 4, carry: true },
    ],
    lines: [
      'Bread, carrots, and something pretty for the table. A basket\'s not full till it has flowers in it.',
      'The Baker\'s given me two rolls again. I think he fancies my basket.',
      'Market days are better than the city. In the city, nobody asks how your knee is.',
    ],
  },
];

/** Some stops start partway through a round, so the square is busy from the first frame. */
const START: Record<string, number> = { mia: 1, pip: 2, florist: 0, shopper: 1 };

/** One villager living their morning. */
export class Villager {
  private at: number;
  private wait = 0;
  private walking = false;
  talking = false;
  private said = 0;

  constructor(readonly def: Person, readonly ant: Ant, private readonly walk: WalkMap, seed: number) {
    ant.pace = def.pace ?? 0.9 + (seed % 7) * 0.025;
    this.at = START[def.id] ?? 0;
    const first = def.round ? def.round[this.at]! : null;
    const [x, y] = first ? first.at : def.at!;
    ant.place(x, y);
    this.keep();
    this.wait *= 0.3 + (seed % 5) * 0.15;
  }

  /** The next line they say, in turn. */
  line() {
    return this.def.lines[this.said++ % this.def.lines.length]!;
  }

  /** Stops to talk, turned to whoever spoke to them. */
  listen(x: number) {
    this.talking = true;
    this.ant.stop();
    this.ant.faceTo(x);
    this.ant.setPose(this.ant.has('talk') ? 'talk' : 'idle');
  }

  /** Back to what they were doing. */
  done() {
    this.talking = false;
    this.walking = false;
    this.wait = 0.6;
    if (!this.def.round) this.keep();
    else this.ant.setPose(this.ant.carrying ? 'carry' : 'idle');
  }

  update(dt: number) {
    this.ant.update(dt);
    if (this.talking || !this.def.round || this.walking) return;
    if ((this.wait -= dt) > 0) return;
    const stop = this.def.round[this.at]!;
    this.ant.carrying = !!stop.carry;
    this.at = (this.at + 1) % this.def.round.length;
    const to = this.def.round[this.at]!.at;
    const points = this.walk.path(this.ant.feet, { x: to[0], y: to[1] });
    this.walking = true;
    this.ant.walk(points).then(arrived => {
      if (!arrived || this.talking) return;
      this.walking = false;
      this.keep();
    });
  }

  // Takes up the pose of the stop they are at (or their one pose), for a while.
  private keep() {
    const stop = this.def.round?.[this.at];
    this.ant.carrying = false;
    const pose = stop?.pose ?? this.def.pose ?? 'idle';
    this.ant.setPose(this.ant.has(pose) ? pose : 'idle');
    this.ant.faceTo(this.ant.feet.x + (stop?.facing ?? this.def.facing ?? 1) * 8);
    this.wait = (stop?.wait ?? 0) * (0.85 + Math.random() * 0.4);
  }
}
