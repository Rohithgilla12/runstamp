export function sortByDateAsc<T extends { date: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
