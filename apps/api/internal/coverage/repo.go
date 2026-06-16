package coverage

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	snapM        = 25.0 // metres: a point must be within this of a way to count
	minPtsPerWay = 3    // a way needs this many snapped points to count
)

type Repo struct{ pool *pgxpool.Pool }

func NewRepo(pool *pgxpool.Pool) *Repo { return &Repo{pool: pool} }

// SnapAndStore snaps points to nearest osm_ways and REPLACES the activity's
// covered_ways with ways that have >= minPtsPerWay points within snapM.
func (r *Repo) SnapAndStore(ctx context.Context, activityID string, pts []LL) ([]int64, error) {
	if len(pts) == 0 {
		return nil, nil
	}
	var sb strings.Builder
	args := make([]any, 0, len(pts)*2+1)
	args = append(args, activityID)
	sb.WriteString("(VALUES ")
	for i, p := range pts {
		if i > 0 {
			sb.WriteString(",")
		}
		fmt.Fprintf(&sb, "(ST_SetSRID(ST_MakePoint($%d,$%d),4326)::geography)", len(args)+1, len(args)+2)
		args = append(args, p.Lng, p.Lat)
	}
	sb.WriteString(") AS pt(g)")

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("coverage: begin: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM activity_covered_ways WHERE activity_id = $1`, activityID); err != nil {
		return nil, fmt.Errorf("coverage: clear: %w", err)
	}

	sql := `
WITH pts AS ( SELECT g FROM ` + sb.String() + ` ),
nearest AS (
  SELECT w.way_id
  FROM pts p
  CROSS JOIN LATERAL (
    SELECT way_id FROM osm_ways
    WHERE ST_DWithin(geom, p.g, ` + fmt.Sprintf("%g", snapM) + `)
    ORDER BY geom <-> p.g
    LIMIT 1
  ) w
),
counted AS (
  SELECT way_id FROM nearest
  GROUP BY way_id
  HAVING count(*) >= ` + fmt.Sprintf("%d", minPtsPerWay) + `
)
INSERT INTO activity_covered_ways (activity_id, way_id)
SELECT $1, way_id FROM counted
RETURNING way_id`

	rows, err := tx.Query(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("coverage: snap: %w", err)
	}
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return nil, fmt.Errorf("coverage: scan way: %w", err)
		}
		ids = append(ids, id)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("coverage: commit: %w", err)
	}
	return ids, nil
}
