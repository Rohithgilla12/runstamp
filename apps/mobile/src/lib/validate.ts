import type { z } from 'zod';

// Validate an API response against its schema. On mismatch, warn loudly and
// return the data as-is (warn-not-crash) so backend drift surfaces in dev/
// TestFlight without bricking the app.
export function parseOrWarn<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    // eslint-disable-next-line no-console
    console.warn(`[runstamp] ${label} failed validation:`, result.error.issues);
    return data as T;
  }
  return result.data;
}
