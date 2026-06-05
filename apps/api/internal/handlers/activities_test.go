package handlers

import "testing"

func TestPatchStringField(t *testing.T) {
	deref := func(p *string) string {
		if p == nil {
			return "<nil>"
		}
		return *p
	}
	long := make([]byte, 250)
	for i := range long {
		long[i] = 'a'
	}
	cases := []struct {
		name string
		in   string
		want string // "<nil>" means a nil pointer (clear to NULL)
	}{
		{"plain value trimmed", "  Recovery run  ", "Recovery run"},
		{"empty clears to nil", "", "<nil>"},
		{"whitespace clears to nil", "   ", "<nil>"},
		{"capped at 200", string(long), string(long[:200])},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := patchStringField(tc.in, 200)
			if deref(got) != tc.want {
				t.Fatalf("patchStringField(%q) = %q; want %q", tc.in, deref(got), tc.want)
			}
		})
	}
}
