import { describe, expect, test } from 'bun:test'
import { nodeOverlapsRange } from './live-preview'

describe('nodeOverlapsRange', () => {
  test('a node that ends exactly where the match starts does not overlap', () => {
    // e.g. a list marker's formatting node spanning [0, 2) ("- ") followed
    // immediately by a match starting at 2 - the exact shape of issue #1.
    expect(nodeOverlapsRange(0, 2, 2, 6)).toBe(false)
  })

  test('a node that starts exactly where the match ends does not overlap', () => {
    expect(nodeOverlapsRange(6, 10, 2, 6)).toBe(false)
  })

  test('a node fully containing the match overlaps', () => {
    expect(nodeOverlapsRange(0, 10, 2, 6)).toBe(true)
  })

  test('a node partially overlapping the start of the match overlaps', () => {
    expect(nodeOverlapsRange(0, 4, 2, 6)).toBe(true)
  })

  test('a node partially overlapping the end of the match overlaps', () => {
    expect(nodeOverlapsRange(4, 10, 2, 6)).toBe(true)
  })

  test('a node with no shared range does not overlap', () => {
    expect(nodeOverlapsRange(10, 20, 2, 6)).toBe(false)
  })
})
