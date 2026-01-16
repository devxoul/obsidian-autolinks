import { describe, expect, test } from 'bun:test'
import { findAutoLinks, substituteCaptures, validatePattern } from './autolink-engine'
import type { AutoLinkRule } from './settings'

describe('validatePattern', () => {
  test('returns valid for simple pattern', () => {
    expect(validatePattern('ISSUE-\\d+')).toEqual({ valid: true })
  })

  test('returns valid for pattern with capture groups', () => {
    expect(validatePattern('ISSUE-(\\d+)')).toEqual({ valid: true })
  })

  test('returns invalid for empty string', () => {
    const result = validatePattern('')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Pattern cannot be empty')
  })

  test('returns invalid for whitespace-only string', () => {
    const result = validatePattern('   ')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Pattern cannot be empty')
  })

  test('returns invalid for malformed regex', () => {
    const result = validatePattern('[invalid')
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  test('returns invalid for unclosed group', () => {
    const result = validatePattern('(unclosed')
    expect(result.valid).toBe(false)
  })
})

describe('substituteCaptures', () => {
  test('substitutes single capture group', () => {
    const match = 'ISSUE-123'.match(/ISSUE-(\d+)/)!
    expect(substituteCaptures('https://example.com/issues/$1', match)).toBe('https://example.com/issues/123')
  })

  test('substitutes multiple capture groups', () => {
    const match = 'USER-42-ADMIN'.match(/USER-(\d+)-(\w+)/)!
    expect(substituteCaptures('https://example.com/users/$1/role/$2', match)).toBe(
      'https://example.com/users/42/role/ADMIN',
    )
  })

  test('handles missing capture group gracefully', () => {
    const match = 'ISSUE-123'.match(/ISSUE-(\d+)/)!
    expect(substituteCaptures('https://example.com/$1/$2', match)).toBe('https://example.com/123/')
  })

  test('preserves template without capture references', () => {
    const match = 'ISSUE-123'.match(/ISSUE-(\d+)/)!
    expect(substituteCaptures('https://example.com/static', match)).toBe('https://example.com/static')
  })

  test('substitutes $0 with full match', () => {
    const match = 'ISSUE-123'.match(/ISSUE-(\d+)/)!
    expect(substituteCaptures('https://example.com/$0', match)).toBe('https://example.com/ISSUE-123')
  })

  test('handles all capture groups $1 through $9', () => {
    const match = 'a-b-c-d-e-f-g-h-i'.match(/(\w)-(\w)-(\w)-(\w)-(\w)-(\w)-(\w)-(\w)-(\w)/)!
    expect(substituteCaptures('$1$2$3$4$5$6$7$8$9', match)).toBe('abcdefghi')
  })
})

describe('findAutoLinks', () => {
  const createRule = (pattern: string, url: string, enabled = true): AutoLinkRule => ({
    pattern,
    url,
    enabled,
  })

  test('finds single match', () => {
    const rules = [createRule('ISSUE-(\\d+)', 'https://github.com/issues/$1')]
    const matches = findAutoLinks('See ISSUE-123 for details', rules)

    expect(matches).toHaveLength(1)
    expect(matches[0]).toEqual({
      start: 4,
      end: 13,
      matchedText: 'ISSUE-123',
      url: 'https://github.com/issues/123',
    })
  })

  test('finds multiple matches', () => {
    const rules = [createRule('ISSUE-(\\d+)', 'https://github.com/issues/$1')]
    const matches = findAutoLinks('See ISSUE-123 and ISSUE-456', rules)

    expect(matches).toHaveLength(2)
    expect(matches[0]?.matchedText).toBe('ISSUE-123')
    expect(matches[1]?.matchedText).toBe('ISSUE-456')
  })

  test('ignores disabled rules', () => {
    const rules = [createRule('ISSUE-(\\d+)', 'https://github.com/issues/$1', false)]
    const matches = findAutoLinks('See ISSUE-123', rules)

    expect(matches).toHaveLength(0)
  })

  test('applies multiple rules', () => {
    const rules = [
      createRule('ISSUE-(\\d+)', 'https://github.com/issues/$1'),
      createRule('PR-(\\d+)', 'https://github.com/pull/$1'),
    ]
    const matches = findAutoLinks('See ISSUE-123 and PR-456', rules)

    expect(matches).toHaveLength(2)
    expect(matches[0]?.url).toBe('https://github.com/issues/123')
    expect(matches[1]?.url).toBe('https://github.com/pull/456')
  })

  test('handles first-match-wins for overlapping patterns', () => {
    const rules = [
      createRule('ISSUE-123', 'https://specific.com'),
      createRule('ISSUE-(\\d+)', 'https://generic.com/$1'),
    ]
    const matches = findAutoLinks('See ISSUE-123', rules)

    expect(matches).toHaveLength(1)
  })

  test('removes overlapping matches', () => {
    const rules = [createRule('ABC', 'https://abc.com'), createRule('BCD', 'https://bcd.com')]
    const matches = findAutoLinks('ABCD', rules)

    expect(matches).toHaveLength(1)
    expect(matches[0]?.matchedText).toBe('ABC')
  })

  test('returns empty array for no matches', () => {
    const rules = [createRule('ISSUE-(\\d+)', 'https://github.com/issues/$1')]
    const matches = findAutoLinks('No issues here', rules)

    expect(matches).toHaveLength(0)
  })

  test('returns empty array for empty rules', () => {
    const matches = findAutoLinks('ISSUE-123', [])
    expect(matches).toHaveLength(0)
  })

  test('returns empty array for empty text', () => {
    const rules = [createRule('ISSUE-(\\d+)', 'https://github.com/issues/$1')]
    const matches = findAutoLinks('', rules)

    expect(matches).toHaveLength(0)
  })

  test('skips invalid regex patterns', () => {
    const rules = [
      createRule('[invalid', 'https://invalid.com'),
      createRule('ISSUE-(\\d+)', 'https://github.com/issues/$1'),
    ]
    const matches = findAutoLinks('See ISSUE-123', rules)

    expect(matches).toHaveLength(1)
    expect(matches[0]?.matchedText).toBe('ISSUE-123')
  })

  test('handles special regex characters in pattern', () => {
    const rules = [createRule('\\$([A-Z]+)', 'https://finance.com/$1')]
    const matches = findAutoLinks('Check $AAPL stock', rules)

    expect(matches).toHaveLength(1)
    expect(matches[0]?.matchedText).toBe('$AAPL')
    expect(matches[0]?.url).toBe('https://finance.com/AAPL')
  })

  test('handles @ mentions', () => {
    const rules = [createRule('@([a-zA-Z0-9_]+)', 'https://twitter.com/$1')]
    const matches = findAutoLinks('Follow @johndoe', rules)

    expect(matches).toHaveLength(1)
    expect(matches[0]?.url).toBe('https://twitter.com/johndoe')
  })

  test('matches are sorted by position', () => {
    const rules = [createRule('\\b[A-Z]+-\\d+\\b', 'https://example.com')]
    const matches = findAutoLinks('ZZZ-999 AAA-111 MMM-555', rules)

    expect(matches).toHaveLength(3)
    expect(matches[0]?.matchedText).toBe('ZZZ-999')
    expect(matches[1]?.matchedText).toBe('AAA-111')
    expect(matches[2]?.matchedText).toBe('MMM-555')
  })

  test('handles unicode text', () => {
    const rules = [createRule('ISSUE-(\\d+)', 'https://example.com/$1')]
    const matches = findAutoLinks('日本語 ISSUE-123 テスト', rules)

    expect(matches).toHaveLength(1)
    expect(matches[0]?.matchedText).toBe('ISSUE-123')
  })

  test('handles multiline text', () => {
    const rules = [createRule('ISSUE-(\\d+)', 'https://example.com/$1')]
    const matches = findAutoLinks('Line 1: ISSUE-123\nLine 2: ISSUE-456', rules)

    expect(matches).toHaveLength(2)
  })
})
