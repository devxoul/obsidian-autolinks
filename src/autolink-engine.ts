import { AutoLinkRule } from './settings'

export interface AutoLinkMatch {
  start: number // Start index in text
  end: number // End index in text
  matchedText: string // Original matched text
  url: string // Resolved URL with substitutions
}

/**
 * Find all auto-link matches in text using enabled rules.
 * Implements first-match-wins for overlapping patterns.
 */
export function findAutoLinks(text: string, rules: AutoLinkRule[]): AutoLinkMatch[] {
  const matches: AutoLinkMatch[] = []

  // Process only enabled rules
  const enabledRules = rules.filter((rule) => rule.enabled)

  for (const rule of enabledRules) {
    // Validate pattern before using
    const validation = validatePattern(rule.pattern)
    if (!validation.valid) {
      continue // Skip invalid patterns
    }

    try {
      const regex = new RegExp(rule.pattern, 'g')
      let match: RegExpExecArray | null

      while ((match = regex.exec(text)) !== null) {
        const start = match.index
        const end = start + match[0].length
        const matchedText = match[0]
        const url = substituteCaptures(rule.url, match)

        matches.push({ start, end, matchedText, url })
      }
    } catch (_e) {}
  }

  // Sort by start position
  matches.sort((a, b) => a.start - b.start)

  // Remove overlapping matches (first-match-wins)
  const nonOverlapping: AutoLinkMatch[] = []
  let lastEnd = -1

  for (const match of matches) {
    if (match.start >= lastEnd) {
      nonOverlapping.push(match)
      lastEnd = match.end
    }
  }

  return nonOverlapping
}

/**
 * Replace $1, $2, ... $9 in URL template with capture groups.
 */
export function substituteCaptures(template: string, match: RegExpMatchArray | RegExpExecArray): string {
  return template.replace(/\$(\d)/g, (_, n) => {
    const index = parseInt(n, 10)
    return match[index] || ''
  })
}

/**
 * Validate a regex pattern.
 */
export function validatePattern(pattern: string): { valid: boolean; error?: string } {
  if (!pattern || pattern.trim() === '') {
    return { valid: false, error: 'Pattern cannot be empty' }
  }

  try {
    new RegExp(pattern)
    return { valid: true }
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'Invalid regex' }
  }
}
