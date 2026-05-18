// On-demand fetcher for the per-activity heavy fields the list endpoint
// deliberately omits — splits, notes. Same shape as useActivityStreams:
// pass an activity id (or null to no-op), get back the fields once the
// fetch lands. Used by ActivityScreen and EditorScreen to surface splits
// without paying the list-payload cost for every other run.

import { useCallback, useEffect, useState } from 'react';
import { getActivityDetail, type ApiActivityDetail } from '../services/activities';
import type { Split } from '../data/sample';
import { useAuth } from './AuthContext';

interface UseActivityDetailState {
  detail: ApiActivityDetail | null;
  splits: Split[] | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useActivityDetail(activityId: string | null): UseActivityDetailState {
  const { user, getIdToken } = useAuth();
  const [detail, setDetail] = useState<ApiActivityDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchOnce = useCallback(async () => {
    if (!user || !activityId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const idToken = await getIdToken();
      const next = await getActivityDetail(activityId, idToken);
      setDetail(next);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [user, getIdToken, activityId]);

  useEffect(() => {
    fetchOnce();
  }, [fetchOnce]);

  // Splits land from two ingestion paths with different field names:
  //   - Apple Health sync: { index, distanceM, durationSec, avgHr }
  //   - Legacy / mobile-shape:                       { k, sec, hr }
  // Normalise both to the mobile Split type the sticker + ActivityScreen
  // already read. Done here so the screens don't each carry a translation
  // layer.
  const splits = detail?.splits != null ? normaliseSplits(detail.splits) : null;

  return { detail, splits, loading, error, refresh: fetchOnce };
}

function normaliseSplits(raw: unknown): Split[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: Split[] = [];
  for (const r of raw as Array<Record<string, unknown>>) {
    if (r == null || typeof r !== 'object') continue;
    if (typeof r.durationSec === 'number') {
      // Health-sync shape. distanceM ignored — sticker reads sec as pace
      // proxy because each split is per-km by construction. index is 0-based
      // on the wire, we 1-base for display (K1, K2…).
      out.push({
        k: typeof r.index === 'number' ? (r.index as number) + 1 : out.length + 1,
        sec: r.durationSec as number,
        hr: typeof r.avgHr === 'number' ? (r.avgHr as number) : 0,
      });
      continue;
    }
    if (typeof r.sec === 'number') {
      out.push({
        k: typeof r.k === 'number' ? (r.k as number) : out.length + 1,
        sec: r.sec as number,
        hr: typeof r.hr === 'number' ? (r.hr as number) : 0,
      });
    }
  }
  return out.length > 0 ? out : null;
}
