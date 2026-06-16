import { z } from 'zod';
import { apiGet } from './api';
import { parseOrWarn } from '../lib/validate';

const PolylineSchema = z.array(z.tuple([z.number(), z.number()]));

export const CityCoverageSchema = z.object({
  city: z.string(),
  pct: z.number(),
  coveredKm: z.number(),
  hullKm: z.number(),
  uniqueStreets: z.number(),
  covered: z.array(PolylineSchema),
  uncovered: z.array(PolylineSchema),
});

export type CityCoverage = z.infer<typeof CityCoverageSchema>;

export async function getCityCoverage(city: string, idToken: string | null): Promise<CityCoverage> {
  const raw = await apiGet<unknown>(`/v1/coverage/${encodeURIComponent(city)}`, { idToken });
  return parseOrWarn(CityCoverageSchema, raw, 'GET /v1/coverage/:city');
}
