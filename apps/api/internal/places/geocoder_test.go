package places

import "testing"

func TestNormalizeCity(t *testing.T) {
	cases := []struct {
		in, want string
	}{
		{"Mumbai Suburban", "Mumbai"},
		{"Mumbai Suburban District", "Mumbai"},
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
