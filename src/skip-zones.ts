export interface TextRange {
  start: number
  end: number
}

export function findSkipZones(text: string): TextRange[] {
  const zones: TextRange[] = []

  // 1. Frontmatter (only at start of file)
  const frontmatterMatch = text.match(/^---\n[\s\S]*?\n---\n/)
  if (frontmatterMatch && frontmatterMatch.index === 0) {
    zones.push({
      start: 0,
      end: frontmatterMatch[0].length,
    })
  }

  // 2. Fenced code blocks
  const fencedCodeMatches = text.matchAll(/```[\s\S]*?```/g)
  for (const match of fencedCodeMatches) {
    let start = 0
    if (match.index !== undefined) {
      start = match.index
    }
    zones.push({
      start,
      end: start + match[0].length,
    })
  }

  // 3. Markdown links
  const markdownLinkMatches = text.matchAll(/\[([^\]]+)\]\([^)]+\)/g)
  for (const match of markdownLinkMatches) {
    let start = 0
    if (match.index !== undefined) {
      start = match.index
    }
    zones.push({
      start,
      end: start + match[0].length,
    })
  }

  // 4. Wikilinks
  const wikilinkMatches = text.matchAll(/\[\[([^\]]+)\]\]/g)
  for (const match of wikilinkMatches) {
    let start = 0
    if (match.index !== undefined) {
      start = match.index
    }
    zones.push({
      start,
      end: start + match[0].length,
    })
  }

  // 5. Inline code
  const inlineCodeMatches = text.matchAll(/`[^`]+`/g)
  for (const match of inlineCodeMatches) {
    let start = 0
    if (match.index !== undefined) {
      start = match.index
    }
    zones.push({
      start,
      end: start + match[0].length,
    })
  }

  // Sort by start position and merge overlapping zones
  zones.sort((a, b) => a.start - b.start)

  // Merge overlapping zones (first-match-wins)
  const merged: TextRange[] = []
  let lastEnd = -1
  for (const zone of zones) {
    if (zone.start >= lastEnd) {
      merged.push(zone)
      lastEnd = zone.end
    } else if (zone.end > lastEnd) {
      // Extend the last zone if this one ends later
      const last = merged[merged.length - 1]
      if (last) {
        last.end = zone.end
        lastEnd = zone.end
      }
    }
  }

  return merged
}

export function isInSkipZone(position: number, skipZones: TextRange[]): boolean {
  for (const zone of skipZones) {
    if (position >= zone.start && position < zone.end) {
      return true
    }
  }
  return false
}
