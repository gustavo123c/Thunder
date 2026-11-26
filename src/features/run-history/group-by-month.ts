import { formatMonthYear } from '@/lib/format';

export type MonthSection<T> = {
  key: string;
  title: string;
  totalDistanceM: number;
  data: T[];
};

/**
 * Groups runs (already sorted newest first) into calendar-month sections, local time.
 * Order is preserved, so infinite-scroll pages append naturally.
 */
export function groupRunsByMonth<T extends { startedAt: string; distanceM: number }>(
  runs: readonly T[],
): MonthSection<T>[] {
  const sections: MonthSection<T>[] = [];
  for (const run of runs) {
    const date = new Date(run.startedAt);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    let section = sections[sections.length - 1];
    if (!section || section.key !== key) {
      section = { key, title: formatMonthYear(date), totalDistanceM: 0, data: [] };
      sections.push(section);
    }
    section.data.push(run);
    section.totalDistanceM += run.distanceM;
  }
  return sections;
}
