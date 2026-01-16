import { describe, expect, test } from 'bun:test'
import { findSkipZones, isInSkipZone, type TextRange } from './skip-zones'

describe('findSkipZones', () => {
  describe('frontmatter', () => {
    test('detects frontmatter at start of file', () => {
      const text = `---
title: Test
---
Content here`
      const zones = findSkipZones(text)

      expect(zones.length).toBeGreaterThanOrEqual(1)
      expect(zones[0]?.start).toBe(0)
      expect(zones[0]?.end).toBe(20)
    })

    test('ignores frontmatter-like content not at start', () => {
      const text = `Some content
---
not: frontmatter
---
More content`
      const zones = findSkipZones(text)

      const frontmatterZone = zones.find((z) => z.start === 0 && text.substring(z.start, z.end).startsWith('---'))
      expect(frontmatterZone).toBeUndefined()
    })
  })

  describe('fenced code blocks', () => {
    test('detects simple code block', () => {
      const text = 'Before\n```\ncode\n```\nAfter'
      const zones = findSkipZones(text)

      const codeZone = zones.find((z) => text.substring(z.start, z.end).includes('code'))
      expect(codeZone).toBeDefined()
    })

    test('detects code block with language', () => {
      const text = 'Before\n```javascript\nconst x = 1;\n```\nAfter'
      const zones = findSkipZones(text)

      const codeZone = zones.find((z) => text.substring(z.start, z.end).includes('javascript'))
      expect(codeZone).toBeDefined()
    })

    test('detects multiple code blocks', () => {
      const text = '```\nblock1\n```\n\nMiddle text here\n\n```\nblock2\n```'
      const zones = findSkipZones(text)

      const block1Start = text.indexOf('block1')
      const block2Start = text.indexOf('block2')
      expect(isInSkipZone(block1Start, zones)).toBe(true)
      expect(isInSkipZone(block2Start, zones)).toBe(true)
    })

    test('handles code block with ISSUE pattern inside', () => {
      const text = '```\nISSUE-123\n```'
      const zones = findSkipZones(text)

      expect(zones.length).toBeGreaterThanOrEqual(1)
      const codeZone = zones.find((z) => z.start === 0)
      expect(codeZone).toBeDefined()
      expect(codeZone!.end).toBe(text.length)
    })
  })

  describe('markdown links', () => {
    test('detects simple markdown link', () => {
      const text = 'Click [here](https://example.com) for more'
      const zones = findSkipZones(text)

      const linkZone = zones.find((z) => text.substring(z.start, z.end).includes('[here]'))
      expect(linkZone).toBeDefined()
      expect(text.substring(linkZone!.start, linkZone!.end)).toBe('[here](https://example.com)')
    })

    test('detects multiple markdown links', () => {
      const text = '[Link1](url1) and [Link2](url2)'
      const zones = findSkipZones(text)

      expect(zones.length).toBe(2)
    })

    test('detects markdown link with ISSUE pattern in text', () => {
      const text = 'See [ISSUE-123](https://example.com) for details'
      const zones = findSkipZones(text)

      const linkZone = zones.find((z) => text.substring(z.start, z.end).includes('ISSUE-123'))
      expect(linkZone).toBeDefined()
    })
  })

  describe('wikilinks', () => {
    test('detects simple wikilink', () => {
      const text = 'See [[My Note]] for more'
      const zones = findSkipZones(text)

      const wikiZone = zones.find((z) => text.substring(z.start, z.end).includes('[['))
      expect(wikiZone).toBeDefined()
      expect(text.substring(wikiZone!.start, wikiZone!.end)).toBe('[[My Note]]')
    })

    test('detects wikilink with alias', () => {
      const text = 'See [[My Note|Display Text]] for more'
      const zones = findSkipZones(text)

      const wikiZone = zones.find((z) => text.substring(z.start, z.end).includes('[['))
      expect(wikiZone).toBeDefined()
    })

    test('detects multiple wikilinks', () => {
      const text = '[[Note1]] and [[Note2]]'
      const zones = findSkipZones(text)

      expect(zones.length).toBe(2)
    })

    test('detects wikilink with ISSUE pattern', () => {
      const text = 'See [[ISSUE-123]] for details'
      const zones = findSkipZones(text)

      const wikiZone = zones.find((z) => text.substring(z.start, z.end).includes('ISSUE-123'))
      expect(wikiZone).toBeDefined()
    })
  })

  describe('inline code', () => {
    test('detects simple inline code', () => {
      const text = 'Use `code` here'
      const zones = findSkipZones(text)

      const codeZone = zones.find((z) => text.substring(z.start, z.end) === '`code`')
      expect(codeZone).toBeDefined()
    })

    test('detects multiple inline code spans', () => {
      const text = 'Use `code1` and `code2` here'
      const zones = findSkipZones(text)

      const codeZones = zones.filter((z) => text.substring(z.start, z.end).startsWith('`'))
      expect(codeZones.length).toBe(2)
    })

    test('detects inline code with ISSUE pattern', () => {
      const text = 'Use `ISSUE-123` as example'
      const zones = findSkipZones(text)

      const codeZone = zones.find((z) => text.substring(z.start, z.end).includes('ISSUE-123'))
      expect(codeZone).toBeDefined()
    })
  })

  describe('combined scenarios', () => {
    test('handles text with no skip zones', () => {
      const text = 'Plain text with ISSUE-123'
      const zones = findSkipZones(text)

      expect(zones).toHaveLength(0)
    })

    test('handles mixed skip zones', () => {
      const text = `---
title: Test
---
See [link](url) and \`code\` and [[wiki]]`
      const zones = findSkipZones(text)

      expect(zones.length).toBeGreaterThanOrEqual(4)
    })

    test('merges overlapping zones', () => {
      const text = '`[link](url)`'
      const zones = findSkipZones(text)

      expect(zones.length).toBe(1)
    })

    test('handles empty text', () => {
      const zones = findSkipZones('')
      expect(zones).toHaveLength(0)
    })

    test('zones are sorted by start position', () => {
      const text = '[[wiki]] middle `code` end [link](url)'
      const zones = findSkipZones(text)

      for (let i = 1; i < zones.length; i++) {
        expect(zones[i]!.start).toBeGreaterThanOrEqual(zones[i - 1]!.end)
      }
    })
  })
})

