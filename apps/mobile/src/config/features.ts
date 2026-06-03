// Build-time feature flags.

// Strava is fully built but its production API is quota-capped (new apps are
// limited to 1 connected athlete). Until the quota increase lands we ship
// Apple-Health-only and hide every Strava connect surface. Flip to true to
// re-enable. Typed as boolean so gated branches don't narrow to `never`.
export const STRAVA_ENABLED: boolean = false;
