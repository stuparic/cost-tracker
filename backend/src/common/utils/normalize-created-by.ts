/**
 * Normalizes the createdBy name to "Title case" so records group correctly
 * per person. Historically the voice flow sent lowercase user ids ('dejan')
 * while manual forms sent proper names ('Dejan'), splitting per-person stats.
 */
export function normalizeCreatedBy(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
