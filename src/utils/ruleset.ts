// Void1080AM ruleset — bare mechanical executor.
// Extracted from the caller-roll / card-draw pattern used consistently
// across WBPR-S05 through WBPR-S09 (the procedural-era sessions).
// No narrative generation: this module only produces structured oracle output.

export const SUITS = ['Clubs', 'Diamonds', 'Spades', 'Hearts'] as const;
export const RANKS = [
  'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
  'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King',
] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];
export type Card = `${Rank} of ${Suit}`;

export type CallerType = 'none' | 'standard' | 'emergency' | 'phenomenon';
export type VeilStatus = 'Normal' | 'Thin' | 'Thick' | 'Opaque';

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank} of ${suit}`);
    }
  }
  return deck;
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function rollD6(rng: () => number = Math.random): number {
  return Math.floor(rng() * 6) + 1;
}

// Block-opening caller roll, attested identically across S05–S09:
// 1-3 no caller, 4 standard, 5 emergency/distressed, 6 phenomenon.
export function determineCaller(roll: number): CallerType {
  if (roll <= 3) return 'none';
  if (roll === 4) return 'standard';
  if (roll === 5) return 'emergency';
  return 'phenomenon';
}

export function veilStatusFor(intensity: number): VeilStatus {
  if (intensity <= 3) return 'Normal';
  if (intensity <= 6) return 'Thin';
  if (intensity <= 8) return 'Thick';
  return 'Opaque';
}

// Block tone pool — every distinct prompt tone observed in the
// procedural-era sessions (suit-independent; suit is drawn for flavour only).
export const TONE_POOL: string[] = [
  'Melancholic', 'Peace', 'Urban', 'Vulnerable',
  'Something difficult to listen to', 'Cinematic, ominous',
  'Something that sounds like power in the dark',
  'Something that reminds you of winter', 'Something that makes you cry',
  'Something with secrets in it', 'Something that makes you feel safe',
  'Something timeless', 'Something that builds tension',
  'Something eerie, uncanny', 'Something majestic, vast',
  'Something from a journey', 'Something dark',
  'Something that sounds like the void', 'Something from your childhood',
  'Something youthful, energetic',
  'Something to end on — your closing statement',
  'Something that brings you peace', 'Something complex, layered',
  'Something that reminds you of home', 'Something romantic but unsettling',
  'Something hopeful', 'Something haunting', 'Something epic, overwhelming',
  'Something from before you were born', 'Something bittersweet',
  'Something that makes you want to move', 'Something witchy, occult',
  'Something simple, pure', 'Something tied to a specific place',
  'Something that sounds like an ending — reality soft at the edges',
  'Something mischievous, trickster energy', 'Something that scares you',
  'Something in another language', 'Something discovered by accident',
];

// Caller-card oracle phrases, banked by caller type and attested
// in the source sessions (standard / emergency / phenomenon).
export const CALLER_PHRASES: Record<Exclude<CallerType, 'none'>, string[]> = {
  standard: [
    'Something discovered by accident',
    'A lopsided friendship resurfacing',
    'A decision made by not deciding',
    'Something bittersweet',
    'Something witchy, occult',
    'A debt unpaid in the early days',
    'An old request finally spoken aloud',
    'Something tied to a specific place',
    'Quiet grief wearing a calm voice',
    'A small kindness remembered late',
  ],
  emergency: [
    'Mundane life grinding them down',
    'Authority figure causing problems',
    'Knowledge they cannot unlearn',
    'An ending arriving without ceremony',
    'A notice that changes everything',
    'Something following them',
    'A choice with no good side',
  ],
  phenomenon: [
    'The Yellow Sign — direct Carcosa contact',
    'Trickster entity, playful horror',
    'Something that sounds like the void',
    'Something that sounds like an ending — reality soft at the edges',
    'Caller foreknowledge — information not given on air',
    'A recurring object that will not stay lost',
    'A place that returns mirrored',
    'Temporal recursion — a loop closing',
  ],
};

export const AMBIENT_EVENTS: string[] = [
  'Frost begins forming on a window pane.',
  'The coffee pot activates without contact.',
  'A Watcher at the treeline shifts position.',
  'An unfamiliar star configuration is visible overhead.',
  'Equipment runs warm without cause.',
  'A low hum is audible beneath the static.',
];

export interface PromptDraw {
  card: Card;
  tone: string;
}

export interface CallerDraw {
  type: CallerType;
  roll: number;
  card?: Card;
  phrase?: string;
}

export interface BlockResult {
  index: number;
  prompts: PromptDraw[];
  caller: CallerDraw;
  ambient: string | null;
  veilIntensityAfter: number;
}

export interface RunState {
  deck: Card[];
  tonePool: string[];
  veilIntensity: number;
  blocks: BlockResult[];
  rng: () => number;
}

export function initRun(startingVeilIntensity: number, rng: () => number = Math.random): RunState {
  return {
    deck: shuffle(buildDeck(), rng),
    tonePool: shuffle(TONE_POOL, rng),
    veilIntensity: startingVeilIntensity,
    blocks: [],
    rng,
  };
}

function draw<T>(pool: T[]): T {
  const card = pool.pop();
  if (card === undefined) throw new Error('Pool exhausted');
  return card;
}

export function runBlock(state: RunState): BlockResult {
  if (state.deck.length < 4) {
    state.deck = shuffle([...state.deck, ...buildDeck()], state.rng);
  }
  if (state.tonePool.length < 3) {
    state.tonePool = shuffle([...state.tonePool, ...TONE_POOL], state.rng);
  }

  const prompts: PromptDraw[] = Array.from({ length: 3 }, () => ({
    card: draw(state.deck),
    tone: draw(state.tonePool),
  }));

  const roll = rollD6(state.rng);
  const type = determineCaller(roll);
  const caller: CallerDraw = { type, roll };
  if (type !== 'none') {
    caller.card = draw(state.deck);
    const phrases = CALLER_PHRASES[type];
    caller.phrase = phrases[Math.floor(state.rng() * phrases.length)];
  }

  const ambientRoll = rollD6(state.rng);
  const ambient = ambientRoll === 6
    ? AMBIENT_EVENTS[Math.floor(state.rng() * AMBIENT_EVENTS.length)]
    : null;

  const drift = Math.floor(state.rng() * 3) - 1; // -1, 0, +1
  state.veilIntensity = Math.min(10, Math.max(1, state.veilIntensity + drift));

  const result: BlockResult = {
    index: state.blocks.length + 1,
    prompts,
    caller,
    ambient,
    veilIntensityAfter: state.veilIntensity,
  };
  state.blocks.push(result);
  return result;
}

export interface SessionStats {
  blocks_completed: number;
  total_callers: number;
  standard_callers: number;
  emergency_callers: number;
  phenomenon_callers: number;
  veil_at_close: VeilStatus;
}

export function computeStats(state: RunState): SessionStats {
  const callers = state.blocks.filter(b => b.caller.type !== 'none');
  return {
    blocks_completed: state.blocks.length,
    total_callers: callers.length,
    standard_callers: callers.filter(b => b.caller.type === 'standard').length,
    emergency_callers: callers.filter(b => b.caller.type === 'emergency').length,
    phenomenon_callers: callers.filter(b => b.caller.type === 'phenomenon').length,
    veil_at_close: veilStatusFor(state.veilIntensity),
  };
}
