import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, Bell, BookOpen, Check, ChevronDown,
  CircleHelp, Cloud, Flame, Heart, Home, Moon, Plus, Scale as ScaleIcon, Send, Settings2,
  ShieldCheck, Sun, Trash2, Upload, UserRound, Waves, X,
} from 'lucide-react';
import { CHEESE, dayNumber, dateAt, freshData, MOODS, normalizeData, PROMPTS, STEPS, TIMES, todayKey, TRIGGERS, type AppData, type CheeseKey, type MoodKey, type TabKey } from './model';
import { supabase } from './supabase';

const STORAGE_KEY = 'quiet-maze-v1';
const THEME_KEY = 'quiet-maze-theme';
const BASE = import.meta.env.BASE_URL;
const FACTORS = [0.85, 0.7, 0.55, 0.4];
const TABS: Array<{ id: TabKey; label: string; icon: typeof Home }> = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'scale', label: 'Scale', icon: ScaleIcon },
  { id: 'urge', label: 'Urge', icon: Waves },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'body', label: 'Body', icon: Activity },
  { id: 'trail', label: 'Trail', icon: Flame },
];
const MOOD_SCORE: Record<MoodKey, number> = { calm: 4, happy: 5, sad: 2, anxious: 2, angry: 1, tired: 3 };
const TASK_POOL: Record<CheeseKey, string[]> = {
  social: ['Mute every notification that is not from a person.', 'Move social apps off your home screen.', 'Charge your phone outside the bedroom tonight.', 'Delete one app you open on autopilot.'],
  gaming: ['Pick a stop time before you start playing.', 'Play only after your first action step is done.', 'Replace one session with a walk or a stretch.'],
  food: ['Put sugary snacks out of sight.', 'Drink water before your next snack.', 'Eat one meal with no screen.'],
  adult: ['Keep devices out of the bathroom and bedroom today.', 'When an urge hits, stand up and change rooms.', 'Go to bed at a set time tonight.'],
};
const URGE_TIPS = ['Urges rise, peak and fall. You only have to outlast the peak.', 'Breathe in for 4, out for 6. Repeat ten times.', 'Name it: “I’m bored, not hungry.” Naming takes the edge off.', 'Give your hands a job. Stretch, wash dishes, tidy.'];
const fmt = (value: number) => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;

type Onboarding = { step: number; name: string; cheeses: CheeseKey[]; amounts: Partial<Record<CheeseKey, number>>; triggers: string[]; times: string[]; reps: string[]; why: string; fear: string };
type ScaleItem = { id: string; name: string; tier: 'must' | 'should' | 'nice'; type?: string };
type ScaleState = { committed?: boolean; start?: string | null; editAfter?: string | null; items: ScaleItem[]; manual: Record<string, Record<string, boolean>>; mode?: string; money?: string; partner?: { name?: string; phone?: string; pub?: string }; pending?: Array<Record<string, unknown>>; paid?: unknown[]; history?: Record<string, unknown>; [key: string]: unknown };

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeData(JSON.parse(stored)) : freshData();
  } catch {
    return freshData();
  }
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

