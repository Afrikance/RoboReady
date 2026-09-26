export type ResolutionEntity = {
  id: string
  kind: string
  canonicalName: string
  status: string
}

export type DuplicateMatchType = "exact" | "same_terms" | "near_match"

export type DuplicateCandidate<T extends ResolutionEntity = ResolutionEntity> = {
  left: T
  right: T
  matchType: DuplicateMatchType
  similarity: number
}

const MATCH_PRIORITY: Record<DuplicateMatchType, number> = {
  exact: 0,
  same_terms: 1,
  near_match: 2,
}

export function normalizeEntityName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

function jaroWinkler(left: string, right: string): number {
  if (left === right) return 1
  if (!left.length || !right.length) return 0

  const window = Math.max(Math.floor(Math.max(left.length, right.length) / 2) - 1, 0)
  const leftMatches = Array<boolean>(left.length).fill(false)
  const rightMatches = Array<boolean>(right.length).fill(false)
  let matches = 0

  for (let i = 0; i < left.length; i += 1) {
    const start = Math.max(0, i - window)
    const end = Math.min(i + window + 1, right.length)
    for (let j = start; j < end; j += 1) {
      if (rightMatches[j] || left[i] !== right[j]) continue
      leftMatches[i] = true
      rightMatches[j] = true
      matches += 1
      break
    }
  }

  if (!matches) return 0

  let transpositions = 0
  let rightIndex = 0
  for (let i = 0; i < left.length; i += 1) {
    if (!leftMatches[i]) continue
    while (!rightMatches[rightIndex]) rightIndex += 1
    if (left[i] !== right[rightIndex]) transpositions += 1
    rightIndex += 1
  }

  const halfTranspositions = transpositions / 2
  const jaro =
    (matches / left.length + matches / right.length + (matches - halfTranspositions) / matches) / 3
  let prefix = 0
  while (prefix < Math.min(4, left.length, right.length) && left[prefix] === right[prefix]) {
    prefix += 1
  }
  return jaro + prefix * 0.1 * (1 - jaro)
}

function trigrams(value: string): string[] {
  const padded = `  ${value}  `
  const grams = new Set<string>()
  for (let i = 0; i <= padded.length - 3; i += 1) grams.add(padded.slice(i, i + 3))
  return [...grams]
}

function pairKey(left: string, right: string): string {
  return left < right ? `${left}\u0000${right}` : `${right}\u0000${left}`
}

/**
 * Suggests, but never merges, same-kind active/candidate entities. Exact and
 * reordered-token matches are deterministic; fuzzy matches use a conservative
 * Jaro-Winkler threshold and shared-trigram blocking to keep comparisons bounded.
 */
