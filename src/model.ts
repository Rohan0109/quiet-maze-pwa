export const CHEESE = {
  social: { name: 'Social media & short videos', unit: 'min', start: 120, hint: 'Feeds, reels, shorts, endless scroll.' },
  gaming: { name: 'Gaming', unit: 'min', start: 60, hint: 'Console, PC and mobile games.' },
  food: { name: 'Junk food & sugar', unit: 'servings', start: 3, hint: 'Snacks, sweets, soda, takeaway.' },
  adult: { name: 'Adult content', unit: 'times', start: 1, hint: 'Porn and similar content.' },
} as const;

export type CheeseKey = keyof typeof CHEESE;
export type TabKey = 'today' | 'scale' | 'urge' | 'journal' | 'body' | 'trail';
export type MoodKey = 'calm' | 'happy' | 'sad' | 'anxious' | 'angry' | 'tired';

export interface Profile {
  name: string;
  cheeses: CheeseKey[];
  current: Partial<Record<CheeseKey, number>>;
  triggers: string[];
  times: string[];
  reps: string[];
  why: string;
  fear: string;
  start: string;
}

export interface AppData {
  profile: Profile | null;
  logs: Record<string, { usage: Partial<Record<CheeseKey, number>>; tasks: Record<string, boolean>; mood: number; urge: number; moodLabel?: MoodKey; touched?: boolean }>;
  urges: Array<{ ts: number; cheese: CheeseKey; intensity: number; trigger: string | null; outcome: 'rode' | 'gave'; secs: number; rep: string | null }>;
  journal: Array<{ ts: number; prompt: string; text: string }>;
  body: {
    weights: Array<{ date: string; weight: number; waist: number | null }>;
    days: Record<string, Record<string, boolean>>;
    targets: { steps: number; protein: number; calories: number };
  };
  remind: {
    on: boolean;
    enabled: Record<string, boolean>;
    times: Record<string, string>;
    last: Record<string, string>;
  };
  scale: Record<string, unknown>;
}

export const TRIGGERS = ['Boredom', 'Stress', 'Loneliness', 'Tiredness', 'Procrastinating', 'Late at night', 'Notifications', 'Autopilot habit'];
export const TIMES = ['Morning', 'Midday', 'Afternoon', 'Evening', 'Late night'];
export const ALTERNATIVES = ['Walk', 'Read', 'Exercise', 'Journal', 'Call a friend', 'Cook or tidy', 'Breathe', 'Make something'];
export const PROMPTS = [
  'What was I really hungry for today?',
  'What am I afraid will happen if I cut back?',
  'What did I do in the gap where I would normally have scrolled?',
  'If I weren’t afraid, what would I do tomorrow?',
  'What did boredom feel like in my body today?',
  'What felt better than expected without the extra stimulation?',
  'Who do I want to be at the end of this trail?',
];
export const STEPS = [
  'Spend 10 minutes in silence with no input.',
  'Take a short walk with your phone in your pocket.',
  'Write tomorrow’s three priorities on paper.',
  'Sit with boredom for five minutes. Notice where you feel it.',
  'Wait five minutes before opening an app you reach for.',
];
export const MOODS: Array<{ key: MoodKey; label: string; color: string; face: string }> = [
  { key: 'calm', label: 'Calm', color: '#b9d8c6', face: '◡' },
  { key: 'happy', label: 'Good', color: '#f1ca69', face: '⌣' },
  { key: 'sad', label: 'Low', color: '#9db9d4', face: '⌢' },
  { key: 'anxious', label: 'Anxious', color: '#d8b6a2', face: '〰' },
  { key: 'angry', label: 'Frustrated', color: '#d88d7d', face: '﹀' },
  { key: 'tired', label: 'Tired', color: '#c0bad9', face: '—' },
];

export function freshData(): AppData {
  return {
    profile: null,
    logs: {},
    urges: [],
    journal: [],
    body: { weights: [], days: {}, targets: { steps: 8000, protein: 160, calories: 2100 } },
    remind: { on: false, enabled: { morning: true, evening: true, night: false }, times: { morning: '08:00', evening: '20:00', night: '22:00' }, last: {} },
    scale: { committed: false, start: null, editAfter: null, lastJudged: null, mode: 'self', items: [], custom: [], cats: { chores: true, awkward: true, money: true, effort: true }, pending: [], history: {}, manual: {}, paid: [] },
  };
}

export function normalizeData(value: unknown): AppData {
  const defaults = freshData();
  if (!value || typeof value !== 'object') return defaults;
  const input = value as Partial<AppData>;
  const body = input.body ?? defaults.body;
  const remind = input.remind ?? defaults.remind;
  const remindEnabled = remind.enabled ?? defaults.remind.enabled;
  const remindTimes = remind.times ?? defaults.remind.times;
  const scale = input.scale ?? defaults.scale;
  const oldScale = scale as Record<string, unknown>;
  return {
    ...defaults,
    ...input,
    profile: input.profile ?? null,
    logs: input.logs && typeof input.logs === 'object' ? input.logs : {},
    urges: Array.isArray(input.urges) ? input.urges : [],
    journal: Array.isArray(input.journal) ? input.journal : [],
    body: {
      ...defaults.body,
      ...body,
      weights: Array.isArray(body.weights) ? body.weights : [],
      days: body.days ?? {},
      targets: { ...defaults.body.targets, ...(body.targets ?? {}) },
    },
    remind: {
      ...defaults.remind,
      ...remind,
      enabled: { ...defaults.remind.enabled, ...remindEnabled },
      times: { ...defaults.remind.times, ...remindTimes },
      last: remind.last ?? {},
    },
    scale: {
      ...defaults.scale,
      ...oldScale,
      partner: { name: '', phone: '', pub: '', ...((oldScale.partner as object | undefined) ?? {}) },
      items: Array.isArray(oldScale.items) ? oldScale.items : [],
      pending: Array.isArray(oldScale.pending) ? oldScale.pending : [],
      history: oldScale.history ?? {},
      manual: oldScale.manual ?? {},
      paid: Array.isArray(oldScale.paid) ? oldScale.paid : [],
    },
  };
}

export const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export function dateAt(start: string, day: number) {
  const date = new Date(`${start}T12:00:00`);
  date.setDate(date.getDate() + day - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dayNumber(start: string) {
  const first = new Date(`${start}T12:00:00`).getTime();
  const today = new Date(`${todayKey()}T12:00:00`).getTime();
  return Math.max(1, Math.floor((today - first) / 86400000) + 1);
}