interface Dated { date: string }

const MS_PER_DAY = 86_400_000;

function toLocalMidnight(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function computeStreaks(rows: readonly Dated[], ref: Date = new Date()): {
  current: number; longest: number;
} {
  if (rows.length === 0) return { current: 0, longest: 0 };

  const days = Array.from(new Set(rows.map((r) => toLocalMidnight(r.date)))).sort((a, b) => a - b);

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] === days[i - 1] + MS_PER_DAY) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();
  const yesterday = today - MS_PER_DAY;
  const last = days[days.length - 1];
  let current = 0;
  if (last === today || last === yesterday) {
    current = 1;
    for (let i = days.length - 2; i >= 0; i--) {
      if (days[i] === days[i + 1] - MS_PER_DAY) current += 1;
      else break;
    }
  }

  return { current, longest };
}
