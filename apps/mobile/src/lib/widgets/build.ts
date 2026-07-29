import type { Activity } from '../../data/models';
import { distUnit, fmtDist, fmtPace } from '../format';
import type {
  WidgetDayDot,
  WidgetDayState,
  WidgetLatestRun,
  WidgetSnapshot,
  WidgetUnits,
} from './types';

export interface SyncWidgetInput {
  activities: ReadonlyArray<Activity>;
  stampCount: number;
  lastStampName: string | null;
  units: WidgetUnits;
  reference?: Date;
}

// Sunday-first week, matching `computeWeekStats` on Home so the widget's
// "THIS WEEK" number matches the in-app WeekLedger.
export function startOfWeek(reference: Date): Date {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  start.setDate(reference.getDate() - reference.getDay());
  return start;
}

export function buildWeekDots(
  activities: ReadonlyArray<Activity>,
  reference: Date = new Date(),
): WidgetDayDot[] {
  const weekStart = startOfWeek(reference);
  const todayIndex = reference.getDay(); // 0=Sun..6=Sat
  const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const runDays = new Set<number>();
  for (const a of activities) {
    const d = new Date(a.date);
    if (Number.isNaN(d.getTime())) continue;
    if (d < weekStart) continue;
    const dayEnd = new Date(weekStart);
    dayEnd.setDate(weekStart.getDate() + 7);
    if (d >= dayEnd) continue;
    runDays.add(d.getDay());
  }

  return letters.map((weekday, index) => {
    let state: WidgetDayState;
    if (index > todayIndex) {
      state = 'future';
    } else if (index === todayIndex) {
      // Always highlight today; fill comes from the week distance above.
      state = 'today';
    } else {
      state = runDays.has(index) ? 'past-run' : 'past-quiet';
    }
    return { weekday, state };
  });
}

// Activities arrive from the API newest-first (`ORDER BY started_at DESC`),
// and Home uses `activities[0]` as the hero. Match that — `Activity.date` is
// date-only (`YYYY-MM-DD`), so a max-date scan can't break same-day ties.
function toLatestRun(
  activities: ReadonlyArray<Activity>,
  units: WidgetUnits,
): WidgetLatestRun | null {
  if (activities.length === 0) return null;
  const latest = activities[0];
  const dateLabel = formatLatestDateLabel(latest.date);
  return {
    id: latest.id,
    title: latest.title || 'Run',
    place: latest.place || latest.city || '',
    distanceLabel: fmtDist(latest.distance, units),
    units,
    paceLabel: fmtPace(latest.pace, units),
    dateLabel,
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOWS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Parse `YYYY-MM-DD` (and optional time suffix) as a local calendar day so
// UTC midnight parsing doesn't shift the weekday label in western timezones.
function formatLatestDateLabel(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (m) {
    const y = Number(m[1]);
    const month = Number(m[2]) - 1;
    const day = Number(m[3]);
    const local = new Date(y, month, day);
    return `${DOWS[local.getDay()]} · ${MONTHS[month]} ${day}`;
  }
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${DOWS[d.getDay()]} · ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function signedDeltaLabel(kmDelta: number, units: WidgetUnits): string {
  const mag = Math.abs(kmDelta);
  const formatted = fmtDist(mag, units);
  if (kmDelta > 0.0005) return `+${formatted}`;
  if (kmDelta < -0.0005) return `−${formatted}`;
  return formatted;
}

export function buildSnapshot(input: SyncWidgetInput): WidgetSnapshot {
  const reference = input.reference ?? new Date();
  const weekStart = startOfWeek(reference);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(weekStart.getDate() - 7);

  let thisKm = 0;
  let lastKm = 0;
  let weekRuns = 0;
  let weekSeconds = 0;
  for (const a of input.activities) {
    const d = new Date(a.date);
    if (Number.isNaN(d.getTime())) continue;
    if (d >= weekStart) {
      thisKm += a.distance;
      weekRuns += 1;
      weekSeconds += a.seconds;
    } else if (d >= lastWeekStart) {
      lastKm += a.distance;
    }
  }

  return {
    updatedAt: reference.toISOString(),
    units: input.units,
    weekDistanceLabel: fmtDist(thisKm, input.units),
    weekRuns,
    weekSeconds,
    vsLastDistanceLabel: signedDeltaLabel(thisKm - lastKm, input.units),
    weekDots: buildWeekDots(input.activities, reference),
    latestRun: toLatestRun(input.activities, input.units),
    stampCount: input.stampCount,
    lastStampName: input.lastStampName,
  };
}

// Exported for tests / copy that wants the unit suffix next to the number.
export function weekDistanceWithUnit(snapshot: WidgetSnapshot): string {
  return `${snapshot.weekDistanceLabel} ${distUnit(snapshot.units)}`;
}

export function snapshotFingerprint(snapshot: WidgetSnapshot): string {
  return JSON.stringify({
    units: snapshot.units,
    weekDistanceLabel: snapshot.weekDistanceLabel,
    weekRuns: snapshot.weekRuns,
    weekSeconds: snapshot.weekSeconds,
    vsLastDistanceLabel: snapshot.vsLastDistanceLabel,
    weekDots: snapshot.weekDots,
    latestRun: snapshot.latestRun
      ? {
          id: snapshot.latestRun.id,
          distanceLabel: snapshot.latestRun.distanceLabel,
          paceLabel: snapshot.latestRun.paceLabel,
          title: snapshot.latestRun.title,
        }
      : null,
    stampCount: snapshot.stampCount,
    lastStampName: snapshot.lastStampName,
  });
}
