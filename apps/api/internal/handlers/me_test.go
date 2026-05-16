package handlers

import (
	"testing"
)

func TestPatchMeValidation(t *testing.T) {
	cases := []struct {
		name      string
		hrMax     *int
		hrResting *int
		wantErr   bool
	}{
		{"both nil ok", nil, nil, false},
		{"valid pair", ptr(190), ptr(60), false},
		{"hr_max too low", ptr(119), nil, true},
		{"hr_max too high", ptr(231), nil, true},
		{"hr_resting too low", nil, ptr(29), true},
		{"hr_resting too high", nil, ptr(101), true},
		{"hr_max == hr_resting (resting must be < max)", ptr(160), ptr(160), true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validateHRProfile(tc.hrMax, tc.hrResting)
			if (err != nil) != tc.wantErr {
				t.Fatalf("validateHRProfile(%v, %v) err=%v, wantErr=%v", tc.hrMax, tc.hrResting, err, tc.wantErr)
			}
		})
	}
}

func ptr[T any](v T) *T { return &v }