function SectionTitle({ eyebrow, title, detail }: { eyebrow?: string; title: string; detail?: string }) {
  return <header className="section-title">{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{detail && <p>{detail}</p>}</header>;
}

function BodyResources() {
  return <>
    <details className="panel resource-panel"><summary>12-week roadmap</summary><p><b>Weeks 1–2 · baseline.</b> Find a realistic meal rhythm, walk most days, and start with two manageable strength sessions.</p><p><b>Weeks 3–6 · momentum.</b> Keep protein steady and add training only when recovery and schedule allow.</p><p><b>Weeks 7–10 · review.</b> Look at a multi-week trend before adjusting anything; one weigh-in is noisy.</p><p><b>Weeks 11–12 · consolidate.</b> Keep what is sustainable and skip crash changes to force a deadline.</p></details>
    <details className="panel resource-panel"><summary>Workouts A and B</summary><p><b>Workout A:</b> squat or leg press, bench press, lat pulldown, Romanian deadlift, plank.</p><p><b>Workout B:</b> split squat or leg press, seated row, incline press, leg curl, shoulder press.</p><p className="microcopy">Use controlled form, choose loads you can manage, and ask a qualified trainer for individual guidance.</p></details>
    <details className="panel resource-panel"><summary>Simple meal template</summary><p><b>Breakfast:</b> oats, high-protein yogurt, eggs, fruit.</p><p><b>Lunch:</b> chicken or beans, rice, vegetables, measured cooking oil.</p><p><b>Snack:</b> yogurt or protein, fruit, a small portion of nuts.</p><p><b>Dinner:</b> fish or tofu, roti or potatoes, dal or vegetables.</p><p className="microcopy">Portions and calorie estimates vary. This is a planning example, not medical advice.</p></details>
  </>;
}

function CheeseArt({ size = 32, className = '' }: { size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path d="M5 30 37 11c4-2 7 0 7 5v14H5Z" fill="#edc565" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M5 30h39v8c0 2-1 3-3 3H8c-2 0-3-1-3-3Z" fill="#d7a642" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="32" cy="20" r="3" fill="#f5dfa2" /><circle cx="21" cy="26" r="2" fill="#f5dfa2" /><circle cx="35" cy="35" r="2.3" fill="#f5dfa2" />
  </svg>;
}

function MouseArt({ size = 34, className = '' }: { size?: number; className?: string }) {
  return <svg className={className} width={size} height={size * .76} viewBox="0 0 40 30" aria-hidden="true">
    <path d="M10 21C2 20 2 27 8 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <ellipse cx="19" cy="20" rx="12" ry="8" fill="#b9c5ba" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="26" cy="10" r="5" fill="#e6a18b" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="29" cy="17" r="1.2" fill="#203a32" /><circle cx="34" cy="20" r="1.5" fill="#cf725e" />
  </svg>;
}

function WelcomeMaze() {
  return <div className="welcome-art" role="img" aria-label="A mouse finding a new route through the maze toward cheese">
    <svg viewBox="0 0 520 150" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path className="maze-route" d="M28 108h75V48h82v60h80V48h86v60h70" />
      <path className="maze-wall" d="M20 25h100v38m0 32v28m40-98h72v42m0 32v24m49-98h99v39m0 32v27m37-98h91v40m0 32v26" />
      <circle cx="28" cy="108" r="5" className="maze-start" />
      <svg x="91" y="61" width="42" height="32" viewBox="0 0 40 30"><MouseArt size={42} /></svg>
      <svg x="428" y="74" width="42" height="42" viewBox="0 0 48 48"><CheeseArt size={42} /></svg>
    </svg>
    <span className="maze-caption">THE CHEESE MOVES. SO CAN YOUR ROUTE.</span>
  </div>;
}

function dateKeyFromTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function profileLimit(profile: NonNullable<AppData['profile']>, cheese: CheeseKey, week: number) {
  const value = (profile.current[cheese] ?? CHEESE[cheese].start) * FACTORS[Math.min(week, 3)];
  return CHEESE[cheese].unit === 'min' ? Math.round(value / 5) * 5 : Math.round(value);
}

function WallNote({ data, profile, date, day }: { data: AppData; profile: NonNullable<AppData['profile']>; date: string; day: number }) {
  const log = data.logs[date];
  const lines: string[] = [];
  const scale = data.scale as {
    items?: Array<{ id: string; name: string }>;
    manual?: Record<string, Record<string, boolean>>;
    history?: Record<string, { ok?: boolean; earned?: number; possible?: number; failed?: string[] }>;
  };

  if (log?.mood) {
    const mood = MOODS.find(item => item.key === log.moodLabel)?.label ?? ['', 'heavy', 'low', 'mixed', 'settled', 'bright'][log.mood] ?? 'unmarked';
    lines.push(`The air felt ${mood}.`);
  }

  if (log?.touched) {
    const completed = Object.entries(log.tasks).filter(([, done]) => done).map(([id]) => {
      if (id === 'general') return STEPS[(day - 1) % STEPS.length];
      if ((Object.keys(CHEESE) as CheeseKey[]).includes(id as CheeseKey)) {
        const cheese = id as CheeseKey;
        return TASK_POOL[cheese][(day - 1) % TASK_POOL[cheese].length];
      }
      return '';
    }).filter(Boolean);
    if (completed.length) lines.push(`You scurried: ${completed[0]}${completed.length > 1 ? ` And made ${completed.length - 1} other small ${completed.length === 2 ? 'choice' : 'choices'}.` : ''}`);

    const exceeded = profile.cheeses.filter(cheese => (log.usage[cheese] ?? 0) > profileLimit(profile, cheese, Math.min(3, Math.floor((day - 1) / 7))));
    lines.push(exceeded.length
      ? `The old pull ran past your ${exceeded.map(cheese => CHEESE[cheese].name.split(' & ')[0].toLowerCase()).join(' and ')} limit. You noticed and wrote it down.`
      : 'You noticed the old pull and stayed within the limits you chose.');
  }

  const urges = data.urges.filter(urge => dateKeyFromTimestamp(urge.ts) === date);
  urges.forEach(urge => {
    const habit = CHEESE[urge.cheese]?.name.split(' & ')[0].toLowerCase() ?? 'old cheese';
    lines.push(urge.outcome === 'rode'
      ? `An urge for ${habit} arrived${urge.trigger ? ` with ${urge.trigger.toLowerCase()}` : ''}. You rode it out${urge.rep ? ` by choosing ${urge.rep.toLowerCase()}` : ''}.`
      : `An urge for ${habit} arrived${urge.trigger ? ` with ${urge.trigger.toLowerCase()}` : ''}. You gave in, noticed what happened, and kept your story going.`);
  });

  const body = data.body.days[date] ?? {};
  const bodyMoments = [
    body.steps && 'got your steps in',
    body.train && 'moved your body',
    body.sleep && 'made space for sleep',
    body.protein && 'nourished yourself',
  ].filter((moment): moment is string => Boolean(moment));
  if (bodyMoments.length) lines.push(`You cared for your body: ${bodyMoments.join(', ')}.`);
  const weighIn = data.body.weights.find(item => item.date === date);
  if (weighIn) lines.push(`You recorded a body check-in${weighIn.waist == null ? '' : `, including a ${weighIn.waist.toFixed(1)} cm waist measurement`}.`);

  const verdict = scale.history?.[date];
  if (verdict) lines.push(verdict.ok
    ? `You kept your Scale promise: ${verdict.earned ?? 0} of ${verdict.possible ?? 0} points.`
    : `The Scale showed a missed promise${verdict.failed?.length ? `: ${verdict.failed.join(', ')}` : ''}. You can learn from that turn without calling the whole journey a failure.`);
  const scaleNames = (scale.items ?? []).filter(item => scale.manual?.[date]?.[item.id]).map(item => item.name);
  if (scaleNames.length && !verdict) lines.push(`You kept a promise to yourself: ${scaleNames.join(' and ')}.`);

  const entries = data.journal.filter(entry => dateKeyFromTimestamp(entry.ts) === date);
  if (!lines.length && !entries.length) return null;
  return <article className="wall-note">
    <div className="wall-note-date"><span>DAY {day}</span><time dateTime={date}>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</time></div>
    <div className="wall-note-copy">{lines.map((line, index) => <p key={`${date}-${index}`}>{line}</p>)}{entries.map(entry => <blockquote key={entry.ts}>{entry.text}<cite>YOUR NOTE · {entry.prompt}</cite></blockquote>)}</div>
    <CheeseArt size={20} className="wall-cheese" />
  </article>;
}

function Storybook({ data, profile, day }: { data: AppData; profile: NonNullable<AppData['profile']>; day: number }) {
  const chapters = [
    { start: 1, end: 7, title: 'The first noticing', cue: 'The old route becomes visible.' },
    { start: 8, end: 14, title: 'A turn in the maze', cue: 'A small pause makes another path possible.' },
    { start: 15, end: 21, title: 'Finding a new route', cue: 'Change grows through ordinary choices.' },
    { start: 22, end: 30, title: 'Carrying the cheese forward', cue: 'Keep what matters; leave what no longer does.' },
  ];
  const scale = data.scale as { manual?: Record<string, Record<string, boolean>>; history?: Record<string, unknown> };
  return <section className="storybook" aria-label="Your story so far">
    <div className="book-opening"><span className="eyebrow">YOUR STORY SO FAR</span><h2>Every turn changed the map.</h2><p>Not a scorecard. A record of what you noticed, what you tried, and how you kept going.</p><div className="book-rule"><span>THE QUIET MAZE</span><span>{Math.min(day, 30)} PAGES TURNED</span></div></div>
    {chapters.map((chapter, index) => {
      const chapterDay = Math.min(day, 30);
      const status = day > chapter.end ? 'complete' : chapterDay >= chapter.start ? 'current' : 'ahead';
      const logs = Object.entries(data.logs).filter(([date, log]) => date >= dateAt(profile.start, chapter.start) && date <= dateAt(profile.start, chapter.end) && log.touched);
      const firstDate = dateAt(profile.start, chapter.start);
      const lastDate = dateAt(profile.start, chapter.end);
      const possibleDates = new Set([
        ...Object.keys(data.logs),
        ...Object.keys(data.body.days),
        ...data.body.weights.map(item => item.date),
        ...Object.keys(scale.manual ?? {}),
        ...Object.keys(scale.history ?? {}),
        ...data.urges.map(item => dateKeyFromTimestamp(item.ts)),
        ...data.journal.map(item => dateKeyFromTimestamp(item.ts)),
      ]);
      const wallDates = [...possibleDates].filter(date => {
        if (date < firstDate || date > lastDate || date > todayKey()) return false;
        return Boolean(data.logs[date]?.touched
          || Object.values(data.body.days[date] ?? {}).some(Boolean)
          || data.body.weights.some(item => item.date === date)
          || (scale.manual?.[date] && Object.values(scale.manual[date]).some(Boolean))
          || scale.history?.[date]
          || data.urges.some(item => dateKeyFromTimestamp(item.ts) === date)
          || data.journal.some(item => dateKeyFromTimestamp(item.ts) === date));
      }).sort();
      const urges = data.urges.filter(urge => {
        const key = dateKeyFromTimestamp(urge.ts);
        return key >= firstDate && key <= lastDate;
      });
      const choices = logs.reduce((total, [, log]) => total + Object.values(log.tasks).filter(Boolean).length, 0);
      const ridden = urges.filter(urge => urge.outcome === 'rode').length;
      return <article className={`chapter-page ${status}`} key={chapter.start}>
        <div className="chapter-margin"><span>0{index + 1}</span><i /></div>
        <div className="chapter-copy"><div className="chapter-meta">{status === 'complete' ? 'CHAPTER COMPLETE' : status === 'current' ? 'YOU ARE HERE' : 'AHEAD IN THE STORY'} <span>· DAYS {chapter.start}–{chapter.end}</span></div>
          <h3>{chapter.title}</h3><p className="chapter-cue">{chapter.cue}</p>
          {status === 'ahead' ? <p className="chapter-reflection">This page is still blank. It will fill with your own moments when you get here.</p> : <>
            <p className="chapter-reflection">{logs.length ? <>You checked in on <b>{wallDates.length} page{wallDates.length === 1 ? '' : 's'}</b> and made <b>{choices} small choice{choices === 1 ? '' : 's'}</b>.</> : 'This part of the path is quiet so far. Even an unwritten page belongs to your story.'} {urges.length > 0 && <>You met {urges.length} urge{urges.length === 1 ? '' : 's'}; {ridden} {ridden === 1 ? 'time you' : 'times you'} rode one out.</>}</p>
            {wallDates.length > 0 ? <div className="wall-note-stack">{wallDates.map(date => <WallNote key={date} data={data} profile={profile} date={date} day={Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${profile.start}T12:00:00`).getTime()) / 86400000) + 1} />)}</div> : status === 'current' ? <p className="chapter-prompt">What would you like to remember about this chapter?</p> : status === 'complete' && <p className="chapter-prompt">No marks were left on these days. A quiet page is part of the story, too.</p>}
          </>}
          <div className="chapter-foot"><span>THE QUIET MAZE</span><span>{chapter.start} — {chapter.end}</span></div>
        </div>
      </article>;
    })}
    {day > 30 && <div className="story-ending"><CheeseArt size={38} /><p>The maze may continue. Now you know you can find your own way through it.</p></div>}
  </section>;
}

function MazeTrail({ data, profile, day, limitFor }: { data: AppData; profile: NonNullable<AppData['profile']>; day: number; limitFor: (cheese: CheeseKey, week: number) => number }) {
  const points = Array.from({ length: 30 }, (_, index) => {
    const row = Math.floor(index / 6);
    const step = index % 6;
    const column = row % 2 === 0 ? step : 5 - step;
    return { x: 30 + column * 56, y: 29 + row * 65 };
  });
  const route = points.map(point => `${point.x},${point.y}`).join(' ');
  const progress = points.slice(0, Math.min(day, 30)).map(point => `${point.x},${point.y}`).join(' ');
  const current = points[Math.min(day, 30) - 1];
  return <Panel className="trail-panel">
    <div className="map-heading"><div><span className="eyebrow">THE PATH YOU HAVE MADE</span><h2>Not a straight line. Yours.</h2></div><MouseArt size={38} /></div>
    <svg className="maze-trail" viewBox="0 0 340 320" role="img" aria-label={`A winding maze route. The mouse is on page ${Math.min(day, 30)} of 30.`}>
      <polyline points={route} className="trail-underlay" /><polyline points={route} className="trail-line" /><polyline points={progress} className="trail-progress" />
      {points.slice(0, 29).map((point, index) => {
        const number = index + 1;
        const date = dateAt(profile.start, number);
        const log = data.logs[date];
        const status = !log?.touched ? 'empty' : profile.cheeses.some(key => (log.usage[key] ?? 0) > limitFor(key, Math.min(3, Math.floor(index / 7)))) ? 'over' : 'kept';
        return <g key={number} className={`maze-day ${number < day ? status : ''} ${number === day ? 'current' : ''}`}>
          <circle cx={point.x} cy={point.y} r={number === day ? 14 : 11} /><text x={point.x} y={point.y + 3.5}>{number}</text>
        </g>;
      })}
      <svg x={points[29].x - 17} y={points[29].y - 17} width="34" height="34" viewBox="0 0 48 48"><CheeseArt size={34} /></svg>
      <svg x={current.x - 17} y={current.y - 35} width="34" height="26" viewBox="0 0 40 30"><MouseArt size={34} /></svg>
    </svg>
    <div className="legend"><span><i className="kept" />Within limits</span><span><i className="over" />Over a limit</span><span><i className="empty" />Unwritten day</span></div>
  </Panel>;
}

export default function App() {
  const [data, setData] = useState<AppData>(loadData);
  const latestData = useRef(data);
  latestData.current = data;
  const [tab, setTab] = useState<TabKey>('today');
  const [route, setRoute] = useState<'app' | 'partner'>(() => location.hash === '#partner' ? 'partner' : 'app');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadTheme());
  const [onboard, setOnboard] = useState<Onboarding>({ step: 0, name: '', cheeses: ['social', 'gaming', 'food', 'adult'], amounts: { social: 120, gaming: 60, food: 3, adult: 1 }, triggers: [], times: [], reps: [], why: '', fear: '' });
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [cloudReady, setCloudReady] = useState(!supabase);
  const [syncMessage, setSyncMessage] = useState('');
  const [toast, setToast] = useState('');
  const [urgePhase, setUrgePhase] = useState<'pick' | 'run' | 'done'>('pick');
  const [urgeCheese, setUrgeCheese] = useState<CheeseKey | null>(null);
  const [urgeTrigger, setUrgeTrigger] = useState<string | null>(null);
  const [urgeRep, setUrgeRep] = useState<string | null>(null);
  const [urgeIntensity, setUrgeIntensity] = useState(3);
  const [urgeStart, setUrgeStart] = useState(0);
  const [urgeOutcome, setUrgeOutcome] = useState<'rode' | 'gave'>('rode');
  const [timerNow, setTimerNow] = useState(Date.now());
  const [promptIndex, setPromptIndex] = useState(() => new Date().getDate() % PROMPTS.length);
  const [promptOverride, setPromptOverride] = useState('');
  const [entryText, setEntryText] = useState('');
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [newActivity, setNewActivity] = useState('');
  const [newToll, setNewToll] = useState('');
  const [reminderStatus, setReminderStatus] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [challengeText, setChallengeText] = useState('');
  const [responseCode, setResponseCode] = useState('');
  const [lockResponse, setLockResponse] = useState('');
  const [lockError, setLockError] = useState('');
  const [partnerStatus, setPartnerStatus] = useState('');
  const [partnerKey, setPartnerKey] = useState<{ priv: JsonWebKey; pub: string } | null>(() => {
    try { return JSON.parse(localStorage.getItem('quiet-maze-partner') || 'null'); } catch { return null; }
  });

  const profile = data.profile;
  const today = todayKey();
  const day = profile ? dayNumber(profile.start) : 1;
  const week = Math.min(3, Math.max(0, Math.floor((day - 1) / 7)));
  const todayLog = data.logs[today] ?? { usage: {}, tasks: {}, mood: 0, urge: 0 };
  const scale = data.scale as ScaleState;
  const activePrompt = promptOverride || PROMPTS[promptIndex];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* Theme remains active for this session. */ }
  }, [theme]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { setToast('Storage is full. Export a backup before continuing.'); }
  }, [data]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (import.meta.env.DEV) {
      const appPath = new URL(BASE, location.origin).pathname;
      void navigator.serviceWorker.getRegistrations().then(registrations => Promise.all(
        registrations.filter(registration => new URL(registration.scope).pathname.startsWith(appPath)).map(registration => registration.unregister()),
      ));
      return;
    }
    if (!/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register(`${BASE}sw.js`).catch(() => undefined);
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let alive = true;
    const syncSession = async (sessionUser: { id: string; email?: string } | null) => {
      if (!alive) return;
      setUser(sessionUser);
      if (!sessionUser) { setCloudReady(true); return; }
      setCloudReady(false);
      const { data: row, error } = await client.from('app_state').select('state_json').eq('user_id', sessionUser.id).maybeSingle();
      if (!alive) return;
      if (error) setSyncMessage(`Cloud read failed: ${error.message}`);
      else if (row?.state_json) {
        const merged = mergeData(latestData.current, normalizeData(row.state_json));
        setData(merged);
        const { error: mergeError } = await client.from('app_state').upsert({ user_id: sessionUser.id, state_json: merged });
        if (mergeError) setSyncMessage(`Cloud merge failed: ${mergeError.message}`);
      }
      else {
        const { error: writeError } = await client.from('app_state').upsert({ user_id: sessionUser.id, state_json: latestData.current });
        if (writeError) setSyncMessage(`Cloud save failed: ${writeError.message}`);
      }
      setCloudReady(true);
    };
    client.auth.getSession().then(({ data: sessionData }) => syncSession(sessionData.session?.user ?? null));
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => { void syncSession(session?.user ?? null); }, 0);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client || !user || !cloudReady) return;
    const timeout = window.setTimeout(async () => {
      const { error } = await client.from('app_state').upsert({ user_id: user.id, state_json: data });
      setSyncMessage(error ? `Cloud save failed: ${error.message}` : 'Saved to your private cloud account.');
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [data, user, cloudReady]);

  useEffect(() => {
    const client = supabase;
    if (!client || !user || !cloudReady || !('serviceWorker' in navigator)) return;
    let alive = true;
    void navigator.serviceWorker.ready.then(registration => registration.pushManager.getSubscription()).then(async subscription => {
      if (!alive || !subscription) return;
      const { error } = await client.from('push_subscriptions').update({
        enabled: data.remind.enabled,
        times: data.remind.times,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }).eq('user_id', user.id).eq('endpoint', subscription.endpoint);
      if (error) setReminderStatus(`Could not update push schedule: ${error.message}`);
    });
    return () => { alive = false; };
  }, [data.remind.enabled, data.remind.times, user, cloudReady]);

  useEffect(() => {
    if (!profile || !data.remind.on) return;
    const checkReminders = () => {
      const current = new Date();
      const minutes = current.getHours() * 60 + current.getMinutes();
      const reminder = Object.entries(data.remind.times).find(([key, time]) => {
        if (!data.remind.enabled[key] || data.remind.last[key] === today) return false;
        const [hours, mins] = time.split(':').map(Number);
        return minutes >= hours * 60 + mins && minutes - (hours * 60 + mins) < 15;
      });
      if (!reminder) return;
      const [key] = reminder;
      setData(previous => ({ ...previous, remind: { ...previous.remind, last: { ...previous.remind.last, [key]: today } } }));
      setToast(`${key === 'morning' ? 'Morning intention' : key === 'evening' ? 'Evening check-in' : 'Wind-down'}: take one small pause for yourself.`);
      if ('Notification' in window && Notification.permission === 'granted') {
        void navigator.serviceWorker.ready.then(registration => registration.showNotification('The Quiet Maze', { body: 'Take one small pause for yourself.', icon: `${BASE}icons/icon-192.png` }));
      }
    };
    const interval = window.setInterval(checkReminders, 30000);
    checkReminders();
    return () => window.clearInterval(interval);
  }, [profile, data.remind, today]);

  useEffect(() => {
    if (urgePhase !== 'run') return;
    const interval = window.setInterval(() => setTimerNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [urgePhase]);

  useEffect(() => {
    if (!scale.committed || !scale.lastJudged || scale.pending?.length) return;
    let current = new Date(`${scale.lastJudged}T12:00:00`);
    const todayDate = new Date(`${today}T12:00:00`);
    if (current >= todayDate) return;
    current.setDate(current.getDate() + 1);
    if (current >= todayDate) return;
    const items: ScaleItem[] = scale.items ?? [];
    const manual = scale.manual ?? {};
    const pending: Array<Record<string, unknown>> = [...(scale.pending ?? [])];
    const verdicts = { ...((scale.history ?? {}) as Record<string, { ok?: boolean; failed?: string[]; possible?: number; earned?: number }>) };
    const tolls = (scale.custom as Array<{ text?: string }> | undefined)?.map(item => item.text).filter((text): text is string => Boolean(text)) ?? [];
    while (current < todayDate) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      const loggedDay = Math.max(1, Math.floor((new Date(`${key}T12:00:00`).getTime() - new Date(`${profile!.start}T12:00:00`).getTime()) / 86400000) + 1);
      const log = data.logs[key];
      const complete = (item: ScaleItem) => {
        if (item.type === 'manual') return Boolean(manual[key]?.[item.id]);
        if (item.type === 'limit') return Boolean(log?.touched && (log.usage[item.id.replace('lim_', '') as CheeseKey] ?? 0) <= limitFor(item.id.replace('lim_', '') as CheeseKey, Math.min(3, Math.floor((loggedDay - 1) / 7))));
        if (item.type === 'steps') return Boolean(log?.touched && ['general', ...(profile?.cheeses.slice(0, 2) ?? [])].every(id => log.tasks[id]));
        if (item.type === 'body') return Object.values(data.body.days[key] ?? {}).filter(Boolean).length >= 3;
        if (item.type === 'journal') return data.journal.some(entry => {
          const date = new Date(entry.ts);
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` === key;
        });
        return Boolean(manual[key]?.[item.id]);
      };
      const missed = items.filter(item => item.tier === 'must' && !complete(item));
      const possible = items.reduce((total, item) => total + (item.tier === 'must' ? 5 : item.tier === 'should' ? 3 : 1), 0);
      const earned = items.reduce((total, item) => total + (complete(item) ? (item.tier === 'must' ? 5 : item.tier === 'should' ? 3 : 1) : 0), 0);
      verdicts[key] = { ok: missed.length === 0, failed: missed.map(item => item.name), possible, earned };
      if (missed.length) {
        if (scale.mode === 'partner') {
          pending.push({ id: `local-${key}`, day: key, mode: 'partner', ch: createChallenge(), failed: missed.map(item => item.name) });
        } else {
          const text = tolls.length ? tolls[Math.floor(Math.random() * tolls.length)] : 'Write a few honest lines about what got in the way.';
          pending.push({ id: `local-${key}`, day: key, mode: 'self', text, failed: missed.map(item => item.name) });
        }
      }
      current.setDate(current.getDate() + 1);
    }
    const previousDay = new Date(`${today}T12:00:00`);
    previousDay.setDate(previousDay.getDate() - 1);
    const lastJudged = `${previousDay.getFullYear()}-${String(previousDay.getMonth() + 1).padStart(2, '0')}-${String(previousDay.getDate()).padStart(2, '0')}`;
    setData(previous => ({ ...previous, scale: { ...previous.scale, lastJudged, pending, history: verdicts } }));
  }, [data.logs, profile, scale.committed, scale.lastJudged, scale.pending, scale.items, scale.manual, today]);

  const limitFor = (cheese: CheeseKey, activeWeek: number) => {
    const start = profile?.current[cheese] ?? CHEESE[cheese].start;
    const value = start * FACTORS[Math.min(activeWeek, 3)];
    return CHEESE[cheese].unit === 'min' ? Math.round(value / 5) * 5 : Math.round(value);
  };

  const updateLog = (change: (log: AppData['logs'][string]) => AppData['logs'][string]) => {
    setData(previous => {
      const current = previous.logs[today] ?? { usage: {}, tasks: {}, mood: 0, urge: 0 };
      return { ...previous, logs: { ...previous.logs, [today]: { ...change(current), touched: true } } };
    });
  };

  const finishOnboarding = () => {
    if (!onboard.cheeses.length) { setToast('Choose at least one habit to work on.'); return; }
    const newProfile = {
      name: onboard.name.trim() || 'friend', cheeses: onboard.cheeses, current: onboard.amounts,
      triggers: onboard.triggers, times: onboard.times, reps: onboard.reps,
      why: onboard.why.trim(), fear: onboard.fear.trim(), start: today,
    };
    const initialItems: ScaleItem[] = [
      ...onboard.cheeses.map(key => ({ id: `lim_${key}`, type: 'limit', name: `Stay within your ${CHEESE[key].name.split(' & ')[0].toLowerCase()} limit`, tier: (key === 'social' || key === 'adult' ? 'must' : 'should') as ScaleItem['tier'] })),
      { id: 'steps', type: 'steps', name: 'Finish today’s small steps', tier: 'must' },
      { id: 'body', type: 'body', name: 'Do 3 of 4 body basics', tier: 'nice' },
      { id: 'journal', type: 'journal', name: 'Write one journal entry', tier: 'nice' },
    ];
    setData(previous => ({ ...previous, profile: newProfile, scale: { ...previous.scale, items: initialItems } }));
    setTab('today');
  };

  const signIn = async () => {
    if (!supabase) { setSyncMessage('Add Supabase URL and anon key in .env.local to enable Google sign-in.'); return; }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}${BASE}` } });
    if (error) setSyncMessage(error.message);
  };

  const enablePush = async () => {
    if (!supabase || !user) { setReminderStatus('Sign in with Google to enable scheduled push reminders.'); return; }
    if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) { setReminderStatus('Add the public VAPID key to the frontend environment first.'); return; }
    if (!('PushManager' in window) || !('serviceWorker' in navigator)) { setReminderStatus('Push reminders are not supported in this browser.'); return; }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { setReminderStatus('Notification permission was not granted.'); return; }
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(import.meta.env.VITE_VAPID_PUBLIC_KEY) });
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id, endpoint: subscription.endpoint, subscription: subscription.toJSON(),
        enabled: data.remind.enabled, times: data.remind.times, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, last_sent: {},
      }, { onConflict: 'endpoint' });
      setReminderStatus(error ? `Could not save subscription: ${error.message}` : 'Push reminders are connected on this device.');
    } catch (error) {
      setReminderStatus(error instanceof Error ? error.message : 'Could not enable push reminders.');
    }
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    setSyncMessage('Signed out. This device still has its local copy.');
  };

  const saveBackup = () => download(JSON.stringify(data, null, 2), `quiet-maze-backup-${today}.json`, 'application/json');
  const exportWeights = () => {
    const rows = [['date', 'weight_kg', 'waist_cm'], ...data.body.weights.slice().sort((left, right) => left.date.localeCompare(right.date)).map(item => [item.date, String(item.weight), item.waist == null ? '' : String(item.waist)])];
    const csv = rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
    download(csv, `quiet-maze-weights-${today}.csv`, 'text/csv');
  };
  const resetProgress = () => {
    const scaleState = data.scale as ScaleState;
    if (scaleState.committed && ((scaleState.pending?.length ?? 0) > 0 || today < (scaleState.editAfter ?? ''))) { setToast('Start over is locked during an active commitment.'); return; }
    if (!confirm('Erase this device’s progress and begin again? Export a backup first if you may need it.')) return;
    setData(freshData()); setOnboard(previous => ({ ...previous, step: 0, name: '', why: '', fear: '' })); setTab('today'); setToast('Progress cleared on this device.');
  };
  const importBackup = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as {
          profile?: { cheeses?: unknown; stepGoal?: number; proteinTarget?: number; calorieTarget?: number };
          weights?: Array<{ date?: string; weight?: number; waist?: number | null }>;
          days?: Record<string, { habits?: Record<string, boolean> }>;
        };
        if (Array.isArray(parsed.weights) && parsed.days && !parsed.profile?.cheeses) {
          if (!confirm('This looks like a Fat-loss Tracker backup. Add its measurements and habits to the Body tab?')) return;
          const importedWeights = parsed.weights.filter(item => item.date && Number(item.weight)).map(item => ({ date: item.date!, weight: Number(item.weight), waist: item.waist == null ? null : Number(item.waist) }));
          const importedDays = Object.fromEntries(Object.entries(parsed.days).map(([date, record]) => [date, { steps: Boolean(record.habits?.steps), train: Boolean(record.habits?.training), sleep: Boolean(record.habits?.sleep), protein: Boolean(record.habits?.protein) }]));
          setData(previous => ({ ...previous, body: { ...previous.body, weights: importedWeights, days: { ...previous.body.days, ...importedDays }, targets: { steps: Number(parsed.profile?.stepGoal) || 8000, protein: Number(parsed.profile?.proteinTarget) || 160, calories: Number(parsed.profile?.calorieTarget) || 2100 } } }));
          setToast('Body measurements imported.');
          return;
        }
        const scaleState = data.scale as ScaleState;
        if (scaleState.committed && ((scaleState.pending?.length ?? 0) > 0 || today < (scaleState.editAfter ?? ''))) { setToast('Backup import is unavailable during an active commitment.'); return; }
        const restored = normalizeData(parsed);
        if (!restored.profile || !confirm('Replace this device’s Quiet Maze progress with the selected backup?')) return;
        setData(restored);
        setToast('Backup restored.');
      } catch { setToast('That file is not a valid Quiet Maze backup.'); }
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const changeOnboardList = (field: 'cheeses' | 'triggers' | 'times' | 'reps', value: string) => {
    setOnboard(previous => {
      const list = previous[field] as string[];
      return { ...previous, [field]: list.includes(value) ? list.filter(item => item !== value) : [...list, value] };
    });
  };

  const addMood = (mood: MoodKey) => updateLog(log => ({ ...log, mood: MOOD_SCORE[mood], moodLabel: mood }));
  const todayTaskIds = [
    { id: 'general', text: STEPS[(day - 1) % STEPS.length] },
    ...(profile?.cheeses.slice(0, 2).map(key => ({ id: key, text: TASK_POOL[key][(day - 1) % TASK_POOL[key].length] })) ?? []),
  ];

  const completeUrge = (outcome: 'rode' | 'gave') => {
    if (!urgeCheese) return;
    const seconds = Math.min(600, Math.floor((Date.now() - urgeStart) / 1000));
    setData(previous => ({ ...previous, urges: [{ ts: Date.now(), cheese: urgeCheese, intensity: urgeIntensity, trigger: urgeTrigger, outcome, secs: seconds, rep: urgeRep }, ...previous.urges], logs: { ...previous.logs, [today]: { ...(previous.logs[today] ?? { usage: {}, tasks: {}, mood: 0, urge: 0 }), touched: true } } }));
    setUrgeOutcome(outcome);
    setUrgePhase('done');
  };

  const saveJournal = () => {
    if (!entryText.trim()) { setToast('Write a few words before saving.'); return; }
    setData(previous => ({ ...previous, journal: [{ ts: Date.now(), prompt: activePrompt, text: entryText.trim() }, ...previous.journal], logs: { ...previous.logs, [today]: { ...(previous.logs[today] ?? { usage: {}, tasks: {}, mood: 0, urge: 0 }), touched: true } } }));
    setEntryText(''); setPromptOverride(''); setToast('Entry saved privately.');
  };

  const addActivity = () => {
    if (newActivity.trim().length < 2) return;
    setData(previous => ({ ...previous, scale: { ...previous.scale, items: [...(scale.items ?? []), { id: `manual-${Date.now()}`, type: 'manual', name: newActivity.trim(), tier: 'should' }] } }));
    setNewActivity('');
  };

  const setTier = (id: string, tier: ScaleItem['tier']) => {
    const item = scale.items.find(current => current.id === id);
    if (!item || (scale.committed && today < (scale.editAfter ?? ''))) return;
    if (tier === 'must' && item.tier !== 'must' && scale.items.filter(current => current.tier === 'must').length >= 3) { setToast('Keep no more than three Must activities.'); return; }
    setData(previous => ({ ...previous, scale: { ...previous.scale, items: scale.items.map(current => current.id === id ? { ...current, tier } : current) } }));
  };

  const toggleManual = (id: string) => setData(previous => {
    const currentScale = previous.scale as ScaleState;
    return { ...previous, scale: { ...previous.scale, manual: { ...currentScale.manual, [today]: { ...currentScale.manual[today], [id]: !currentScale.manual[today]?.[id] } } } };
  });

  const commitScale = () => {
    if (!scale.items.some(item => item.tier === 'must')) { setToast('Choose at least one Must before committing.'); return; }
    if (scale.mode === 'partner' && !crypto?.subtle) { setToast('Partner commitments require a secure HTTPS browser.'); return; }
    if (scale.mode === 'partner' && (!(scale.partner?.name ?? '').trim() || (scale.partner?.phone ?? '').replace(/\D/g, '').length < 7 || !(scale.partner?.pub ?? '').includes('.'))) { setToast('Add your partner’s name, phone, and public code first.'); return; }
    if (!confirm('Commit to these activities for seven days? You will not be able to change their rankings during that time.')) return;
    const end = new Date(`${today}T12:00:00`); end.setDate(end.getDate() + 7);
    const editAfter = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    const previousDay = new Date(`${today}T12:00:00`); previousDay.setDate(previousDay.getDate() - 1);
    const lastJudged = `${previousDay.getFullYear()}-${String(previousDay.getMonth() + 1).padStart(2, '0')}-${String(previousDay.getDate()).padStart(2, '0')}`;
    setData(previous => ({ ...previous, scale: { ...previous.scale, committed: true, start: today, editAfter, lastJudged } }));
  };

  const saveWeight = () => {
    const numericWeight = Number(weight), numericWaist = waist === '' ? null : Number(waist);
    if (!numericWeight || numericWeight < 30 || numericWeight > 300 || (numericWaist !== null && (numericWaist < 30 || numericWaist > 250))) { setToast('Enter a valid weight and waist measurement.'); return; }
    setData(previous => ({ ...previous, body: { ...previous.body, weights: [...previous.body.weights.filter(item => item.date !== today), { date: today, weight: numericWeight, waist: numericWaist }] } }));
    setWeight(''); setWaist(''); setToast('Measurement saved.');
  };

  const downloadICS = () => {
    const reminders = Object.entries(data.remind.enabled).filter(([, enabled]) => enabled);
    if (!reminders.length) { setReminderStatus('Choose at least one reminder.'); return; }
    const events = reminders.map(([key]) => {
      const time = data.remind.times[key] || '08:00';
      const title = key === 'morning' ? 'Morning intention' : key === 'evening' ? 'Evening check-in' : 'Wind-down';
      return `BEGIN:VEVENT\nUID:quiet-maze-${key}-${Date.now()}@local\nDTSTART:${today.replaceAll('-', '')}T${time.replace(':', '')}00\nDURATION:PT10M\nRRULE:FREQ=DAILY;COUNT=30\nSUMMARY:The Quiet Maze: ${title}\nBEGIN:VALARM\nACTION:DISPLAY\nDESCRIPTION:${title}\nTRIGGER:PT0M\nEND:VALARM\nEND:VEVENT`;
    });
    download(['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Quiet Maze//EN', ...events, 'END:VCALENDAR'].join('\r\n'), 'quiet-maze-reminders.ics', 'text/calendar');
  };

  const createPartnerKey = async () => {
    try {
      const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
      const privateKey = await crypto.subtle.exportKey('jwk', pair.privateKey);
      const publicKey = await crypto.subtle.exportKey('jwk', pair.publicKey);
      const created = { priv: privateKey, pub: `${publicKey.x}.${publicKey.y}` };
      localStorage.setItem('quiet-maze-partner', JSON.stringify(created));
      setPartnerKey(created); setPartnerStatus('Partner key created on this device.');
    } catch { setPartnerStatus('Secure keys are unavailable in this browser. Open the installed app or use HTTPS.'); }
  };

  const approveChallenge = async () => {
    const match = challengeText.toUpperCase().match(/[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}/);
    if (!match || !partnerKey) { setPartnerStatus('Paste a message containing a valid challenge code.'); return; }
    try {
      const key = await crypto.subtle.importKey('jwk', partnerKey.priv, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
      const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(match[0].replaceAll('-', ''))));
      setResponseCode(btoa(String.fromCharCode(...signature)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''));
      setPartnerStatus(`Approved challenge ${match[0]}. Send the response code below.`);
    } catch { setPartnerStatus('Could not sign that challenge.'); }
  };

  const verifyPartnerUnlock = async () => {
    const pending = scale.pending?.[0];
    const [x, y] = String(scale.partner?.pub ?? '').split('.');
    if (!pending || !x || !y || !pending.ch || !lockResponse.trim()) { setLockError('Enter the response code from your partner.'); return; }
    try {
      const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x, y, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      const challenge = String(pending.ch).replaceAll('-', '');
      const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, decodeKey(lockResponse.replaceAll(' ', '')), new TextEncoder().encode(challenge));
      if (!valid) { setLockError('That response code does not match this challenge. Ask your partner to check it.'); return; }
      setData(previous => ({ ...previous, scale: { ...previous.scale, pending: (scale.pending ?? []).slice(1), paid: [...(scale.paid ?? []), { id: pending.id, day: pending.day, text: `Released by ${scale.partner?.name || 'your partner'}`, ts: Date.now() }] } }));
      setLockResponse(''); setLockError('');
    } catch { setLockError('Could not verify that response code in this browser.'); }
  };

  const toggleInAppReminders = async () => {
    if (!data.remind.on && 'Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setReminderStatus('Notification permission was not granted.'); return; }
    }
    setData(previous => ({ ...previous, remind: { ...previous.remind, on: !previous.remind.on } }));
    setReminderStatus(data.remind.on ? 'In-app alerts are off.' : 'In-app alerts are on while this app is open.');
  };

  const nav = (id: TabKey) => { setTab(id); setRoute('app'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const heading = profile ? `Hello, ${profile.name}` : 'A little more room';
  const elapsed = urgePhase === 'run' ? Math.min(600, Math.floor((timerNow - urgeStart) / 1000)) : 0;
  const secondsLeft = Math.max(0, 600 - elapsed);
  const completion = profile ? Math.min(100, ((Math.min(day, 30) - 1) / 29) * 100) : 0;
  const isLocked = (scale.pending?.length ?? 0) > 0;
  const pendingLock = scale.pending?.[0];
  const partnerLocked = pendingLock?.mode === 'partner';

  return <div className="app-frame" data-theme={theme}>
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <div className="app-content">
      <header className="app-header">
        <button className="brand" onClick={() => { setRoute('app'); setTab('today'); }} aria-label="The Quiet Maze home"><span className="brand-mark"><CheeseArt size={27} /></span><span>quiet maze</span></button>
        <div className="header-actions">
          <span className={`sync-indicator ${user ? 'synced' : ''}`} title={user ? 'Cloud sync on' : 'Saved on this device'}>{user ? <Cloud size={16} /> : <ShieldCheck size={16} />}<span>{user ? 'Synced' : 'On this device'}</span></span>
          {profile && <button className="icon-button" onClick={() => setRoute('partner')} aria-label="Open partner tools" title="Partner tools"><UserRound size={17} /></button>}
          {profile && tab === 'trail' && <button className="icon-button" onClick={resetProgress} aria-label="Start over" title="Start over"><Trash2 size={17} /></button>}
          <button className="icon-button" onClick={() => setTheme(value => value === 'light' ? 'dark' : 'light')} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} title="Change appearance">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
        </div>
      </header>

      {route === 'partner' ? <main className="page partner-page">
        <button className="back-link" onClick={() => setRoute('app')}><ArrowLeft size={16} /> Back to your maze</button>
        <SectionTitle eyebrow="ACCOUNTABILITY" title="Hold a little space" detail="A private key stays in this browser. Approve a friend’s unlock challenge only after they have done the task you agreed on." />
        {!partnerKey ? <Panel><div className="panel-heading"><div><span className="eyebrow">PARTNER TOOLS</span><h2>Create your partner key</h2></div><ShieldCheck /></div><p>Your private key never leaves this device. Keep this browser data safe; clearing it removes the key.</p><button className="button primary" onClick={() => void createPartnerKey()}><Plus size={17} /> Create partner code</button></Panel> : <>
          <Panel><div className="panel-heading"><div><span className="eyebrow">YOUR PUBLIC CODE</span><h2>Share this with your friend</h2></div><ShieldCheck /></div><textarea readOnly value={partnerKey.pub} /><button className="button secondary" onClick={() => { void navigator.clipboard?.writeText(partnerKey.pub); setPartnerStatus('Partner code copied.'); }}><ArrowDownToLine size={16} /> Copy code</button></Panel>
          <Panel><div className="panel-heading"><div><span className="eyebrow">UNLOCK APPROVAL</span><h2>Approve a challenge</h2></div><Send /></div><textarea value={challengeText} onChange={event => setChallengeText(event.target.value)} placeholder="Paste your friend's challenge message" /><button className="button primary" onClick={() => void approveChallenge()}>Approve and sign</button>{responseCode && <><label className="field-label">Response code</label><textarea readOnly value={responseCode} /><button className="button secondary" onClick={() => { void navigator.clipboard?.writeText(responseCode); setPartnerStatus('Response code copied.'); }}>Copy response</button></>}{partnerStatus && <p className="status-line">{partnerStatus}</p>}</Panel>
        </>}
      </main> : !profile ? <main className="page onboarding-page">
        <div className="onboard-kicker"><span className="brand-mark"><CheeseArt size={24} /></span><span>YOUR 30-DAY MAZE</span></div>
        {onboard.step === 0 ? <section className="welcome">
          <span className="eyebrow">A STORY ABOUT CHANGE, MADE PERSONAL</span><h1>When the<br /><em>cheese moves.</em></h1><p>Quick rewards can become the maze. Notice when the old route stops working, then find a new way toward what matters to you.</p>
          <WelcomeMaze />
          <button className="button primary wide" onClick={() => setOnboard(value => ({ ...value, step: 1 }))}>Begin with a check-in <ArrowRight size={18} /></button>
          <button className="text-button" onClick={() => setRoute('partner')}>I’m someone’s accountability partner</button>
        </section> : <section className="onboard-flow">
          <div className="onboard-progress"><span>STEP {String(onboard.step).padStart(2, '0')} / 08</span><div><i style={{ width: `${(onboard.step / 8) * 100}%` }} /></div></div>
          {onboard.step === 1 && <><SectionTitle eyebrow="FIRST, YOUR NAME" title="What should we call you?" detail="A first name or nickname is perfect." /><input className="text-input" value={onboard.name} onChange={event => setOnboard(value => ({ ...value, name: event.target.value }))} placeholder="Your name" maxLength={30} autoFocus /></>}
          {onboard.step === 2 && <><SectionTitle eyebrow="WHAT HAS BECOME YOUR CHEESE?" title="Which quick rewards pull you in?" detail="Choose the old cheese that keeps calling. This is about noticing, not judging yourself." /><div className="choice-list">{(Object.keys(CHEESE) as CheeseKey[]).map(key => <button key={key} className={`choice-row ${onboard.cheeses.includes(key) ? 'selected' : ''}`} onClick={() => changeOnboardList('cheeses', key)} aria-pressed={onboard.cheeses.includes(key)}><span className="choice-check">{onboard.cheeses.includes(key) && <Check size={15} />}</span><span><b>{CHEESE[key].name}</b><small>{CHEESE[key].hint}</small></span><ChevronDown size={17} /></button>)}</div></>}
          {onboard.step === 3 && <><SectionTitle eyebrow="START WHERE YOU ARE" title="About how much on a usual day?" detail="A rough estimate gives your trail a useful starting point." /><div className="amount-list">{onboard.cheeses.map(key => <div className="amount-row" key={key}><div><b>{CHEESE[key].name.split(' & ')[0]}</b><small>{CHEESE[key].unit}</small></div><div className="step-control"><button onClick={() => setOnboard(value => ({ ...value, amounts: { ...value.amounts, [key]: Math.max(0, (value.amounts[key] ?? CHEESE[key].start) - (CHEESE[key].unit === 'min' ? 10 : 1)) } }))} aria-label={`Less ${key}`}>−</button><strong>{onboard.amounts[key] ?? CHEESE[key].start}</strong><button onClick={() => setOnboard(value => ({ ...value, amounts: { ...value.amounts, [key]: (value.amounts[key] ?? CHEESE[key].start) + (CHEESE[key].unit === 'min' ? 10 : 1) } }))} aria-label={`More ${key}`}>+</button></div></div>)}</div></>}
          {onboard.step === 4 && <><SectionTitle eyebrow="LOOK FOR A PATTERN" title="What tends to set it off?" detail="Choose any that sound familiar." /><div className="chip-list">{TRIGGERS.map(trigger => <button className={`soft-chip ${onboard.triggers.includes(trigger) ? 'chosen' : ''}`} key={trigger} onClick={() => changeOnboardList('triggers', trigger)}>{trigger}</button>)}</div></>}
          {onboard.step === 5 && <><SectionTitle eyebrow="PLAN AHEAD" title="When is the pull strongest?" detail="This helps your daily check-in meet you at the right time." /><div className="chip-list">{TIMES.map(time => <button className={`soft-chip ${onboard.times.includes(time) ? 'chosen' : ''}`} key={time} onClick={() => changeOnboardList('times', time)}>{time}</button>)}</div></>}
          {onboard.step === 6 && <><SectionTitle eyebrow="MAKE A LITTLE SPACE" title="What could you do instead?" detail="Pick a few things you might genuinely enjoy." /><div className="chip-list">{['Walk', 'Read', 'Exercise', 'Journal', 'Call a friend', 'Cook or tidy', 'Breathe', 'Make something'].map(rep => <button className={`soft-chip ${onboard.reps.includes(rep) ? 'chosen' : ''}`} key={rep} onClick={() => changeOnboardList('reps', rep)}>{rep}</button>)}</div></>}
          {onboard.step === 7 && <><SectionTitle eyebrow="YOUR REASON" title="What matters underneath this?" detail="A note to come back to on a harder day. It stays private." /><label className="field-label" htmlFor="why">Why do you want more room?</label><textarea id="why" value={onboard.why} onChange={event => setOnboard(value => ({ ...value, why: event.target.value }))} placeholder="More focus, better sleep, feeling present…" /><label className="field-label" htmlFor="fear">What feels hard about changing?</label><textarea id="fear" value={onboard.fear} onChange={event => setOnboard(value => ({ ...value, fear: event.target.value }))} placeholder="Being bored, missing out, starting again…" /></>}
          {onboard.step === 8 && <><SectionTitle eyebrow="YOUR FIRST 30 DAYS" title="A plan with room to breathe." detail="Your daily limits taper gently across four weeks. Going over is information, not failure." /><Panel className="plan-panel">{onboard.cheeses.map(key => <div className="plan-row" key={key}><b>{CHEESE[key].name.split(' & ')[0]}</b><span>Now</span>{FACTORS.map((factor, index) => <span key={factor}>W{index + 1}<b>{Math.round((onboard.amounts[key] ?? CHEESE[key].start) * factor)}</b></span>)}</div>)}</Panel></>}
          <div className="flow-actions"><button className="button secondary" onClick={() => setOnboard(value => ({ ...value, step: Math.max(0, value.step - 1) }))}><ArrowLeft size={16} /> Back</button><button className="button primary" onClick={() => onboard.step === 8 ? finishOnboarding() : setOnboard(value => ({ ...value, step: value.step + 1 }))}>{onboard.step === 8 ? 'Start my trail' : 'Continue'} <ArrowRight size={16} /></button></div>
        </section>}
      </main> : isLocked ? <main className="page">
        <SectionTitle eyebrow={partnerLocked ? 'ACCOUNTABILITY CHECK-IN' : 'A PAUSE, NOT A PUNISHMENT'} title={partnerLocked ? 'Your partner holds the key.' : 'Time to make good.'} detail={partnerLocked ? `A Must activity was missed on ${String(pendingLock?.day ?? 'an earlier day')}. Ask your partner to set a task and approve your unlock.` : 'One of the activities you marked Must was missed. Complete your chosen toll, then reflect.'} />
        <Panel>
          <h2>{partnerLocked ? `Challenge ${String(pendingLock?.ch ?? '')}` : String(pendingLock?.text ?? 'Choose a small act of repair, then write what you learned.')}</h2>
          {partnerLocked && <a className="button secondary" href={`sms:${String(scale.partner?.phone ?? '').replace(/[^+\d]/g, '')}?&body=${encodeURIComponent(`Quiet Maze: I missed ${String((pendingLock?.failed as string[] | undefined)?.join(', ') ?? 'a Must activity')} on ${String(pendingLock?.day ?? '')}. Please give me a task and approve this challenge: ${String(pendingLock?.ch ?? '')}.`)}`}>Text {scale.partner?.name || 'your partner'}</a>}
          <label className="field-label" htmlFor="lock-input">{partnerLocked ? 'Response code from your partner' : 'What did you do, or what will you try next?'}</label>
          <textarea id="lock-input" value={partnerLocked ? lockResponse : partnerCode} onChange={event => partnerLocked ? setLockResponse(event.target.value) : setPartnerCode(event.target.value)} placeholder={partnerLocked ? 'Paste the response code' : 'Write a sentence about it'} />
          {lockError && <p className="error-line" role="alert">{lockError}</p>}
          <button className="button primary" onClick={partnerLocked ? () => void verifyPartnerUnlock() : () => { if (partnerCode.trim().length < 8) { setToast('Write a sentence before continuing.'); return; } setData(previous => ({ ...previous, scale: { ...previous.scale, pending: (scale.pending ?? []).slice(1), paid: [...(scale.paid ?? []), { text: partnerCode.trim(), ts: Date.now() }] } })); setPartnerCode(''); }}>{partnerLocked ? 'Verify partner code' : 'Continue with care'}</button>
        </Panel>
      </main> : <>
        <main className="page" key={tab}>
          {tab === 'today' && <>
            <SectionTitle eyebrow={new Date().getHours() < 12 ? 'A FRESH START' : 'A MOMENT FOR YOU'} title={heading} detail={day > 30 ? 'Your first 30 days are complete. Keep the practices that felt like yours.' : `Day ${day} of 30 · week ${week + 1} of your trail`} />
            <Panel className="progress-panel"><div className="progress-top"><div><span className="eyebrow">YOUR STORY</span><strong>{Math.min(day, 30)}<small> / 30 pages</small></strong></div><span className="progress-note">Chapter {Math.min(4, week + 1)} is unfolding</span></div><div className="progress-track"><i style={{ width: `${completion}%` }} /><span style={{ left: `${completion}%` }}><MouseArt size={27} /></span><CheeseArt className="progress-cheese" size={27} /></div><div className="progress-foot"><span>THE OLD ROUTE</span><span>A NEW WAY THROUGH</span></div></Panel>
            <section className="today-chapter"><div className="chapter-stamp"><span>CHAPTER {String(Math.min(4, week + 1)).padStart(2, '0')}</span><MouseArt size={34} /></div><div><span className="eyebrow">THE PAGE YOU’RE WRITING</span><h2>{['The first noticing', 'A turn in the maze', 'Finding a new route', 'Carrying the cheese forward'][Math.min(3, week)]}</h2><p>{todayLog.touched ? `You have already left a mark on today’s page. Keep going at your own pace.` : 'No perfect day required. Just one honest noticing and one small turn.'}</p><button className="text-button" onClick={() => nav('trail')}>Read your story so far <ArrowRight size={15} /></button></div></section>
            {profile.why && <blockquote className="why-quote"><Heart size={16} fill="currentColor" /><span>{profile.why}</span></blockquote>}
            <Panel><div className="panel-heading"><div><span className="eyebrow">THE OLD CHEESE</span><h2>Notice what pulls you</h2></div><span className="week-stamp">WEEK {week + 1}</span></div>{profile.cheeses.map(key => {
              const used = todayLog.usage[key] ?? 0; const limit = limitFor(key, week); const percent = Math.min(100, limit ? used / limit * 100 : used ? 100 : 0);
              return <div className="limit-row" key={key}><div className="limit-meta"><div><b>{CHEESE[key].name.split(' & ')[0]}</b><small>{used > limit ? `${used - limit} over · keep noticing` : `${Math.max(0, limit - used)} ${CHEESE[key].unit} left`}</small></div><strong>{used}<small> / {limit}</small></strong></div><div className="limit-meter"><i className={percent >= 85 ? 'near' : ''} style={{ width: `${percent}%` }} /></div><div className="limit-buttons"><button onClick={() => updateLog(log => ({ ...log, usage: { ...log.usage, [key]: Math.max(0, (log.usage[key] ?? 0) - (CHEESE[key].unit === 'min' ? 5 : 1)) } }))}>−</button><span>Log {CHEESE[key].unit === 'min' ? 'minutes' : 'one'}</span><button onClick={() => updateLog(log => ({ ...log, usage: { ...log.usage, [key]: (log.usage[key] ?? 0) + (CHEESE[key].unit === 'min' ? 5 : 1) } }))}><Plus size={15} /></button></div></div>;
            })}</Panel>
            <Panel><div className="panel-heading"><div><span className="eyebrow">SCURRY</span><h2>One small move toward new cheese</h2></div><span className="step-count">{todayTaskIds.filter(task => todayLog.tasks[task.id]).length}/{todayTaskIds.length}</span></div>{todayTaskIds.map(task => <button className={`check-row ${todayLog.tasks[task.id] ? 'checked' : ''}`} key={task.id} onClick={() => updateLog(log => ({ ...log, tasks: { ...log.tasks, [task.id]: !log.tasks[task.id] } }))}><span className="checkbox">{todayLog.tasks[task.id] && <Check size={15} />}</span><span>{task.text}</span></button>)}</Panel>
            <Panel className="mood-panel"><div className="panel-heading"><div><span className="eyebrow">SNIFF THE AIR</span><h2>What’s the feeling today?</h2></div><CircleHelp size={19} /></div><div className="mood-wheel">{MOODS.map(mood => <button key={mood.key} className={`mood-option ${todayLog.moodLabel === mood.key ? 'selected' : ''}`} style={{ '--mood': mood.color } as React.CSSProperties} onClick={() => addMood(mood.key)}><span className="mood-face">{mood.face}</span><span>{mood.label}</span></button>)}</div><p className="microcopy">Notice the change in the air. No feeling is a wrong turn.</p></Panel>
          </>}

          {tab === 'urge' && <>
            <SectionTitle eyebrow="A SMALL PAUSE" title={urgePhase === 'run' ? secondsLeft ? 'Stay with this moment.' : 'The wave has passed.' : urgePhase === 'done' ? (urgeOutcome === 'rode' ? 'You stayed with it.' : 'You noticed. That matters.') : 'An urge showed up.'} detail={urgePhase === 'pick' ? 'Noticing the pull is already a change. Let’s make a little space before you decide.' : urgePhase === 'done' ? 'Every honest check-in gives you something useful for next time.' : 'You do not have to act on it. Let the next ten minutes belong to you.'} />
            {urgePhase === 'pick' && <Panel><div className="eyebrow">WHAT IS IT ASKING FOR?</div><div className="chip-list compact">{profile.cheeses.map(key => <button key={key} className={`soft-chip ${urgeCheese === key ? 'chosen' : ''}`} onClick={() => setUrgeCheese(key)}>{CHEESE[key].name.split(' & ')[0]}</button>)}</div><label className="field-label range-title">How strong is it right now? <b>{['', 'Faint', 'Mild', 'Medium', 'Strong', 'Intense'][urgeIntensity]}</b></label><input className="range" type="range" min="1" max="5" value={urgeIntensity} onChange={event => setUrgeIntensity(Number(event.target.value))} /><div className="eyebrow trigger-title">WHAT SET IT OFF?</div><div className="chip-list compact">{[...profile.triggers, 'Not sure'].map(trigger => <button key={trigger} className={`soft-chip ${urgeTrigger === trigger ? 'chosen' : ''}`} onClick={() => setUrgeTrigger(trigger)}>{trigger}</button>)}</div><button className="button primary wide" disabled={!urgeCheese} onClick={() => { if (!urgeCheese) return; setUrgeStart(Date.now()); setTimerNow(Date.now()); setUrgePhase('run'); }}><Waves size={17} /> Begin a ten-minute pause</button></Panel>}
            {urgePhase === 'run' && <Panel className="timer-panel"><div className="timer-ring" style={{ '--progress': `${(elapsed / 600) * 360}deg` } as React.CSSProperties}><div><strong>{secondsLeft ? fmt(secondsLeft) : 'Done'}</strong><span>take your time</span></div></div><p>{URGE_TIPS[Math.min(URGE_TIPS.length - 1, Math.floor(elapsed / 150))]}</p>{profile.reps.length > 0 && <div className="urge-replacements"><span className="eyebrow">TRY ONE THING INSTEAD</span><div className="chip-list compact">{profile.reps.map(rep => <button key={rep} className={`soft-chip ${urgeRep === rep ? 'chosen' : ''}`} onClick={() => setUrgeRep(rep)}>{rep}</button>)}</div></div>}<div className="flow-actions"><button className="button secondary" onClick={() => completeUrge('gave')}>I gave in</button><button className="button primary" onClick={() => completeUrge('rode')}>I rode it out <ArrowRight size={16} /></button></div></Panel>}
            {urgePhase === 'done' && <Panel><span className="eyebrow">URGE HISTORY</span><h2>{urgeOutcome === 'rode' ? 'That was a real practice.' : 'A slip is not the end of the trail.'}</h2><p>{urgeOutcome === 'rode' ? 'Your brain got to experience an urge passing without being fed.' : 'You can be curious about what happened, without turning it into a verdict.'}</p><div className="flow-actions"><button className="button secondary" onClick={() => { setPromptOverride('What set off the urge, and what did I need?'); setTab('journal'); setUrgePhase('pick'); }}>Write about it</button><button className="button primary" onClick={() => { setUrgePhase('pick'); setUrgeCheese(null); setUrgeTrigger(null); }}>Back to Today</button></div></Panel>}
            {urgePhase === 'pick' && <Panel><div className="panel-heading"><div><span className="eyebrow">LOOKING BACK</span><h2>Recent urges</h2></div><span className="step-count">{data.urges.filter(item => item.outcome === 'rode').length}/{data.urges.length}</span></div>{data.urges.length ? data.urges.slice(0, 5).map(item => <div className="history-row" key={item.ts}><div><b>{CHEESE[item.cheese]?.name.split(' & ')[0]}</b><small>{new Date(item.ts).toLocaleDateString()} · {item.trigger || 'No trigger noted'}</small></div><span className={`tag ${item.outcome}`}>{item.outcome === 'rode' ? 'Rode it out' : 'Gave in'}</span></div>) : <p className="empty-note">There is nothing to log until an urge arrives.</p>}</Panel>}
          </>}

          {tab === 'journal' && <>
            <SectionTitle eyebrow="A NOTE TO YOURSELF" title="Writing on the wall." detail="A few honest lines can help you see what the noise was covering." />
            <Panel className="journal-compose"><span className="eyebrow">TODAY’S PROMPT</span><h2>{activePrompt}</h2><textarea value={entryText} onChange={event => setEntryText(event.target.value)} placeholder="Write freely. No one else reads this." /><div className="flow-actions"><button className="button secondary" onClick={() => { setPromptOverride(''); setPromptIndex(index => (index + 1) % PROMPTS.length); }}>Another prompt</button><button className="button primary" onClick={saveJournal}>Save entry <ArrowRight size={16} /></button></div></Panel>
            <div className="subheading-row"><h2>Past entries</h2><span>{data.journal.length} saved</span></div>
            {data.journal.length ? data.journal.map(entry => <Panel className="journal-entry" key={entry.ts}><div className="entry-top"><span className="eyebrow">{new Date(entry.ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span><button className="icon-button small-icon" aria-label="Delete entry" onClick={() => { if (confirm('Delete this journal entry?')) setData(previous => ({ ...previous, journal: previous.journal.filter(item => item.ts !== entry.ts) })); }}><Trash2 size={16} /></button></div><b>{entry.prompt}</b><p>{entry.text}</p></Panel>) : <Panel className="empty-state"><BookOpen size={22} /><p>Your first entry can be three honest lines.</p></Panel>}
          </>}

          {tab === 'body' && <>
            <SectionTitle eyebrow="CARE FOR THE BASICS" title="Your body, gently." detail="Movement, sleep and food are part of the good stuff. Track patterns, not perfection." />
            <div className="metric-grid">
              <div className="metric"><span>LATEST WEIGHT</span><b>{data.body.weights.at(-1)?.weight.toFixed(1) ?? '—'}</b><small>kg</small></div>
              <div className="metric"><span>WAIST</span><b>{[...data.body.weights].reverse().find(item => item.waist)?.waist?.toFixed(1) ?? '—'}</b><small>cm</small></div>
              <div className="metric"><span>WEEKLY BASICS</span><b>{Object.values(data.body.days).slice(-7).reduce((sum, record) => sum + Object.values(record).filter(Boolean).length, 0)}</b><small>checked</small></div>
            </div>
            <Panel><div className="panel-heading"><div><span className="eyebrow">TODAY, NOT FOREVER</span><h2>Body basics</h2></div></div>{[['steps', 'Steps', `Aim for ${data.body.targets.steps.toLocaleString()} steps`], ['train', 'Movement', 'A workout or easy movement'], ['sleep', 'Sleep', 'Make space for 7–9 hours'], ['protein', 'Protein', `A flexible ${data.body.targets.protein} g guide`]].map(([id, label, hint]) => <button className={`check-row ${data.body.days[today]?.[id] ? 'checked' : ''}`} key={id} onClick={() => setData(previous => ({ ...previous, body: { ...previous.body, days: { ...previous.body.days, [today]: { ...previous.body.days[today], [id]: !previous.body.days[today]?.[id] } } } }))}><span className="checkbox">{data.body.days[today]?.[id] && <Check size={15} />}</span><span><b>{label}</b><small>{hint}</small></span></button>)}</Panel>
            <Panel><div className="panel-heading"><div><span className="eyebrow">A TREND, NOT A SCORE</span><h2>Weigh-in</h2></div></div><p className="body-note">Once a week is plenty. Daily readings move with water, meals and sleep.</p><div className="input-pair"><label>Weight (kg)<input type="number" min="30" max="300" step="0.1" value={weight} onChange={event => setWeight(event.target.value)} placeholder="81.6" /></label><label>Waist (cm)<input type="number" min="30" max="250" step="0.1" value={waist} onChange={event => setWaist(event.target.value)} placeholder="Optional" /></label></div><div className="button-row"><button className="button primary" onClick={saveWeight}>Save measurement</button><button className="button secondary" onClick={exportWeights}>Export weights CSV</button></div>{data.body.weights.length > 1 && <div className="weight-chart">{data.body.weights.slice(-12).map(item => <div key={item.date} title={`${item.date}: ${item.weight} kg`} style={{ height: `${Math.max(12, (item.weight - Math.min(...data.body.weights.map(point => point.weight)) + 1) * 18)}px` }} />)}</div>}{data.body.weights.length > 0 && <div className="history-list">{[...data.body.weights].reverse().slice(0, 5).map(item => <div className="history-row" key={item.date}><span><b>{item.weight.toFixed(1)} kg</b><small>{item.date}{item.waist ? ` · ${item.waist.toFixed(1)} cm waist` : ''}</small></span><button className="icon-button small-icon" aria-label="Delete measurement" onClick={() => setData(previous => ({ ...previous, body: { ...previous.body, weights: previous.body.weights.filter(point => point.date !== item.date) } }))}><X size={15} /></button></div>)}</div>}</Panel>
            <Panel><div className="panel-heading"><div><span className="eyebrow">YOUR STARTING POINT</span><h2>Adjust targets</h2></div></div><div className="input-pair"><label>Steps<input type="number" value={data.body.targets.steps} onChange={event => setData(previous => ({ ...previous, body: { ...previous.body, targets: { ...previous.body.targets, steps: Number(event.target.value) } } }))} /></label><label>Protein (g)<input type="number" value={data.body.targets.protein} onChange={event => setData(previous => ({ ...previous, body: { ...previous.body, targets: { ...previous.body.targets, protein: Number(event.target.value) } } }))} /></label></div><label className="field-label">Calories per day<input className="text-input" type="number" value={data.body.targets.calories} onChange={event => setData(previous => ({ ...previous, body: { ...previous.body, targets: { ...previous.body.targets, calories: Number(event.target.value) } } }))} /></label><p className="body-note">Targets are estimates, not medical advice. Change them slowly and check with a qualified professional if you need personalized guidance.</p></Panel>
            <BodyResources />
          </>}

          {tab === 'scale' && <>
            <SectionTitle eyebrow="A PROMISE YOU CHOOSE" title="The Scale." detail="Decide which actions matter most to your days. Commit to the things that genuinely help." />
            <Panel><div className="panel-heading"><div><span className="eyebrow">DAILY WEIGH-IN</span><h2>Your activities</h2></div>{scale.committed && <span className="week-stamp">UNTIL {scale.editAfter}</span>}</div><p className="body-note">Must activities are your non-negotiables. Keep the list short enough to be kind.</p>{scale.items.map(item => <div className="scale-item" key={item.id}><div><b>{item.name}</b><small>{item.type === 'manual' ? 'You check this off' : 'Tracked from your activity'}</small></div><div className="tiers">{(['must', 'should', 'nice'] as const).map(tier => <button key={tier} className={item.tier === tier ? 'active' : ''} disabled={Boolean(scale.committed && today < (scale.editAfter ?? ''))} onClick={() => setTier(item.id, tier)}>{tier}</button>)}</div>{item.type === 'manual' && <button className={`check-row compact-check ${scale.manual[today]?.[item.id] ? 'checked' : ''}`} onClick={() => toggleManual(item.id)}><span className="checkbox">{scale.manual[today]?.[item.id] && <Check size={14} />}</span><span>Done today</span></button>}</div>)}<div className="add-row"><input value={newActivity} onChange={event => setNewActivity(event.target.value)} placeholder="Add an activity" maxLength={60} /><button className="icon-button" aria-label="Add activity" onClick={addActivity}><Plus size={18} /></button></div>{!scale.committed ? <button className="button primary wide" onClick={commitScale}>Commit for seven days <ArrowRight size={16} /></button> : <p className="status-line"><ShieldCheck size={15} /> Your commitment is active. Change rankings after {scale.editAfter}.</p>}</Panel>
            <Panel><div className="panel-heading"><div><span className="eyebrow">MAKE MISSED DAYS USEFUL</span><h2>Your tolls</h2></div><Settings2 size={18} /></div><p className="body-note">Choose a small action now, while you’re calm, for a day when you miss a Must.</p><div className="add-row"><input value={newToll} onChange={event => setNewToll(event.target.value)} placeholder="A task that would help" maxLength={120} /><button className="icon-button" aria-label="Add toll" onClick={() => { if (newToll.trim()) { setData(previous => ({ ...previous, scale: { ...previous.scale, custom: [...((previous.scale.custom as Array<{ id: string; text: string }> | undefined) ?? []), { id: String(Date.now()), text: newToll.trim() }] } })); setNewToll(''); } }}><Plus size={18} /></button></div>{((scale.custom as Array<{ id: string; text: string }> | undefined) ?? []).map(toll => <div className="history-row" key={toll.id}><span>{toll.text}</span><button className="icon-button small-icon" aria-label="Remove toll" onClick={() => setData(previous => ({ ...previous, scale: { ...previous.scale, custom: ((previous.scale.custom as Array<{ id: string; text: string }>) ?? []).filter(item => item.id !== toll.id) } }))}><X size={15} /></button></div>)}</Panel>
            <Panel><div className="panel-heading"><div><span className="eyebrow">WHO HOLDS THE KEY?</span><h2>Choose accountability</h2></div><ShieldCheck size={18} /></div><p className="body-note">Use a trusted partner’s public key, or choose your own tolls. Only their private key can approve a partner-mode unlock.</p><div className="chip-list"><button className={`soft-chip ${(scale.mode ?? 'self') === 'self' ? 'chosen' : ''}`} disabled={Boolean(scale.committed && today < (scale.editAfter ?? ''))} onClick={() => setData(previous => ({ ...previous, scale: { ...previous.scale, mode: 'self' } }))}>I choose my tolls</button><button className={`soft-chip ${scale.mode === 'partner' ? 'chosen' : ''}`} disabled={Boolean(scale.committed && today < (scale.editAfter ?? ''))} onClick={() => setData(previous => ({ ...previous, scale: { ...previous.scale, mode: 'partner' } }))}>My partner holds the key</button></div>{scale.mode === 'partner' && <div className="partner-fields"><label className="field-label">Partner’s name<input className="text-input" value={scale.partner?.name ?? ''} readOnly={Boolean(scale.committed && today < (scale.editAfter ?? ''))} onChange={event => setData(previous => ({ ...previous, scale: { ...previous.scale, partner: { ...(previous.scale.partner as ScaleState['partner']), name: event.target.value } } }))} /></label><label className="field-label">Partner’s phone<input className="text-input" type="tel" value={scale.partner?.phone ?? ''} readOnly={Boolean(scale.committed && today < (scale.editAfter ?? ''))} onChange={event => setData(previous => ({ ...previous, scale: { ...previous.scale, partner: { ...(previous.scale.partner as ScaleState['partner']), phone: event.target.value } } }))} /></label><label className="field-label">Partner’s public code<textarea value={scale.partner?.pub ?? ''} readOnly={Boolean(scale.committed && today < (scale.editAfter ?? ''))} onChange={event => setData(previous => ({ ...previous, scale: { ...previous.scale, partner: { ...(previous.scale.partner as ScaleState['partner']), pub: event.target.value } } }))} placeholder="Paste the code they share from Partner tools" /></label><p className="microcopy">Your partner creates their code on their own device. Their private key never comes to this app.</p></div>}<button className="button secondary" onClick={() => setRoute('partner')}><UserRound size={16} /> Open partner tools</button></Panel>
          </>}

          {tab === 'trail' && <>
            <SectionTitle eyebrow="THE DAYS ADD UP" title="Your story." detail={day > 30 ? 'You reached the cheese. The maze may continue, but you know how to find your own way.' : 'Turn back through the pages. This is not a score. It is the route you made.'} />
            <MazeTrail data={data} profile={profile} day={day} limitFor={limitFor} />
            <div className="metric-grid">
              <div className="metric"><span>DAY STREAK</span><b>{streakCount(data, profile.start, (cheese, activeWeek) => limitFor(cheese, activeWeek))}</b><small>days</small></div>
              <div className="metric"><span>URGES RIDDEN</span><b>{data.urges.filter(item => item.outcome === 'rode').length}</b><small>moments</small></div>
              <div className="metric"><span>STEPS DONE</span><b>{Object.values(data.logs).reduce((total, log) => total + Object.values(log.tasks).filter(Boolean).length, 0)}</b><small>small actions</small></div>
            </div>
            <Storybook data={data} profile={profile} day={day} />
            <Panel><div className="panel-heading"><div><span className="eyebrow">GENTLE REMINDERS</span><h2>Make a little space</h2></div><Bell size={18} /></div><p className="body-note">In-app alerts run while the app is open. Push reminders can arrive when it is closed; calendar reminders work without an account.</p>{(['morning', 'evening', 'night'] as const).map(key => <div className="reminder-row" key={key}><label><input type="checkbox" checked={data.remind.enabled[key] ?? false} onChange={event => setData(previous => ({ ...previous, remind: { ...previous.remind, enabled: { ...previous.remind.enabled, [key]: event.target.checked } } }))} /><span>{key === 'morning' ? 'Morning intention' : key === 'evening' ? 'Evening check-in' : 'Wind-down'}</span></label><input type="time" aria-label={`${key} reminder time`} value={data.remind.times[key] ?? '08:00'} onChange={event => setData(previous => ({ ...previous, remind: { ...previous.remind, times: { ...previous.remind.times, [key]: event.target.value } } }))} /></div>)}<div className="button-row"><button className="button secondary" onClick={downloadICS}>Add to calendar</button><button className="button secondary" onClick={() => void toggleInAppReminders()}>{data.remind.on ? 'Turn off in-app alerts' : 'Turn on in-app alerts'}</button><button className="button primary" onClick={() => void enablePush()}><Bell size={16} /> Enable push</button></div>{reminderStatus && <p className="status-line">{reminderStatus}</p>}</Panel>
            <Panel><div className="panel-heading"><div><span className="eyebrow">YOUR ACCOUNT</span><h2>{user ? user.email ?? 'Google account connected' : 'Keep your progress with you'}</h2></div>{user ? <Cloud size={18} /> : <ShieldCheck size={18} />}</div><p className="body-note">{user ? 'Your journal and progress are synced privately to your account. This device also keeps a local copy.' : 'Sign in with Google to sync privately across your devices. Without sign-in, your data stays on this device.'}</p>{supabase ? user ? <><p className="status-line">{syncMessage || 'Cloud sync is ready.'}</p><button className="button secondary" onClick={() => void signOut()}>Sign out</button></> : <><button className="button primary" onClick={() => void signIn()}>Continue with Google</button><p className="microcopy">The app stores records in Supabase, not Google Drive. Only your account can read them when row-level security is configured as documented.</p></> : <p className="status-line">Add Supabase environment values to enable secure cloud sync.</p>}</Panel>
            <Panel><div className="panel-heading"><div><span className="eyebrow">BACKUP & APPEARANCE</span><h2>Take your data with you</h2></div><Settings2 size={18} /></div><div className="button-row"><button className="button secondary" onClick={saveBackup}><ArrowDownToLine size={16} /> Export JSON</button><label className="button secondary upload-button"><Upload size={16} /> Import JSON<input type="file" accept="application/json,.json" onChange={importBackup} hidden /></label></div><div className="theme-choice"><span>Appearance</span><div><button className={theme === 'light' ? 'selected' : ''} onClick={() => setTheme('light')}><Sun size={15} /> Light</button><button className={theme === 'dark' ? 'selected' : ''} onClick={() => setTheme('dark')}><Moon size={15} /> Dark</button></div></div><p className="microcopy">Your private writing and body records are sensitive. Export an encrypted device backup only to a place you control.</p></Panel>
          </>}
        </main>
        <nav className="tab-bar" aria-label="Main navigation">{TABS.map(item => { const Icon = item.icon; return <button className={tab === item.id ? 'active' : ''} key={item.id} onClick={() => nav(item.id)} aria-current={tab === item.id ? 'page' : undefined}><Icon size={20} strokeWidth={tab === item.id ? 2.3 : 1.8} /><span>{item.label}</span></button>; })}</nav>
      </>}
      {toast && <div className="toast" role="status"><span>{toast}</span><button className="icon-button small-icon" aria-label="Dismiss message" onClick={() => setToast('')}><X size={15} /></button></div>}
    </div>
  </div>;
}

function streakCount(data: AppData, start: string, getLimit: (cheese: CheeseKey, week: number) => number) {
  const currentDay = dayNumber(start);
  let count = 0;
  for (let day = Math.min(currentDay, 30); day >= 1; day -= 1) {
    const log = data.logs[dateAt(start, day)];
    if (!log?.touched && day === currentDay) continue;
    if (!log?.touched || (data.profile?.cheeses ?? []).some(key => (log.usage[key] ?? 0) > getLimit(key, Math.min(3, Math.floor((day - 1) / 7))))) break;
    count += 1;
  }
  return count;
}

function decodeKey(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}

function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}

function mergeData(local: AppData, remote: AppData): AppData {
  const combineById = <T extends { id?: string; ts?: number; date?: string; text?: string }>(left: T[], right: T[]) => {
    const values = new Map<string, T>();
    for (const item of [...left, ...right]) {
      const key = String(item.id ?? item.ts ?? item.date ?? item.text ?? JSON.stringify(item));
      values.set(key, item);
    }
    return [...values.values()];
  };
  const localScale = local.scale as ScaleState;
  const remoteScale = remote.scale as ScaleState;
  const localWinsCommitment = Boolean(localScale.committed && (!remoteScale.committed || (localScale.editAfter ?? '') > (remoteScale.editAfter ?? '')));
  const primaryScale = localWinsCommitment ? localScale : remoteScale;
  return normalizeData({
    ...local,
    ...remote,
    profile: remote.profile ?? local.profile,
    logs: { ...local.logs, ...remote.logs },
    urges: combineById(local.urges, remote.urges).sort((a, b) => b.ts - a.ts),
    journal: combineById(local.journal, remote.journal).sort((a, b) => b.ts - a.ts),
    body: {
      ...local.body,
      ...remote.body,
      weights: combineById(local.body.weights, remote.body.weights).sort((a, b) => a.date.localeCompare(b.date)),
      days: Object.fromEntries([...new Set([...Object.keys(local.body.days), ...Object.keys(remote.body.days)])].map(date => [date, { ...local.body.days[date], ...remote.body.days[date] }])),
      targets: { ...local.body.targets, ...remote.body.targets },
    },
    remind: {
      ...local.remind,
      ...remote.remind,
      enabled: { ...local.remind.enabled, ...remote.remind.enabled },
      times: { ...local.remind.times, ...remote.remind.times },
      last: { ...local.remind.last, ...remote.remind.last },
    },
    scale: {
      ...local.scale,
      ...remote.scale,
      ...primaryScale,
      committed: Boolean(localScale.committed || remoteScale.committed),
      items: combineById(localScale.items ?? [], remoteScale.items ?? []),
      pending: combineById(localScale.pending ?? [], remoteScale.pending ?? []),
      paid: combineById((localScale.paid ?? []) as Array<{ id?: string; ts?: number; text?: string }>, (remoteScale.paid ?? []) as Array<{ id?: string; ts?: number; text?: string }>),
      manual: { ...localScale.manual, ...remoteScale.manual },
      history: { ...localScale.history, ...remoteScale.history },
      custom: combineById((localScale.custom ?? []) as Array<{ id?: string; text?: string }>, (remoteScale.custom ?? []) as Array<{ id?: string; text?: string }>),
    },
  });
}

function createChallenge() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const value = Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
  return `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}`;
}

function loadTheme(): 'light' | 'dark' {
  try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
}