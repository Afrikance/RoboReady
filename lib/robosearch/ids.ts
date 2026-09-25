// Small pure helpers for the RoboGraph: id generation, slugs, and the
// normalized dedupe key the resolver uses to detect duplicate entities.

export function newId(): string {
  return crypto.randomUUID()
}

/** URL-safe handle from a name, e.g. "PUDU BellaBot" -> "pudu-bellabot". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

/**
 * Normalized key for entity resolution. "Pudu BellaBot" and "BellaBot by PUDU"
 * won't collide here (order differs) — this is intentionally conservative: it
 * only auto-merges obvious same-name duplicates. Harder cases are a future
 * RESOLVE_DUPLICATE flow, not a silent guess.
 */
export function dedupeKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}
