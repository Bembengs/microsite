export const SLUG_REGEX = /^[a-z0-9-]{3,30}$/

export function isValidSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug)
}

export function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase()
}
