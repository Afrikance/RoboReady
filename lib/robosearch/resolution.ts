import type { RoboEntityView } from "./types"

export type DuplicateCandidate = {
  left: RoboEntityView
  right: RoboEntityView
  score: number
  reason: string
}

const CORPORATE_SUFFIXES = new Set([
  "inc",
  "incorporated",
  "corp",
  "corporation",
  "llc",
  "ltd",
  "limited",
  "company",
  "co",
])

function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token && !CORPORATE_SUFFIXES.has(token))
    .join(" ")
}

function tokenDice(left: string, right: string): number {
  const a = new Set(left.split(" ").filter(Boolean))
  const b = new Set(right.split(" ").filter(Boolean))
  if (a.size === 0 || b.size === 0) return 0
  let overlap = 0
  for (const token of a) if (b.has(token)) overlap += 1
  return (2 * overlap) / (a.size + b.size)
}

function editSimilarity(left: string, right: string): number {
  if (!left || !right) return 0
  if (left === right) return 1
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0]
    previous[0] = i
    for (let j = 1; j <= right.length; j += 1) {
      const above = previous[j]
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1),
      )
      diagonal = above
    }
  }
  return 1 - previous[right.length] / Math.max(left.length, right.length)
}

function scoreNames(left: string, right: string): number {
  if (left === right) return 1
  return tokenDice(left, right) * 0.62 + editSimilarity(left, right) * 0.38
}

export function findDuplicateCandidates(
  entities: RoboEntityView[],
  threshold = 0.76,
  limit = 100,
): DuplicateCandidate[] {
  const groups = new Map<string, Array<{ entity: RoboEntityView; normalized: string }>>()
  for (const entity of entities) {
    if (entity.status !== "active" && entity.status !== "candidate") continue
    const normalized = normalizeName(entity.canonicalName)
    if (!normalized) continue
    const group = groups.get(entity.kind) ?? []
    group.push({ entity, normalized })
    groups.set(entity.kind, group)
  }

  const candidates: DuplicateCandidate[] = []
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const left = group[i]
        const right = group[j]
        const score = scoreNames(left.normalized, right.normalized)
        if (score < threshold) continue
        candidates.push({
          left: left.entity,
          right: right.entity,
          score: Math.round(score * 100),
          reason: score === 1 ? "Same normalized name" : "Similar normalized names",
        })
      }
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score || a.left.canonicalName.localeCompare(b.left.canonicalName))
    .slice(0, Math.max(0, limit))
}
