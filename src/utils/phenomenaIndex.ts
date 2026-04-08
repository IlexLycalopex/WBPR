import { getCollection } from 'astro:content';

export interface PhenomenonEntry {
  sessionNumber: number;
  sessionSlug: string;
  station: string;
  date: string;
  status: string;
  confidence: string;
  notes: string;
  locations: string[];
  tags: string[];
}

export interface PhenomenonRecord {
  key: string;
  name: string;
  entries: PhenomenonEntry[];
  latestStatus: string;
  latestConfidence: string;
  allLocations: string[];
  allTags: string[];
}

export async function buildPhenomenaIndex(): Promise<Map<string, PhenomenonRecord>> {
  const sessions = await getCollection('sessions');
  const index = new Map<string, PhenomenonRecord>();

  // Sort sessions by date ascending so entries are chronological
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.data.date).getTime() - new Date(b.data.date).getTime()
  );

  for (const session of sorted) {
    for (const p of session.data.phenomena_log) {
      const entry: PhenomenonEntry = {
        sessionNumber: session.data.session,
        sessionSlug: session.id.replace(/\.md$/, ''),
        station: session.data.station,
        date: session.data.date,
        status: p.status,
        confidence: p.confidence,
        notes: p.notes,
        locations: p.locations,
        tags: p.tags,
      };

      if (!index.has(p.key)) {
        index.set(p.key, {
          key: p.key,
          name: p.name,
          entries: [],
          latestStatus: p.status,
          latestConfidence: p.confidence,
          allLocations: [],
          allTags: [],
        });
      }

      const record = index.get(p.key)!;
      record.entries.push(entry);
      record.latestStatus = p.status; // last session wins
      record.latestConfidence = p.confidence;

      for (const loc of p.locations) {
        if (!record.allLocations.includes(loc)) record.allLocations.push(loc);
      }
      for (const tag of p.tags) {
        if (!record.allTags.includes(tag)) record.allTags.push(tag);
      }
    }
  }

  return index;
}