export function findDuplicateCandidates<T extends ResolutionEntity>(
  entities: readonly T[],
  limit = 100,
): DuplicateCandidate<T>[] {
  const boundedLimit = Math.max(0, Math.min(Math.floor(limit), 500))
  if (!boundedLimit) return []

  const eligible = entities.filter(
    (entity) => (entity.status === "active" || entity.status === "candidate") && entity.canonicalName.trim(),
  )
  const normalized = eligible.map((entity) => ({ entity, name: normalizeEntityName(entity.canonicalName) }))
  const matches = new Map<string, DuplicateCandidate<T>>()
  const maxScanned = boundedLimit * 20

  function add(left: T, right: T, matchType: DuplicateMatchType, similarity: number) {
    if (left.id === right.id || left.kind !== right.kind || matches.size >= maxScanned) return
    const key = pairKey(left.id, right.id)
    const current = matches.get(key)
    if (current && MATCH_PRIORITY[current.matchType] <= MATCH_PRIORITY[matchType]) return
    const [first, second] = left.id < right.id ? [left, right] : [right, left]
    matches.set(key, {
      left: first,
      right: second,
      matchType,
      similarity: Math.round(similarity * 1000) / 1000,
    })
  }

  const exactGroups = new Map<string, T[]>()
  const termGroups = new Map<string, T[]>()
  for (const { entity, name } of normalized) {
    if (!name) continue
    const exactKey = `${entity.kind}\u0000${name}`
    exactGroups.set(exactKey, [...(exactGroups.get(exactKey) ?? []), entity])

    const terms = name.split(" ").sort()
    const termKey = `${entity.kind}\u0000${terms.join(" ")}`
    termGroups.set(termKey, [...(termGroups.get(termKey) ?? []), entity])
  }

  function addGroup(groups: Map<string, T[]>, matchType: DuplicateMatchType, similarity: number) {
    for (const group of groups.values()) {
      if (group.length < 2) continue
      for (let i = 0; i < group.length && matches.size < maxScanned; i += 1) {
        for (let j = i + 1; j < group.length && matches.size < maxScanned; j += 1) {
          add(group[i], group[j], matchType, similarity)
        }
      }
    }
  }

  addGroup(exactGroups, "exact", 1)
  addGroup(termGroups, "same_terms", 0.98)

  const gramBuckets = new Map<string, Array<{ entity: T; name: string }>>()
  for (const item of normalized) {
    if (item.name.length < 6) continue
    for (const gram of trigrams(item.name)) {
      const key = `${item.entity.kind}\u0000${gram}`
      const bucket = gramBuckets.get(key) ?? []
      if (bucket.length < 80) {
        bucket.push(item)
        gramBuckets.set(key, bucket)
      }
    }
  }

  const overlaps = new Map<string, { left: T; right: T; grams: number; leftName: string; rightName: string }>()
  for (const bucket of gramBuckets.values()) {
    for (let i = 0; i < bucket.length; i += 1) {
      for (let j = i + 1; j < bucket.length; j += 1) {
        const left = bucket[i]
        const right = bucket[j]
        if (left.entity.id === right.entity.id) continue
        const key = pairKey(left.entity.id, right.entity.id)
        const previous = overlaps.get(key)
        if (previous) previous.grams += 1
        else overlaps.set(key, {
          left: left.entity,
          right: right.entity,
          grams: 1,
          leftName: left.name,
          rightName: right.name,
        })
      }
    }
  }

  for (const pair of overlaps.values()) {
    if (pair.grams < 2 || matches.size >= maxScanned) continue
    const score = jaroWinkler(pair.leftName, pair.rightName)
    if (score >= 0.92) add(pair.left, pair.right, "near_match", score)
  }

  return [...matches.values()]
    .sort((a, b) =>
      MATCH_PRIORITY[a.matchType] - MATCH_PRIORITY[b.matchType] ||
      b.similarity - a.similarity ||
      a.left.canonicalName.localeCompare(b.left.canonicalName) ||
      a.right.canonicalName.localeCompare(b.right.canonicalName),
    )
    .slice(0, boundedLimit)
}

function stableValue(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

/** Keeps non-conflicting facets and stores conflicting values instead of dropping them. */
export function mergeEntityAttributes(
  primary: Record<string, unknown>,
  secondary: Record<string, unknown>,
  primaryName: string,
  secondaryName: string,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...primary }
  const alternateNames = new Set([
    ...stringList(primary.alternateNames),
    ...stringList(secondary.alternateNames),
    secondaryName,
  ])
  alternateNames.delete(primaryName)
  const alternateAttributes: Record<string, unknown[]> = {
    ...(primary.alternateAttributes && typeof primary.alternateAttributes === "object"
      ? (primary.alternateAttributes as Record<string, unknown[]> )
      : {}),
  }
  const secondaryAlternates =
    secondary.alternateAttributes && typeof secondary.alternateAttributes === "object"
      ? (secondary.alternateAttributes as Record<string, unknown[]>)
      : {}

  for (const [key, value] of Object.entries(secondary)) {
    if (key === "alternateNames" || key === "alternateAttributes") continue
    if (!(key in merged)) {
      merged[key] = value
      continue
    }
    if (stableValue(merged[key]) === stableValue(value)) continue
    const values = alternateAttributes[key] ?? [merged[key]]
    for (const candidate of [value, ...(secondaryAlternates[key] ?? [])]) {
      if (!values.some((existing) => stableValue(existing) === stableValue(candidate))) values.push(candidate)
    }
    alternateAttributes[key] = values
  }

  if (alternateNames.size) merged.alternateNames = [...alternateNames].filter((name) => name !== primaryName)
  if (Object.keys(alternateAttributes).length) merged.alternateAttributes = alternateAttributes
  return merged
}
