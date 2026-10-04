// FNV-1a: stable across sessions, servers and list order. No random numbers or network.
export const stableHash = (value = '') => {
  let hash = 2166136261
  for (const character of String(value)) {
    hash ^= character.codePointAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export const courseArtwork = (course = {}) => {
  const title = course.name ?? course.title ?? ''
  const category = typeof course.category === 'string' ? course.category : course.category?.name ?? ''
  const seed = stableHash(String(course._id ?? course.id ?? '') + ':' + title)
  const families = [
    { pattern: /data|analytic|science/i, family: 'lattice', palette: 1, prefix: 'DS' },
    { pattern: /engineer|frontend|front.end|develop|program|web|software/i, family: 'blocks', palette: 4, prefix: 'FE' },
    { pattern: /people|leader|human|management/i, family: 'bearings', palette: 2, prefix: 'LD' },
    { pattern: /finance|business|account|econom/i, family: 'rings', palette: 5, prefix: 'BU' },
    { pattern: /design|creativ|art/i, family: 'overlap', palette: 3, prefix: 'DE' },
    { pattern: /compliance|general|safety/i, family: 'folio', palette: 6, prefix: 'GN' },
  ]
  const match = families.find(({ pattern }) => pattern.test(category))
    ?? families.find(({ pattern }) => pattern.test(title))
    ?? { ...families[seed % families.length], palette: seed % 6 + 1 }
  const count = course.total_lessons ?? course.progress?.totalLessons ?? course.sections?.reduce((sum, section) => sum + (section.lessons?.length ?? 0), 0) ?? 6
  return {
    ...match, seed, density: Math.max(3, Math.min(12, count)),
    code: match.prefix + '·' + String(seed % 900 + 100),
    initial: Array.from(title.trim())[0]?.toUpperCase() ?? 'C',
    offset: seed % 31,
  }
}
