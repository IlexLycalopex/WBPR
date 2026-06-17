// Full session document model — used by the /editor page to read and
// write WBPR session files that conform to src/content.config.ts.
import yaml from 'js-yaml';

export interface PromptDoc {
  card: string;
  tone: string;
}

export interface TrackDoc {
  title: string;
  artist: string;
  url: string;
  source: string;
}

export interface BlockDoc {
  time: string;
  prompts: PromptDoc[];
  playlist: TrackDoc[];
  caller_type: 'none' | 'standard' | 'phenomenon' | 'emergency';
  caller_card: string;
  caller_card_meaning: string;
  phenomenon_ref: string;
  caller_location: string;
  caller_location_confidence: 'precise' | 'approximate' | 'accent-only' | 'unknown';
  caller_coords?: [number, number];
  narrative: string;
}

export interface PhenomenonDoc {
  key: string;
  name: string;
  status: 'New' | 'Active' | 'Stable' | 'Escalating' | 'Resolved' | 'Dormant';
  confidence: 'Unconfirmed' | 'Likely' | 'Confirmed';
  locations: string[];
  coords?: [number, number];
  notes: string;
  tags: string[];
}

export interface SessionStatsDoc {
  blocks_completed: number;
  total_callers: number;
  phenomenon_callers: number;
  standard_callers: number;
  calls_resolved: number;
  calls_unresolved: number;
  dawn_colour: string;
  veil_at_close: string;
}

export interface SessionDoc {
  session: number;
  station: string;
  call_sign: string;
  location: string;
  coordinates?: [number, number];
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  atmospheric_conditions: string;
  veil_status: string;
  veil_intensity: number;
  callers: number;
  blocks: BlockDoc[];
  phenomena_log: PhenomenonDoc[];
  session_stats: SessionStatsDoc;
  tags: string[];
  aliases: string[];
  related_sessions: number[];
  notesTitle: string;
  notesBody: string;
}

export function emptyTrack(): TrackDoc {
  return { title: '', artist: '', url: '', source: '' };
}

export function emptyPrompt(): PromptDoc {
  return { card: '', tone: '' };
}

export function emptyBlock(time = ''): BlockDoc {
  return {
    time,
    prompts: [emptyPrompt(), emptyPrompt(), emptyPrompt()],
    playlist: [emptyTrack(), emptyTrack(), emptyTrack()],
    caller_type: 'none',
    caller_card: '',
    caller_card_meaning: '',
    phenomenon_ref: '',
    caller_location: '',
    caller_location_confidence: 'unknown',
    narrative: '',
  };
}

export function emptyPhenomenon(): PhenomenonDoc {
  return {
    key: '',
    name: '',
    status: 'New',
    confidence: 'Unconfirmed',
    locations: [],
    notes: '',
    tags: [],
  };
}

export function defaultSession(): SessionDoc {
  return {
    session: 1,
    station: 'WBPR',
    call_sign: 'Oso Sur',
    location: 'Montana Fire Lookout, ~7,200ft',
    date: new Date().toISOString().slice(0, 10),
    start_time: '23:00',
    end_time: '02:00',
    duration_minutes: 180,
    atmospheric_conditions: '',
    veil_status: 'Normal',
    veil_intensity: 3,
    callers: 0,
    blocks: [emptyBlock(), emptyBlock(), emptyBlock(), emptyBlock()],
    phenomena_log: [],
    session_stats: {
      blocks_completed: 0,
      total_callers: 0,
      phenomenon_callers: 0,
      standard_callers: 0,
      calls_resolved: 0,
      calls_unresolved: 0,
      dawn_colour: '',
      veil_at_close: '',
    },
    tags: ['broadcast', 'void1680am', 'wbpr'],
    aliases: [],
    related_sessions: [],
    notesTitle: 'Oso Sur — Personal Notes',
    notesBody: '',
  };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48);
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : v == null ? fallback : String(v);
}
function asNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function asCoords(v: unknown): [number, number] | undefined {
  if (Array.isArray(v) && v.length === 2) return [Number(v[0]), Number(v[1])];
  return undefined;
}

// --- Parsing ---

