# Stamp Catalog Expansion — Regional flagships

**Status:** Spec for catalog + architecture expansion. Designer agent picks up illustration work after sign-off.
**Author:** /impeccable, 2026-05-16
**Owns:** `apps/api/internal/stamps/catalog.go` additions, new evaluator rule kind, illustration deliverables.

---

## Why

The current catalog has 16 stamps. Exactly **one** is geographically specific — `boston_q` (Boston qualifier). Every other earnable is sport-physics: distances, times, cumulative km, city counts. That makes a catalog that whispers "American running culture" without realizing it.

Indian runners — and the rest of the world — earn their stripes at different finish lines. Mumbai Marathon is to Indian runners what Boston is to East Coast US runners. Ladakh Marathon is the altitude bucket-list run nobody on r/AdvancedRunning will shut up about. The catalog should know these.

This doc proposes:

1. A new `event` stamp category for named-race finishers.
2. A new evaluator rule kind `named_event` that matches activities by title + distance + country.
3. **Seven India-centric stamps** as the first regional flagship set, with per-stamp illustrations rooted in Indian architectural iconography.
4. A path to extend with World Marathon Majors (Boston, NY, London, Berlin, Chicago, Tokyo), Comrades, UTMB, etc. as later batches — the architecture supports them cleanly.

---

## The architecture change

### New rule kind: `named_event`

```json
{
  "kind": "named_event",
  "sport": "run",
  "distance_m_gte": 42000,
  "distance_m_lte": 43000,
  "title_patterns": ["mumbai marathon", "tata mumbai", " tmm "],
  "country_iso": "IN"
}
```

Match logic (executed in `internal/stamps/evaluator.go` next to the existing `single_activity` branch):

