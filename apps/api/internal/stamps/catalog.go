// Package stamps owns the stamp catalog + evaluator (PRD §6.6).
//
// The catalog is the source of truth for which stamps exist. It's seeded on
// app boot via Sync() — that ensures the production DB matches whatever the
// running binary considers earnable. Adding a new stamp is therefore a code
// change + redeploy, never a manual SQL insert.
package stamps

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Definition matches the stamp_definitions row.
type Definition struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Tier        string          `json:"tier"`
	Category    string          `json:"category"`
	Criteria    json.RawMessage `json:"criteria"`
	SortOrder   int             `json:"sortOrder"`
}

// Catalog is the in-memory list of all earnable stamps. Keep this aligned with
// PRD §6.6 — common builds the habit, rare are meaningful milestones, mythic
// is serious territory.
//
// Distance thresholds are exact: 5K = 5000m, 10K = 10000m, HM = 21097m,
// Marathon = 42195m. Time thresholds in seconds.
var Catalog = []Definition{
	// ── Common: distance firsts ─────────────────────────────────────────
	{
		ID:          "first_5k",
		Name:        "First 5K",
		Description: "Logged a 5K run.",
		Tier:        "common",
		Category:    "distance",
		Criteria:    j(`{"kind":"single_activity","sport":"run","distance_m_gte":5000}`),
		SortOrder:   10,
	},
	{
		ID:          "first_10k",
		Name:        "First 10K",
		Description: "Logged a 10K run.",
		Tier:        "common",
		Category:    "distance",
		Criteria:    j(`{"kind":"single_activity","sport":"run","distance_m_gte":10000}`),
		SortOrder:   20,
	},
	{
		ID:          "first_half",
		Name:        "First half marathon",
		Description: "Crossed 21.1 km.",
		Tier:        "common",
		Category:    "distance",
		Criteria:    j(`{"kind":"single_activity","sport":"run","distance_m_gte":21097}`),
		SortOrder:   30,
	},
	// ── Common: cumulative ─────────────────────────────────────────────
	{
		ID:          "lifetime_100km",
		Name:        "100 km lifetime",
		Description: "Logged 100 kilometres of running.",
		Tier:        "common",
		Category:    "distance",
		Criteria:    j(`{"kind":"cumulative_distance","distance_m_gte":100000,"window":"all_time"}`),
		SortOrder:   40,
	},
	{
		ID:          "lifetime_500km",
		Name:        "500 km lifetime",
		Description: "Half a thousand kilometres logged.",
		Tier:        "common",
		Category:    "distance",
		Criteria:    j(`{"kind":"cumulative_distance","distance_m_gte":500000,"window":"all_time"}`),
		SortOrder:   50,
	},
	// ── Rare: distance milestones ──────────────────────────────────────
	{
		ID:          "first_marathon",
		Name:        "First marathon",
		Description: "Crossed 42.2 km.",
		Tier:        "rare",
		Category:    "distance",
		Criteria:    j(`{"kind":"single_activity","sport":"run","distance_m_gte":42195}`),
		SortOrder:   60,
	},
	{
		ID:          "lifetime_1000km",
		Name:        "1,000 km lifetime",
		Description: "Crossed a thousand cumulative kilometres.",
		Tier:        "rare",
		Category:    "distance",
		Criteria:    j(`{"kind":"cumulative_distance","distance_m_gte":1000000,"window":"all_time"}`),
		SortOrder:   70,
	},
	// ── Rare: pace milestones ──────────────────────────────────────────
	{
		ID:          "sub_50_10k",
		Name:        "Sub-50 10K",
		Description: "10K under 50 minutes.",
		Tier:        "rare",
		Category:    "pace",
		Criteria:    j(`{"kind":"single_activity","sport":"run","distance_m_gte":10000,"distance_m_lte":10500,"time_seconds_lte":3000}`),
		SortOrder:   80,
	},
	{
		ID:          "sub_2h_half",
		Name:        "Sub-2:00 half",
		Description: "21.1 km under 2 hours.",
		Tier:        "rare",
		Category:    "pace",
		Criteria:    j(`{"kind":"single_activity","sport":"run","distance_m_gte":21097,"distance_m_lte":21700,"time_seconds_lte":7200}`),
		SortOrder:   90,
	},
	{
		ID:          "sub_4_marathon",
		Name:        "Sub-4:00 marathon",
		Description: "42.2 km under 4 hours.",
		Tier:        "rare",
		Category:    "pace",
		Criteria:    j(`{"kind":"single_activity","sport":"run","distance_m_gte":42195,"distance_m_lte":42600,"time_seconds_lte":14400}`),
		SortOrder:   100,
	},
	{
		ID:          "sub_345_marathon",
		Name:        "Sub-3:45 marathon",
		Description: "42.2 km under 3:45.",
		Tier:        "rare",
		Category:    "pace",
		Criteria:    j(`{"kind":"single_activity","sport":"run","distance_m_gte":42195,"distance_m_lte":42600,"time_seconds_lte":13500}`),
		SortOrder:   110,
	},
	// ── Mythic: elite pace ─────────────────────────────────────────────
	{
		ID:          "sub_3h_marathon",
		Name:        "Sub-3 marathon",
		Description: "42.2 km under 3 hours.",
		Tier:        "mythic",
		Category:    "pace",
		Criteria:    j(`{"kind":"single_activity","sport":"run","distance_m_gte":42195,"distance_m_lte":42600,"time_seconds_lte":10800}`),
		SortOrder:   120,
	},
	{
		ID:          "boston_q",
		Name:        "Boston qualifier",
		Description: "Marathon under a Boston qualifying time (general M18-34 standard).",
		Tier:        "mythic",
		Category:    "pace",
		Criteria:    j(`{"kind":"single_activity","sport":"run","distance_m_gte":42195,"distance_m_lte":42600,"time_seconds_lte":10800}`),
		SortOrder:   130,
	},
	// ── Mythic: ultra ──────────────────────────────────────────────────
	{
		ID:          "ultra_50k",
		Name:        "50K ultra",
		Description: "Crossed 50 km in a single run.",
		Tier:        "mythic",
		Category:    "distance",
		Criteria:    j(`{"kind":"single_activity","sport":"run","distance_m_gte":50000}`),
		SortOrder:   140,
	},
	// ── Common: places ─────────────────────────────────────────────────
	{
		ID:          "cities_5",
		Name:        "5 cities stamped",
		Description: "Run in 5 different cities.",
		Tier:        "common",
		Category:    "place",
		Criteria:    j(`{"kind":"cities_count","cities_gte":5}`),
		SortOrder:   150,
	},
	{
		ID:          "countries_3",
		Name:        "3 countries",
		Description: "Run in 3 different countries.",
		Tier:        "rare",
		Category:    "place",
		Criteria:    j(`{"kind":"countries_count","countries_gte":3}`),
		SortOrder:   160,
	},

	// ── India regional flagship batch (PRD §6.6 + docs/design/stamp-catalog-expansion.md) ──
	{
		ID:          "monsoon_run",
		Name:        "Monsoon long run",
		Description: "Logged a 15K+ run between June and September in India.",
		Tier:        "common",
		Category:    "event",
		Criteria:    j(`{"kind":"monsoon_run","sport":"run","distance_m_gte":15000,"months":[6,7,8,9],"country_iso":"IN"}`),
		SortOrder:   200,
	},
	{
		ID:          "indian_metros_3",
		Name:        "3 Indian metros",
		Description: "Run in 3 of India's 8 metro cities.",
		Tier:        "common",
		Category:    "place",
		Criteria:    j(`{"kind":"named_cities_count","cities_gte":3,"country_iso":"IN","city_set":["Mumbai","Delhi","New Delhi","Bengaluru","Bangalore","Chennai","Kolkata","Hyderabad","Ahmedabad","Pune"]}`),
		SortOrder:   210,
	},
	{
		ID:          "tata_mumbai_marathon",
		Name:        "Tata Mumbai Marathon",
		Description: "Finished the Tata Mumbai Marathon.",
		Tier:        "rare",
		Category:    "event",
		Criteria:    j(`{"kind":"named_event","sport":"run","distance_m_gte":42000,"distance_m_lte":43000,"title_patterns":["mumbai marathon","tata mumbai","standard chartered mumbai"," tmm "," scmm "],"country_iso":"IN"}`),
		SortOrder:   220,
	},
	{
		ID:          "vedanta_delhi_half",
		Name:        "Vedanta Delhi Half Marathon",
		Description: "Finished the Vedanta Delhi Half Marathon (formerly ADHM).",
		Tier:        "rare",
		Category:    "event",
		Criteria:    j(`{"kind":"named_event","sport":"run","distance_m_gte":21000,"distance_m_lte":21500,"title_patterns":["delhi half","vedanta delhi","airtel delhi half","adhm"],"country_iso":"IN"}`),
		SortOrder:   230,
	},
	{
		ID:          "bengaluru_marathon",
		Name:        "Bengaluru Marathon",
		Description: "Finished the Bengaluru Marathon.",
		Tier:        "rare",
		Category:    "event",
		Criteria:    j(`{"kind":"named_event","sport":"run","distance_m_gte":42000,"distance_m_lte":43000,"title_patterns":["bengaluru marathon","bangalore marathon"],"country_iso":"IN"}`),
		SortOrder:   240,
	},
	{
		ID:          "hyderabad_marathon",
		Name:        "Hyderabad Marathon",
		Description: "Finished the NMDC Hyderabad Marathon.",
		Tier:        "rare",
		Category:    "event",
		Criteria:    j(`{"kind":"named_event","sport":"run","distance_m_gte":42000,"distance_m_lte":43000,"title_patterns":["hyderabad marathon","nmdc hyderabad"],"country_iso":"IN"}`),
		SortOrder:   250,
	},
	{
		ID:          "ladakh_marathon",
		Name:        "Ladakh Marathon",
		Description: "Finished the Ladakh Marathon at ~3,500m altitude.",
		Tier:        "mythic",
		Category:    "event",
		Criteria:    j(`{"kind":"named_event","sport":"run","distance_m_gte":42000,"distance_m_lte":43000,"title_patterns":["ladakh marathon","ladakh"],"country_iso":"IN"}`),
		SortOrder:   260,
	},
}

func j(s string) json.RawMessage { return json.RawMessage(s) }

// Sync inserts every catalog entry into stamp_definitions on app boot,
// updating mutable fields on conflict. It never deletes — a removed stamp
// stays as a definition because users may have earned it.
func Sync(ctx context.Context, pool *pgxpool.Pool) error {
	batch := &pgx.Batch{}
	for _, def := range Catalog {
		batch.Queue(`
INSERT INTO stamp_definitions (id, name, description, tier, category, criteria, sort_order)
VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  category = EXCLUDED.category,
  criteria = EXCLUDED.criteria,
  sort_order = EXCLUDED.sort_order
`,
			def.ID, def.Name, def.Description, def.Tier, def.Category, string(def.Criteria), def.SortOrder)
	}
	br := pool.SendBatch(ctx, batch)
	defer br.Close()
	for range Catalog {
		if _, err := br.Exec(); err != nil {
			return fmt.Errorf("stamps: sync upsert: %w", err)
		}
	}
	return nil
}
