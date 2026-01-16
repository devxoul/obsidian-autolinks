import { MarkdownPostProcessor, MarkdownPostProcessorContext } from 'obsidian'
import { findAutoLinks } from './autolink-engine'
import AutoLinksPlugin from './main'
import { findSkipZones, isInSkipZone } from './skip-zones'

/**
 * Create a markdown post-processor for Reading View.
 * Walks text nodes and replaces matches with clickable links.
 */
export function createPostProcessor(plugin: AutoLinksPlugin): MarkdownPostProcessor {
  return (el: HTMLElement, _ctx: MarkdownPostProcessorContext) => {
    // Walk all text nodes in the element
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null)

    const textNodes: Node[] = []
    let node = walker.nextNode()
    while (node) {
      textNodes.push(node)
      node = walker.nextNode()
    }

    // Process each text node
    for (const textNode of textNodes) {
      const text = textNode.textContent || ''
      if (!text) continue

      // Find skip zones first
      const skipZones = findSkipZones(text)

      // Find matches using autolink engine
      const matches = findAutoLinks(text, plugin.settings.rules)

      // Filter out matches in skip zones
      const validMatches = matches.filter((match) => !isInSkipZone(match.start, skipZones))
      if (validMatches.length === 0) continue

      // Create document fragment with links
      const fragment = document.createDocumentFragment()
      let lastIndex = 0

      for (const match of validMatches) {
        // Add text before match
        if (match.start > lastIndex) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.start)))
        }

        // Create link element
        const link = document.createElement('a')
        link.href = match.url
        link.textContent = match.matchedText
        link.className = 'auto-link external-link'
        fragment.appendChild(link)

        lastIndex = match.end
      }

      // Add remaining text after last match
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)))
      }

      // Replace text node with fragment
      textNode.parentNode?.replaceChild(fragment, textNode)
    }
  }
}
