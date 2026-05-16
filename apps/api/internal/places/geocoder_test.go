package places

import "testing"

func TestNormalizeCity(t *testing.T) {
	cases := []struct {
		in, want string
	}{
		{"Mumbai Suburban", "Mumbai"},
		{"Mumbai Suburban District", "Mumbai"},
		{"Mumbai City District", "Mumbai"},
		{"Mumbai Zone 1", "Mumbai"},
		{"Bombay", "Mumbai"},
		{"Bangalore", "Bengaluru"},
		{"Bengaluru Urban", "Bengaluru"},
		{"Calcutta", "Kolkata"},
		{"Madras", "Chennai"},
		{"Gurgaon", "Gurugram"},
		// US: county fallback when no city is set at zoom=10.
		{"Santa Clara County", "Santa Clara"},
		// Telangana mandals — rollup to parent city/district.
		{"Hanamkonda mandal", "Hanamkonda"},
		{"Kothapally mandal", "Karimnagar"},
		{"Nandigama mandal", "Hyderabad"},
		{"Balapur mandal", "Hyderabad"},
		{"Yadagirigutta mandal", "Yadagirigutta"},
		// Pass-through for canonical or unknown values.
		{"Mumbai", "Mumbai"},
		{"London", "London"},
		{"", ""},
	}
	for _, tc := range cases {
		if got := normalizeCity(tc.in); got != tc.want {
			t.Errorf("normalizeCity(%q) = %q; want %q", tc.in, got, tc.want)
		}
	}
}

func TestNormalizeCityIdempotent(t *testing.T) {
	for from := range CityAliases {
		once := normalizeCity(from)
		twice := normalizeCity(once)
		if once != twice {
			t.Errorf("normalizeCity not idempotent for %q: once=%q twice=%q", from, once, twice)
		}
	}
}

func TestPickCityFallbackOrder(t *testing.T) {
	cases := []struct {
		name string
		set  func(a *nominatimResponse)
		want string
	}{
		{
			name: "prefers city over everything else",
			set: func(a *nominatimResponse) {
				a.Address.City = "Mumbai"
				a.Address.Town = "Ignored"
				a.Address.StateDistrict = "Mumbai City District"
			},
			want: "Mumbai",
		},
		{
			name: "falls through to city_district",
			set: func(a *nominatimResponse) {
				a.Address.CityDistrict = "Mumbai Zone 1"
				a.Address.Suburb = "Worli"
			},
			want: "Mumbai Zone 1",
		},
		{
			name: "falls through to state_district for Mumbai-style zoom=10 response",
			set: func(a *nominatimResponse) {
				a.Address.StateDistrict = "Mumbai City District"
				a.Address.State = "Maharashtra"
				a.Address.Country = "India"
			},
			want: "Mumbai City District",
		},
		{
			name: "empty when nothing populated",
			set:  func(a *nominatimResponse) {},
			want: "",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var resp nominatimResponse
			tc.set(&resp)
			if got := pickCity(resp); got != tc.want {
				t.Errorf("pickCity = %q; want %q", got, tc.want)
			}
		})
	}
}

// Mirrors the real Nominatim zoom=10 response for the 2026 Mumbai Marathon
// start coordinate (18.9396, 72.8350) that previously landed in
// geocode_cache with an empty city. The fix is the combination of pickCity
// falling back to state_district + the "Mumbai City District" alias.
func TestPickThenNormalizeForMumbaiMarathon(t *testing.T) {
	var resp nominatimResponse
	resp.Address.StateDistrict = "Mumbai City District"
	resp.Address.State = "Maharashtra"
	resp.Address.Country = "India"
	resp.Address.CountryCode = "in"

	got := normalizeCity(pickCity(resp))
	if got != "Mumbai" {
		t.Errorf("Mumbai Marathon start: got %q; want %q", got, "Mumbai")
	}
}

func TestShouldRefineAtFinerZoom(t *testing.T) {
	mk := func(set func(a *nominatimResponse)) nominatimResponse {
		var r nominatimResponse
		set(&r)
		return r
	}
	cases := []struct {
		name    string
		raw     string
		norm    string
		resp    nominatimResponse
		refines bool
	}{
		{
			name: "refines: zoom=10 only returned a county we don't alias",
			raw:  "Santa Clara County", norm: "Santa Clara County",
			resp: mk(func(a *nominatimResponse) {
				a.Address.County = "Santa Clara County"
				a.Address.State = "California"
				a.Address.Country = "United States"
			}),
			refines: true,
		},
		{
			name: "no refine: alias handled the admin name",
			raw:  "Mumbai City District", norm: "Mumbai",
			resp: mk(func(a *nominatimResponse) {
				a.Address.StateDistrict = "Mumbai City District"
				a.Address.State = "Maharashtra"
				a.Address.Country = "India"
			}),
			refines: false,
		},
		{
			name: "no refine: zoom=10 had a real city",
			raw:  "Karimnagar", norm: "Karimnagar",
			resp: mk(func(a *nominatimResponse) {
				a.Address.City = "Karimnagar"
				a.Address.State = "Telangana"
				a.Address.Country = "India"
			}),
			refines: false,
		},
		{
			name: "refines: empty raw (Nominatim returned no locality fields)",
			raw:  "", norm: "",
			resp:    nominatimResponse{},
			refines: true,
		},
		{
			name: "refines: zoom=10 returned a state_district we don't alias",
			raw:  "Some Unmapped District", norm: "Some Unmapped District",
			resp: mk(func(a *nominatimResponse) {
				a.Address.StateDistrict = "Some Unmapped District"
				a.Address.Country = "Wherever"
			}),
			refines: true,
		},
		{
			name: "no refine: zoom=10 picked from suburb (not admin)",
			raw:  "Worli", norm: "Worli",
			resp: mk(func(a *nominatimResponse) {
				a.Address.Suburb = "Worli"
				a.Address.County = "Mumbai Suburban"
				a.Address.Country = "India"
			}),
			refines: false,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := shouldRefineAtFinerZoom(tc.raw, tc.norm, tc.resp)
			if got != tc.refines {
				t.Errorf("shouldRefineAtFinerZoom = %v; want %v", got, tc.refines)
			}
		})
	}
}
