/**
 * Slugs that cannot be claimed as a public username/BioLink slug
 * because they collide with app routes or system paths.
 *
 * Used later (Tahap 2+) when validating slug registration.
 * Keep this list in sync with routes defined in App.tsx.
 */
export const reservedSlugs = [
  "login",
  "dashboard",
  "admin",
  "api",
  "settings",
  "404",
  "onboarding",
  "auth",
  "logout",
] as const

export type ReservedSlug = (typeof reservedSlugs)[number]

export function isReservedSlug(slug: string): boolean {
  return reservedSlugs.includes(slug.toLowerCase() as ReservedSlug)
}
