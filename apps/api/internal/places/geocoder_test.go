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
