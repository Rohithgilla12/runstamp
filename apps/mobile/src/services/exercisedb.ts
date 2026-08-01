import { z } from 'zod';
import { apiGet } from './api';
import { parseOrWarn } from '../lib/validate';

// Enriched exercise data from AscendAPI's ExerciseDB, proxied by our backend
// (the RapidAPI key stays server-side). All the rich fields are optional so a
// partial upstream object still parses.
export const AscendExerciseSchema = z.object({
  exerciseId: z.string(),
  name: z.string(),
  imageUrl: z.string().optional().default(''),
  videoUrl: z.string().optional().default(''),
  bodyParts: z.array(z.string()).optional().default([]),
  targetMuscles: z.array(z.string()).optional().default([]),
  secondaryMuscles: z.array(z.string()).optional().default([]),
  equipments: z.array(z.string()).optional().default([]),
  exerciseType: z.string().optional().default(''),
  overview: z.string().optional().default(''),
  instructions: z.array(z.string()).optional().default([]),
  exerciseTips: z.array(z.string()).optional().default([]),
});

export type AscendExercise = z.infer<typeof AscendExerciseSchema>;

// Resolve a bundled routine move (keyed by name, e.g. "Dead bug") to the full
// AscendAPI object. Returns null when the feature is unconfigured (503) or no
// match is found (404) — callers fall back to the bundled dataset rather than
// surfacing an error.
export async function findExerciseByName(
  name: string,
  idToken: string | null,
): Promise<AscendExercise | null> {
  try {
    const raw = await apiGet<unknown>(`/v1/exercises/find?name=${encodeURIComponent(name)}`, {
      idToken,
    });
    return parseOrWarn(AscendExerciseSchema, raw, 'GET /v1/exercises/find');
  } catch {
    // 404 (no match) / 503 (no key) / offline — degrade quietly.
    return null;
  }
}
