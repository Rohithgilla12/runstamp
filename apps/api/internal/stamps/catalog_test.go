package stamps

import (
	"encoding/json"
	"testing"
)

// TestCatalogCriteriaParse ensures every stamp definition's criteria JSON
// parses as the rule struct its declared kind maps to. Catches typos in the
// catalog JSON before they hit the evaluator at runtime.
func TestCatalogCriteriaParse(t *testing.T) {
	for _, def := range Catalog {
		var head struct {
			Kind string `json:"kind"`
		}
		if err := json.Unmarshal(def.Criteria, &head); err != nil {
			t.Fatalf("%s: criteria not valid JSON: %v", def.ID, err)
		}
		if head.Kind == "" {
			t.Fatalf("%s: criteria missing 'kind'", def.ID)
		}

		switch head.Kind {
		case "single_activity":
			var r singleActivityRule
			if err := json.Unmarshal(def.Criteria, &r); err != nil {
				t.Fatalf("%s: parse single_activity: %v", def.ID, err)
			}
		case "cumulative_distance":
			var r cumulativeRule
			if err := json.Unmarshal(def.Criteria, &r); err != nil {
				t.Fatalf("%s: parse cumulative_distance: %v", def.ID, err)
			}
			if r.DistanceM <= 0 {
				t.Fatalf("%s: cumulative_distance needs distance_m_gte > 0", def.ID)
			}
		case "cities_count":
			var r citiesRule
			if err := json.Unmarshal(def.Criteria, &r); err != nil {
				t.Fatalf("%s: parse cities_count: %v", def.ID, err)
			}
			if r.Cities <= 0 {
				t.Fatalf("%s: cities_count needs cities_gte > 0", def.ID)
			}
		case "countries_count":
			var r citiesRule
			if err := json.Unmarshal(def.Criteria, &r); err != nil {
				t.Fatalf("%s: parse countries_count: %v", def.ID, err)
			}
			if r.Countries <= 0 {
				t.Fatalf("%s: countries_count needs countries_gte > 0", def.ID)
			}
		case "named_event":
			var r namedEventRule
			if err := json.Unmarshal(def.Criteria, &r); err != nil {
				t.Fatalf("%s: parse named_event: %v", def.ID, err)
			}
			if len(r.TitlePatterns) == 0 {
				t.Fatalf("%s: named_event needs at least one title_pattern", def.ID)
			}
			if r.CountryISO != "" {
				if _, ok := countryNameByISO[r.CountryISO]; !ok {
					t.Fatalf("%s: named_event country_iso=%q not in countryNameByISO", def.ID, r.CountryISO)
				}
			}
		case "named_cities_count":
			var r namedCitiesCountRule
			if err := json.Unmarshal(def.Criteria, &r); err != nil {
				t.Fatalf("%s: parse named_cities_count: %v", def.ID, err)
			}
			if r.CitiesGte <= 0 {
				t.Fatalf("%s: named_cities_count needs cities_gte > 0", def.ID)
			}
			if len(r.CitySet) == 0 {
				t.Fatalf("%s: named_cities_count needs a non-empty city_set", def.ID)
			}
			if r.CountryISO != "" {
				if _, ok := countryNameByISO[r.CountryISO]; !ok {
					t.Fatalf("%s: named_cities_count country_iso=%q not in countryNameByISO", def.ID, r.CountryISO)
				}
			}
		case "monsoon_run":
			var r monsoonRunRule
			if err := json.Unmarshal(def.Criteria, &r); err != nil {
				t.Fatalf("%s: parse monsoon_run: %v", def.ID, err)
			}
			if len(r.Months) == 0 {
				t.Fatalf("%s: monsoon_run needs months", def.ID)
			}
			for _, m := range r.Months {
				if m < 1 || m > 12 {
					t.Fatalf("%s: monsoon_run month %d out of range", def.ID, m)
				}
			}
		default:
			t.Fatalf("%s: unknown kind %q — every kind needs an evaluator branch", def.ID, head.Kind)
		}
	}
}

func TestCatalogUniqueIDs(t *testing.T) {
	seen := map[string]bool{}
	for _, def := range Catalog {
		if seen[def.ID] {
			t.Fatalf("duplicate stamp id: %s", def.ID)
		}
		seen[def.ID] = true
	}
}

func TestCatalogTierValid(t *testing.T) {
	valid := map[string]bool{"common": true, "rare": true, "mythic": true}
	for _, def := range Catalog {
		if !valid[def.Tier] {
			t.Fatalf("%s: invalid tier %q", def.ID, def.Tier)
		}
	}
}
