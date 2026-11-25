/** Pure helpers for optimistic kudo updates in cached data. */

type KudoFields = { id: string; hasKudo: boolean; kudosCount: number };

export function applyKudo<T extends KudoFields>(item: T, runId: string, liked: boolean): T {
  if (item.id !== runId || item.hasKudo === liked) return item;
  return {
    ...item,
    hasKudo: liked,
    kudosCount: Math.max(0, item.kudosCount + (liked ? 1 : -1)),
  };
}

type InfinitePages<T> = { pages: T[][]; pageParams: unknown[] };

export function applyKudoToPages<T extends KudoFields>(
  data: InfinitePages<T> | undefined,
  runId: string,
  liked: boolean,
): InfinitePages<T> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => page.map((item) => applyKudo(item, runId, liked))),
  };
}