- `sport` must match (always `"run"` in v0).
- Distance must fall within `[distance_m_gte, distance_m_lte]`. The wider band (vs. pace stamps' 500m tolerance) accommodates real-race GPS drift and the way users rename runs after the fact.
- Activity title, **lowercased**, must contain **any** pattern. Patterns are case-insensitive substring matches. Wrap acronyms with spaces (`" tmm "`) to avoid false hits like "stmme" (unlikely but cheap insurance).
- If `country_iso` is set, the activity's geocoded country (from `activities.country_code`) must match. Skipped if the activity has no country (the title match alone is the next-best signal).
- Idempotent: same `ON CONFLICT DO NOTHING` insert as the existing rules.

### Auto-detect via title + manual fallback

The evaluator runs on every Strava webhook / HealthKit sync. Strava activities imported from a race usually carry the official name in the title — `Tata Mumbai Marathon 2026`, `Vedanta Delhi Half Marathon`, etc. — so auto-detect handles the happy path.

For users who renamed their run before sync (`"Sunday long run"` instead of `"Mumbai Marathon"`), the existing **long-press-to-rename** affordance on ActivityScreen lets them set the canonical title, which triggers re-evaluation on next stamp re-eval (Settings → Connections → "Re-eval stamps").

A "Tag this run as…" UI affordance can come later; manual rename is enough for v0.

### Why title-matching over GPS-geofencing

Geofencing would be the rigorous detection: did the activity start/end inside the official course polygon, on the race date? But:

- Race-course polygons change yearly; maintaining them is brittle and high-effort.
- Strava already does this kind of detection (Live Segments) and most users don't earn segment achievements when running unofficially.
- Title patterns + distance + country gives ~95% precision with ~5% manual cleanup, vs. ~99% precision with a 50× engineering cost.

A future v2 can add geofencing for "verified" stamps if it ever matters. v0 is title heuristics.

---

## The first seven (India)

Sorted by tier. SortOrder values start at 200 to leave room for global stamps in the 100s.

### Common

#### `monsoon_run` · Common · event

A 15K+ run logged during monsoon months (June–September) with the activity location in India. Doesn't require named events — it's the badge of "you went out anyway when the city was underwater."

```json
{
  "kind": "monsoon_run",
  "sport": "run",
  "distance_m_gte": 15000,
  "months": [6, 7, 8, 9],
  "country_iso": "IN"
}
```

Requires a new rule kind `monsoon_run` (or generalised `single_activity` with optional `months` + `country_iso` fields — slightly cleaner; pick during implementation). Designer: illustration is a **banyan tree silhouette with dripping leaves**, the drips drawn as halftone dot trails. A clear "South Indian monsoon" reading that doesn't lean on umbrella clichés.

- **Denomination:** `15` / `KM` / `MONSOON`
- **SortOrder:** 200

#### `indian_metros_3` · Common · place

Run in three of India's eight metro cities (Mumbai, Delhi, Bengaluru, Chennai, Kolkata, Hyderabad, Ahmedabad, Pune).

```json
{
  "kind": "named_cities_count",
  "city_set": ["Mumbai", "Delhi", "New Delhi", "Bengaluru", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Ahmedabad", "Pune"],
  "cities_gte": 3,
  "country_iso": "IN"
}
```

New rule kind `named_cities_count`: cities-count, but only counting cities in the supplied set. Implementation reuses the places-table join.

- **Denomination:** `3` / `METROS`
- **Illustration:** A horizontal frieze of three landmark silhouettes — Gateway of India + Charminar + Vidhana Soudha — drawn as line art across the bottom third. Reuses landmark assets from the per-event stamps below (designer designs the friezes as combinations of the per-event SVG illustrations).
- **SortOrder:** 210

### Rare — flagship race finishers

#### `tata_mumbai_marathon` · Rare · event

The biggest marathon in India and the AIMS Gold-label flagship. Run on the third Sunday of January.

```json
{
  "kind": "named_event",
  "sport": "run",
  "distance_m_gte": 42000,
  "distance_m_lte": 43000,
  "title_patterns": ["mumbai marathon", "tata mumbai", " tmm "],
  "country_iso": "IN"
}
```

- **Denomination:** `42.2` / `KM` / `MUMBAI MARATHON`
- **Illustration:** **Gateway of India** — the basalt arch on the Apollo Bunder waterfront, drawn in vintage-engraving style. Single ink line with a subtle dotted halftone fill suggesting weathered stone. The arch is iconic enough that no caption is needed.
- **SortOrder:** 220

#### `vedanta_delhi_half` · Rare · event

The biggest half marathon in India. Run in October. Formerly Airtel Delhi Half Marathon (ADHM).

```json
{
  "kind": "named_event",
  "sport": "run",
  "distance_m_gte": 21000,
  "distance_m_lte": 21500,
  "title_patterns": ["delhi half", "vedanta delhi", "adhm", "airtel delhi half"],
  "country_iso": "IN"
}
```

- **Denomination:** `21.1` / `KM` / `DELHI HALF`
- **Illustration:** **Lotus Temple** — the nine-petalled white marble structure (Bahá'í House of Worship) in south Delhi. Distinctive curvilinear form, harder to mistake than India Gate (which reads as a generic war memorial). Drawn as concentric pointed-arch silhouettes converging at a central spire.
- **SortOrder:** 230

#### `bengaluru_marathon` · Rare · event

Bengaluru Marathon — the southern flagship 42.2K. Run in October.

```json
{
  "kind": "named_event",
  "sport": "run",
  "distance_m_gte": 42000,
  "distance_m_lte": 43000,
  "title_patterns": ["bengaluru marathon", "bangalore marathon"],
  "country_iso": "IN"
}
```

- **Denomination:** `42.2` / `KM` / `BENGALURU MARATHON`
- **Illustration:** **Vidhana Soudha** — the granite Karnataka legislature, central dome flanked by smaller domes. Symmetric, neoclassical, instantly recognisable to anyone who's been to Bengaluru. Drawn in line work with column hatching.
- **SortOrder:** 240

#### `hyderabad_marathon` · Rare · event

NMDC Hyderabad Marathon — known for being one of the hillier major Indian marathons. Run in August.

```json
{
  "kind": "named_event",
  "sport": "run",
  "distance_m_gte": 42000,
  "distance_m_lte": 43000,
  "title_patterns": ["hyderabad marathon", "nmdc hyderabad"],
  "country_iso": "IN"
}
```

- **Denomination:** `42.2` / `KM` / `HYDERABAD MARATHON`
- **Illustration:** **Charminar** — the four-arched minaret monument, the visual emblem of Hyderabad. Square base, four minarets, the central dome. Single ink line.
- **SortOrder:** 250

### Mythic — bucket-list

#### `ladakh_marathon` · Mythic · event

Run at ~3,500–5,300m altitude in Ladakh. The toughest mainstream marathon in India — runners train for months on hypoxia tolerance. September.

```json
{
  "kind": "named_event",
  "sport": "run",
  "distance_m_gte": 42000,
  "distance_m_lte": 43000,
  "title_patterns": ["ladakh marathon", "ladakh"],
  "country_iso": "IN"
}
```

Title-only matching here — the Ladakh Marathon brand is unambiguous and there's no other "Ladakh" race that would false-hit a 42K filter.

- **Denomination:** `42.2` / `KM` / `LADAKH · 3,500M`
- **Illustration:** A **stupa silhouette with a Himalayan peak rising behind it**. The stupa is the traditional Buddhist reliquary form (square base, hemispherical dome, conical spire, parasol at the top). Mountain peak with a wind-blown prayer flag string drawn as a diagonal line across the peak. This is the Mythic-tier illustration — three named layers: `#shadow` (the mountain), `#ink` (the stupa), `#foil` (the prayer flags catch the solar foil treatment).
- **SortOrder:** 260

---

## How to extend to global flagships later (preview, not v0)

The same architecture supports a `world_marathon_majors` set:

| Stamp | Tier | Distinctive illustration |
|---|---|---|
| `boston_marathon` | Mythic (event) | Heraldic unicorn (Boston Athletic Association emblem, currently used for `boston_q`). Stays distinct from `boston_q` because BQ is a *time* stamp, this is a *finishing* stamp. |
| `nyc_marathon` | Rare (event) | The Verrazzano-Narrows Bridge towers — twin suspension pylons |
| `london_marathon` | Rare (event) | Tower Bridge silhouette |
| `berlin_marathon` | Rare (event) | Brandenburg Gate |
| `chicago_marathon` | Rare (event) | Willis Tower black pillar |
| `tokyo_marathon` | Rare (event) | A torii gate |
| `six_stars` | Mythic (event, requires all six majors) | Six-pointed star with each landmark micro-engraved in a sliver |

A `six_stars` stamp requires a new `all_of` rule kind that checks the user has earned all six majors. Cleanly bolted on later.

Also worth catalog batches:

- **South Africa:** Comrades (mythic — 89K ultra), Two Oceans
- **Trail:** UTMB (mythic), Western States (mythic), CCC, Lavaredo
- **Asia regionals:** Singapore Marathon, Bangkok Marathon, Borobudur Marathon (the heritage trail), Tokyo Marathon (above)
- **India regionals:** Auroville Marathon, Goa River Marathon, Chennai Marathon

These are designer-asset and config-file work, no architecture change required. Track them in a follow-up doc once the v0 (India seven) is shipping.

---

## Designer asset additions

Adding to the deliverables already specified in `stamp-visual-system.md`:

```
apps/mobile/assets/stamp-illustrations/
  monsoon_run.svg            banyan tree, halftone-dot drip trails
  indian_metros_3.svg        Gateway + Charminar + Vidhana Soudha frieze
  tata_mumbai_marathon.svg   Gateway of India arch
  vedanta_delhi_half.svg     Lotus Temple
  bengaluru_marathon.svg     Vidhana Soudha
  hyderabad_marathon.svg     Charminar
  ladakh_marathon.svg        Stupa + Himalayan peak + prayer-flag line  (3-layer: shadow/ink/foil)
```

Reuse rules:

- The three landmarks in `indian_metros_3` SHOULD be authored as standalone illustrations first (for their respective stamps), then composed into the frieze SVG. Avoids dual maintenance.

Stylistic notes for the Indian set:

- **Avoid orientalist exotica.** No elephants, no peacocks, no curling flame-script borders, no tabla-and-sitar shorthand. Each landmark stands on its architectural merit, drawn the same way a US National Park stamp draws Half Dome — observed and respectful, not decorated.
- **Single ink weight across the set.** The Indian stamps should feel like they're from the same plate as the global stamps. Don't render the Indian set in a different visual idiom (a frequent and quite condescending design mistake).
- **No runner figures.** No silhouettes of people. The landmark IS the stamp's subject. (Same rule as the global set.)

---

## Implementation order

When implementing — separate commits per chunk so each is reviewable:

1. **Evaluator extension** — add `named_event` rule kind handler, add `named_cities_count` rule kind handler, add `monsoon_run` rule kind handler (or fold months into a generalised `single_activity` if cleaner). Unit-test each with table tests in `internal/stamps/evaluator_test.go`.
2. **Catalog entries** — add the seven definitions to `catalog.go` with the sort orders specified.
3. **Re-evaluation** — bump existing users via the existing `POST /v1/stamps/reevaluate` endpoint. Existing maintenance card "Re-eval stamps" button covers this with no UI changes.
4. **Wait on illustrations** — the `<StampShareCard>` polish from `stamp-visual-system.md` is the bigger lift and depends on designer assets. The catalog can ship first with the existing placeholder share card; new stamps will be earnable immediately, the share artifact catches up when illustrations land.

---

## Open questions for the runner-author

- **Mumbai Marathon naming:** include `Standard Chartered Mumbai Marathon` (older sponsor) as a fallback pattern? Most users renamed their old activities by now but the pattern is cheap insurance.
- **`vedanta_delhi_half` patterns:** include `delhi half marathon` (bare, no sponsor prefix)? Risk: false hit on community runs called "Delhi Half Marathon training." Decision needed.
- **`monsoon_run` distance threshold:** 15K feels right (a serious "I went out in the rain" run). Lower it to 10K to be more inclusive, or raise to 21.1K to make it harder?
- **Mythic tier for Ladakh:** confirmed. Anyone disagreeing has never tried to breathe at 4,000m.
- **Add a `goa_river_marathon` or `auroville_marathon` to the v0 seven?** Both are well-loved community marathons with strong regional followings. Adds two more illustrations.
