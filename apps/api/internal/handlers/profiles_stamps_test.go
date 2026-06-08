package handlers

import (
	"testing"
	"time"

	"github.com/Rohithgilla12/runstamp/apps/api/internal/stamps"
)

func TestToPublicStamps(t *testing.T) {
	earned := []stamps.Earned{
		{StampID: "first_5k", EarnedAt: time.Date(2026, 1, 2, 0, 0, 0, 0, time.UTC)},
		{StampID: "ghost_stamp", EarnedAt: time.Date(2026, 1, 3, 0, 0, 0, 0, time.UTC)},
	}
	out := toPublicStamps(earned)
	if len(out) != 2 {
		t.Fatalf("len = %d, want 2", len(out))
	}
	if out[0].StampID != "first_5k" || out[0].Name == "" || out[0].Tier == "" {
		t.Fatalf("first_5k not enriched: %+v", out[0])
	}
	if out[0].EarnedAt == "" {
		t.Fatalf("earnedAt not set: %+v", out[0])
	}
	if out[1].StampID != "ghost_stamp" || out[1].Name != "" || out[1].Tier != "" {
		t.Fatalf("unknown stamp should have blank name/tier: %+v", out[1])
	}
}

func TestToPublicStampsEmpty(t *testing.T) {
	out := toPublicStamps(nil)
	if out == nil {
		t.Fatal("toPublicStamps(nil) returned nil; want non-nil empty slice (JSON [] not null)")
	}
	if len(out) != 0 {
		t.Fatalf("len = %d, want 0", len(out))
	}
}
