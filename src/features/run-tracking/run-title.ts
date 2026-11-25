/** Default run title from the local start hour, e.g. "Corrida matinal". */
export function defaultRunTitle(startedAt: number | Date): string {
  const hour = new Date(startedAt).getHours();
  if (hour >= 5 && hour < 12) return 'Corrida matinal';
  if (hour >= 12 && hour < 18) return 'Corrida da tarde';
  if (hour >= 18 && hour < 23) return 'Corrida noturna';
  return 'Corrida de madrugada';
}