export function parseSessionMarkdown(text: string): SessionDoc {
  const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const doc = defaultSession();
  if (!fmMatch) {
    doc.notesBody = text.trim();
    return doc;
  }

  const [, frontmatterRaw, body] = fmMatch;
  const fm = (yaml.load(frontmatterRaw) ?? {}) as Record<string, any>;

  doc.session = asNumber(fm.session, 1);
  doc.station = asString(fm.station, 'WBPR');
  doc.call_sign = asString(fm.call_sign, 'Oso Sur');
  doc.location = asString(fm.location);
  doc.coordinates = asCoords(fm.coordinates);
  doc.date = asString(fm.date, doc.date);
  doc.start_time = asString(fm.start_time, '23:00');
  doc.end_time = asString(fm.end_time, '');
  doc.duration_minutes = asNumber(fm.duration_minutes, 0);
  doc.atmospheric_conditions = asString(fm.atmospheric_conditions);
  doc.veil_status = asString(fm.veil_status, 'Normal');
  doc.veil_intensity = asNumber(fm.veil_intensity, 3);
  doc.callers = asNumber(fm.callers, 0);

  doc.blocks = asArray(fm.blocks).map((raw) => {
    const b = (raw ?? {}) as Record<string, any>;
    const prompts = asArray(b.prompts).map((p) => ({
      card: asString((p as any)?.card),
      tone: asString((p as any)?.tone),
    }));
    while (prompts.length < 3) prompts.push(emptyPrompt());
    const playlist = asArray(b.playlist).map((t) => ({
      title: asString((t as any)?.title),
      artist: asString((t as any)?.artist),
      url: asString((t as any)?.url),
      source: asString((t as any)?.source),
    }));
    while (playlist.length < 3) playlist.push(emptyTrack());
    const callerType = ['none', 'standard', 'phenomenon', 'emergency'].includes(b.caller_type)
      ? b.caller_type
      : 'none';
    const locConfidence = ['precise', 'approximate', 'accent-only', 'unknown'].includes(b.caller_location_confidence)
      ? b.caller_location_confidence
      : 'unknown';
    return {
      time: asString(b.time),
      prompts,
      playlist,
      caller_type: callerType,
      caller_card: asString(b.caller_card),
      caller_card_meaning: asString(b.caller_card_meaning),
      phenomenon_ref: asString(b.phenomenon_ref),
      caller_location: asString(b.caller_location),
      caller_location_confidence: locConfidence,
      caller_coords: asCoords(b.caller_coords),
      narrative: '',
    } as BlockDoc;
  });
  if (doc.blocks.length === 0) doc.blocks = [emptyBlock()];

  doc.phenomena_log = asArray(fm.phenomena_log).map((raw) => {
    const p = (raw ?? {}) as Record<string, any>;
    const status = ['New', 'Active', 'Stable', 'Escalating', 'Resolved', 'Dormant'].includes(p.status)
      ? p.status
      : 'New';
    const confidence = ['Unconfirmed', 'Likely', 'Confirmed'].includes(p.confidence)
      ? p.confidence
      : 'Unconfirmed';
    return {
      key: asString(p.key),
      name: asString(p.name),
      status,
      confidence,
      locations: asArray(p.locations).map((l) => asString(l)),
      coords: asCoords(p.coords),
      notes: asString(p.notes),
      tags: asArray(p.tags).map((t) => asString(t)),
    } as PhenomenonDoc;
  });

  const stats = (fm.session_stats ?? {}) as Record<string, any>;
  doc.session_stats = {
    blocks_completed: asNumber(stats.blocks_completed, doc.blocks.length),
    total_callers: asNumber(stats.total_callers, 0),
    phenomenon_callers: asNumber(stats.phenomenon_callers, 0),
    standard_callers: asNumber(stats.standard_callers, 0),
    calls_resolved: asNumber(stats.calls_resolved, 0),
    calls_unresolved: asNumber(stats.calls_unresolved, 0),
    dawn_colour: asString(stats.dawn_colour),
    veil_at_close: asString(stats.veil_at_close),
  };

  doc.tags = asArray(fm.tags).map((t) => asString(t));
  doc.aliases = asArray(fm.aliases).map((t) => asString(t));
  doc.related_sessions = asArray(fm.related_sessions).map((n) => asNumber(n));

  // --- Body: split into "## Block N — time" sections + a personal-notes section ---
  const sectionRegex = /^## (.+)$/gm;
  const headers: { title: string; start: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = sectionRegex.exec(body)) !== null) {
    headers.push({ title: m[1].trim(), start: m.index + m[0].length });
  }

  let blockCursor = 0;
  headers.forEach((h, i) => {
    const end = i + 1 < headers.length ? headers[i + 1].start - `## ${headers[i + 1].title}`.length - 1 : body.length;
    let sectionText = body.slice(h.start, end).trim();
    // strip trailing "---" separator
    sectionText = sectionText.replace(/\n?---\s*$/, '').trim();

    if (/^Block\s+\d+/i.test(h.title)) {
      // strip auto-derivable lines (Caller / Caller card) — these are regenerated on export
      const lines = sectionText.split('\n');
      let cut = 0;
      while (cut < lines.length && (/^\*\*Caller:/.test(lines[cut]) || /^\*\*Caller card:/.test(lines[cut]) || lines[cut].trim() === '')) {
        cut++;
      }
      const narrative = lines.slice(cut).join('\n').trim();
      if (doc.blocks[blockCursor]) {
        doc.blocks[blockCursor].narrative = narrative;
      }
      blockCursor++;
    } else if (/personal notes/i.test(h.title)) {
      doc.notesTitle = h.title;
      doc.notesBody = sectionText;
    }
  });

  return doc;
}

