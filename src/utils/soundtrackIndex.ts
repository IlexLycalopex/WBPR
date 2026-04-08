import { getCollection } from 'astro:content';

export interface TrackAppearance {
  sessionNumber: number;
  sessionSlug: string;
  station: string;
  date: string;
  blockTime: string;
  phenomenonRef: string;
  notes: string;
}

export interface TrackRecord {
  title: string;
  artist: string;
  artistSlug: string;
  appearances: TrackAppearance[];
  urls: string[];
  sources: string[];
}

export interface ArtistRecord {
  name: string;
  slug: string;
  tracks: TrackRecord[];
  totalAppearances: number;
  sessionSlugs: string[];
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function buildSoundtrackIndex(): Promise<Map<string, ArtistRecord>> {
  const sessions = await getCollection('sessions');
  const artistIndex = new Map<string, ArtistRecord>();

  const sorted = [...sessions].sort(
    (a, b) => new Date(a.data.date).getTime() - new Date(b.data.date).getTime()
  );

  for (const session of sorted) {
    for (const block of session.data.blocks) {
      for (const track of block.playlist) {
        const artistSlug = slugify(track.artist);

        if (!artistIndex.has(artistSlug)) {
          artistIndex.set(artistSlug, {
            name: track.artist,
            slug: artistSlug,
            tracks: [],
            totalAppearances: 0,
            sessionSlugs: [],
          });
        }

        const artist = artistIndex.get(artistSlug)!;

        let trackRecord = artist.tracks.find(
          t => t.title.toLowerCase() === track.title.toLowerCase()
        );

        if (!trackRecord) {
          trackRecord = {
            title: track.title,
            artist: track.artist,
            artistSlug,
            appearances: [],
            urls: [],
            sources: [],
          };
          artist.tracks.push(trackRecord);
        }

        trackRecord.appearances.push({
          sessionNumber: session.data.session,
          sessionSlug: session.id.replace(/\.md$/, ''),
          station: session.data.station,
          date: session.data.date,
          blockTime: block.time,
          phenomenonRef: block.phenomenon_ref,
          notes: track.notes,
        });

        if (track.url && !trackRecord.urls.includes(track.url)) {
          trackRecord.urls.push(track.url);
        }
        if (track.source && !trackRecord.sources.includes(track.source)) {
          trackRecord.sources.push(track.source);
        }

        artist.totalAppearances++;

        if (!artist.sessionSlugs.includes(session.slug)) {
          artist.sessionSlugs.push(session.slug);
        }
      }
    }
  }

  return artistIndex;
}
