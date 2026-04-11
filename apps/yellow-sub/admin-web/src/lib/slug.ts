function normalizeBase(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Lowercase slug: letters, numbers, hyphens only. */
export function slugifyFromTitle(raw: string): string {
  return normalizeBase(raw)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

/** Plan / product family keys (same sanitisation; allows manual underscores in the field). */
export function keyifyFromTitle(raw: string): string {
  return slugifyFromTitle(raw);
}