// --- Serialization ---

function yamlScalar(v: string): string {
  if (v === '') return '""';
  return JSON.stringify(v);
}

function indentBlock(lines: string[], spaces: number): string[] {
  const pad = ' '.repeat(spaces);
  return lines.map((l) => (l ? pad + l : l));
}

function serializeStringList(key: string, items: string[], indent = 0): string[] {
  const pad = ' '.repeat(indent);
  if (items.length === 0) return [`${pad}${key}: []`];
  return [`${pad}${key}:`, ...items.map((i) => `${pad}  - ${yamlScalar(i)}`)];
}

export function buildFrontmatter(doc: SessionDoc): string {
  const lines: string[] = [];
  lines.push(`session: ${doc.session}`);
  lines.push(`station: ${doc.station}`);
  lines.push(`call_sign: ${doc.call_sign}`);
  lines.push(`location: ${yamlScalar(doc.location)}`);
  if (doc.coordinates) lines.push(`coordinates: [${doc.coordinates[0]}, ${doc.coordinates[1]}]`);
  lines.push(`date: ${yamlScalar(doc.date)}`);
  lines.push(`start_time: ${yamlScalar(doc.start_time)}`);
  lines.push(`end_time: ${yamlScalar(doc.end_time)}`);
  lines.push(`duration_minutes: ${doc.duration_minutes}`);
  lines.push(`atmospheric_conditions: ${yamlScalar(doc.atmospheric_conditions)}`);
  lines.push(`veil_status: ${doc.veil_status}`);
  lines.push(`veil_intensity: ${doc.veil_intensity}`);
  lines.push(`callers: ${doc.callers}`);
  lines.push('');

  lines.push('blocks:');
  doc.blocks.forEach((b) => {
    lines.push(`  - time: ${yamlScalar(b.time)}`);
    lines.push('    prompts:');
    b.prompts.forEach((p) => {
      lines.push(`      - card: ${yamlScalar(p.card)}`);
      lines.push(`        tone: ${yamlScalar(p.tone)}`);
    });
    lines.push('    playlist:');
    b.playlist.forEach((t) => {
      lines.push(`      - title: ${yamlScalar(t.title)}`);
      lines.push(`        artist: ${yamlScalar(t.artist)}`);
      lines.push(`        url: ${yamlScalar(t.url)}`);
      lines.push(`        source: ${yamlScalar(t.source)}`);
    });
    lines.push(`    caller_type: ${b.caller_type}`);
    lines.push(`    caller_card: ${yamlScalar(b.caller_card)}`);
    lines.push(`    caller_card_meaning: ${yamlScalar(b.caller_card_meaning)}`);
    lines.push(`    phenomenon_ref: ${yamlScalar(b.phenomenon_ref)}`);
    lines.push(`    caller_location: ${yamlScalar(b.caller_location)}`);
    if (b.caller_coords) lines.push(`    caller_coords: [${b.caller_coords[0]}, ${b.caller_coords[1]}]`);
    lines.push(`    caller_location_confidence: ${b.caller_location_confidence}`);
  });
  lines.push('');

  if (doc.phenomena_log.length === 0) {
    lines.push('phenomena_log: []');
  } else {
    lines.push('phenomena_log:');
    doc.phenomena_log.forEach((p) => {
      lines.push(`  - key: ${p.key}`);
      lines.push(`    name: ${yamlScalar(p.name)}`);
      lines.push(`    status: ${p.status}`);
      lines.push(`    confidence: ${p.confidence}`);
      lines.push(...indentBlock(serializeStringList('locations', p.locations), 4));
      if (p.coords) lines.push(`    coords: [${p.coords[0]}, ${p.coords[1]}]`);
      lines.push(`    notes: ${yamlScalar(p.notes)}`);
      lines.push(...indentBlock(serializeStringList('tags', p.tags), 4));
    });
  }
  lines.push('');

  lines.push('session_stats:');
  lines.push(`  blocks_completed: ${doc.session_stats.blocks_completed}`);
  lines.push(`  total_callers: ${doc.session_stats.total_callers}`);
  lines.push(`  phenomenon_callers: ${doc.session_stats.phenomenon_callers}`);
  lines.push(`  standard_callers: ${doc.session_stats.standard_callers}`);
  lines.push(`  calls_resolved: ${doc.session_stats.calls_resolved}`);
  lines.push(`  calls_unresolved: ${doc.session_stats.calls_unresolved}`);
  lines.push(`  dawn_colour: ${yamlScalar(doc.session_stats.dawn_colour)}`);
  lines.push(`  veil_at_close: ${yamlScalar(doc.session_stats.veil_at_close)}`);
  lines.push('');

  lines.push(...serializeStringList('tags', doc.tags));
  lines.push('');
  lines.push(...serializeStringList('aliases', doc.aliases));
  lines.push('');
  lines.push(`related_sessions: [${doc.related_sessions.join(', ')}]`);

  return lines.join('\n');
}

