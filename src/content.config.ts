import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const promptSchema = z.object({
  card: z.string(),
  tone: z.string(),
});

const trackSchema = z.object({
  title: z.string(),
  artist: z.string(),
  url: z.string().optional().default(''),
  source: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

const blockSchema = z.object({
  time: z.string(),
  prompts: z.array(promptSchema).optional().default([]),
  playlist: z.array(trackSchema).optional().default([]),
  caller_type: z.enum(['none', 'standard', 'phenomenon', 'emergency']).optional().default('none'),
  caller_card: z.string().optional().default(''),
  caller_card_meaning: z.string().optional().default(''),
  phenomenon_ref: z.string().optional().default(''),
});

const phenomenonSchema = z.object({
  key: z.string(),
  name: z.string(),
  status: z.enum(['New', 'Active', 'Escalating', 'Resolved', 'Dormant']),
  confidence: z.enum(['Unconfirmed', 'Likely', 'Confirmed']),
  locations: z.array(z.string()).optional().default([]),
  notes: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
});

const statsSchema = z.object({
  blocks_completed: z.number(),
  total_callers: z.number(),
  phenomenon_callers: z.number(),
  standard_callers: z.number(),
  calls_resolved: z.number(),
  calls_unresolved: z.number(),
  dawn_colour: z.string().optional().default(''),
  veil_at_close: z.string().optional().default(''),
});

const sessions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sessions' }),
  schema: z.object({
    session: z.number(),
    station: z.string(),
    call_sign: z.string(),
    location: z.string(),
    coordinates: z.tuple([z.number(), z.number()]).optional(),
    date: z.string(),
    start_time: z.string(),
    end_time: z.string(),
    duration_minutes: z.number(),
    atmospheric_conditions: z.string().optional().default(''),
    veil_status: z.string(),
    veil_intensity: z.number().min(1).max(10),
    callers: z.number().default(0),
    blocks: z.array(blockSchema).optional().default([]),
    phenomena_log: z.array(phenomenonSchema).optional().default([]),
    session_stats: statsSchema.optional(),
    tags: z.array(z.string()).optional().default([]),
    aliases: z.array(z.string()).optional().default([]),
    related_sessions: z.array(z.number()).optional().default([]),
  }),
});

export const collections = { sessions };