describe('isInSkipZone', () => {
  const createZones = (...ranges: [number, number][]): TextRange[] => ranges.map(([start, end]) => ({ start, end }))

  test('returns true when position is inside a zone', () => {
    const zones = createZones([5, 10])
    expect(isInSkipZone(7, zones)).toBe(true)
  })

  test('returns true when position is at zone start', () => {
    const zones = createZones([5, 10])
    expect(isInSkipZone(5, zones)).toBe(true)
  })

  test('returns false when position is at zone end', () => {
    const zones = createZones([5, 10])
    expect(isInSkipZone(10, zones)).toBe(false)
  })

  test('returns false when position is before all zones', () => {
    const zones = createZones([5, 10])
    expect(isInSkipZone(2, zones)).toBe(false)
  })

  test('returns false when position is after all zones', () => {
    const zones = createZones([5, 10])
    expect(isInSkipZone(15, zones)).toBe(false)
  })

  test('returns false for empty zones array', () => {
    expect(isInSkipZone(5, [])).toBe(false)
  })

  test('checks multiple zones', () => {
    const zones = createZones([0, 5], [10, 15], [20, 25])

    expect(isInSkipZone(3, zones)).toBe(true)
    expect(isInSkipZone(7, zones)).toBe(false)
    expect(isInSkipZone(12, zones)).toBe(true)
    expect(isInSkipZone(17, zones)).toBe(false)
    expect(isInSkipZone(22, zones)).toBe(true)
  })

  test('handles position at 0', () => {
    const zones = createZones([0, 5])
    expect(isInSkipZone(0, zones)).toBe(true)
  })

  test('handles adjacent zones', () => {
    const zones = createZones([0, 5], [5, 10])

    expect(isInSkipZone(4, zones)).toBe(true)
    expect(isInSkipZone(5, zones)).toBe(true)
    expect(isInSkipZone(6, zones)).toBe(true)
  })
})

describe('integration: findSkipZones + isInSkipZone', () => {
  test('correctly identifies positions in code blocks', () => {
    const text = 'Before ```ISSUE-123``` After'
    const zones = findSkipZones(text)

    const issueStart = text.indexOf('ISSUE-123')
    expect(isInSkipZone(issueStart, zones)).toBe(true)
  })

  test('correctly identifies positions outside skip zones', () => {
    const text = 'ISSUE-123 ```code``` ISSUE-456'
    const zones = findSkipZones(text)

    const firstIssueStart = 0
    const lastIssueStart = text.lastIndexOf('ISSUE-456')

    expect(isInSkipZone(firstIssueStart, zones)).toBe(false)
    expect(isInSkipZone(lastIssueStart, zones)).toBe(false)
  })

  test('correctly identifies positions in inline code', () => {
    const text = 'See `ISSUE-123` for example'
    const zones = findSkipZones(text)

    const issueStart = text.indexOf('ISSUE-123')
    expect(isInSkipZone(issueStart, zones)).toBe(true)
  })

  test('correctly identifies positions in wikilinks', () => {
    const text = 'See [[ISSUE-123]] for details'
    const zones = findSkipZones(text)

    const issueStart = text.indexOf('ISSUE-123')
    expect(isInSkipZone(issueStart, zones)).toBe(true)
  })

  test('correctly identifies positions in markdown links', () => {
    const text = 'See [ISSUE-123](https://example.com) here'
    const zones = findSkipZones(text)

    const issueStart = text.indexOf('ISSUE-123')
    expect(isInSkipZone(issueStart, zones)).toBe(true)
  })
})