export function buildBody(doc: SessionDoc): string {
  const lines: string[] = [];
  doc.blocks.forEach((b, i) => {
    lines.push(`## Block ${i + 1} — ${b.time}`);
    lines.push('');
    if (b.caller_type === 'none') {
      lines.push('**Caller:** No');
    } else {
      lines.push(`**Caller:** Yes (${b.caller_card} — ${b.caller_type})`);
      lines.push(`**Caller card:** ${b.caller_card} — *${b.caller_card_meaning}*`);
    }
    lines.push('');
    lines.push(b.narrative.trim() || 'TODO — write this call.');
    lines.push('');
    lines.push('---');
    lines.push('');
  });
  lines.push(`## ${doc.notesTitle}`);
  lines.push('');
  lines.push(doc.notesBody.trim() || 'TODO — closing reflections.');
  lines.push('');
  return lines.join('\n');
}

export function buildSessionMarkdown(doc: SessionDoc): string {
  return `---\n${buildFrontmatter(doc)}\n---\n\n${buildBody(doc)}`;
}

export function recalcStatsFromBlocks(doc: SessionDoc): void {
  const callerBlocks = doc.blocks.filter((b) => b.caller_type !== 'none');
  doc.callers = callerBlocks.length;
  doc.session_stats.blocks_completed = doc.blocks.length;
  doc.session_stats.total_callers = callerBlocks.length;
  doc.session_stats.phenomenon_callers = callerBlocks.filter((b) => b.caller_type === 'phenomenon').length;
  doc.session_stats.standard_callers = callerBlocks.filter(
    (b) => b.caller_type === 'standard' || b.caller_type === 'emergency'
  ).length;
}
