import type { Activity, Point, Split } from '../../data/models';
import type { StickerKey } from '../layouts/types';

export function stickerHasValue(
  key: StickerKey,
  run: Activity,
  liveHr: number[] | null,
  livePace: number[] | null,
  liveRoute: Point[] | null,
  liveSplits: Split[] | null,
): boolean {
  switch (key) {
    case 'distance': return run.distance > 0;
    case 'pace':     return run.pace > 0;
    case 'time':     return run.seconds > 0;
    case 'hr':       return (run.avgHr ?? 0) > 0;
    case 'elev':     return (run.elev ?? 0) > 0;
    case 'cal':      return (run.cal ?? 0) > 0;
    case 'cadence':  return typeof run.cadence === 'number' && run.cadence > 0;
    case 'splits':   return (liveSplits ?? run.splits ?? []).length > 0;
    case 'hrChart':
      return (liveHr != null && liveHr.length > 1) ||
        (Array.isArray(run.streamHr) && run.streamHr.length > 1);
    case 'paceChart':
      return (livePace != null && livePace.length > 1) ||
        (Array.isArray(run.streamPace) && run.streamPace.length > 1);
    case 'map':
      return liveRoute != null && liveRoute.length > 1;
    case 'date':     return !!run.date;
    case 'title':    return !!run.title && run.title.trim().length > 0;
    case 'place':
      return !!run.city && run.city.trim().length > 0 && run.city !== '—';
    default:         return true;
  }
}

export const STICKER_LIBRARY: { key: StickerKey; label: string }[] = [
  { key: 'distance',  label: 'Distance'  },
  { key: 'pace',      label: 'Pace'      },
  { key: 'time',      label: 'Time'      },
  { key: 'hr',        label: 'HR'        },
  { key: 'elev',      label: 'Elev'      },
  { key: 'cal',       label: 'Calories'  },
  { key: 'cadence',   label: 'Cadence'   },
  { key: 'splits',    label: 'Splits'    },
  { key: 'hrChart',   label: 'HR chart'  },
  { key: 'paceChart', label: 'Pace chart' },
  { key: 'map',       label: 'Route map' },
  { key: 'date',      label: 'Date'      },
  { key: 'title',     label: 'Title'     },
  { key: 'place',     label: 'Place'     },
];
