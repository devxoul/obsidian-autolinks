import { syntaxTree } from '@codemirror/language'
import { Extension, Range } from '@codemirror/state'
import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from '@codemirror/view'
import type { SyntaxNodeRef } from '@lezer/common'
import { findAutoLinks } from './autolink-engine'
import AutoLinksPlugin from './main'

/**
 * Whether a syntax node's own range genuinely overlaps [from, to), as
 * opposed to merely touching one of its boundary points.
 *
 * `Tree.iterate` calls `enter` for any node that *touches* the from/to
 * region (`node.from <= to && node.to >= from`), which also matches a node
 * that ends exactly at `from` or starts exactly at `to` - e.g. a list
 * marker's formatting node ending right where the following text begins.
 * Skip-zone checks care about actual overlap with the matched text, so
 * touching nodes must be excluded explicitly.
 */
export function nodeOverlapsRange(nodeFrom: number, nodeTo: number, from: number, to: number): boolean {
  return nodeFrom < to && nodeTo > from
}

/**
 * Widget that renders an auto-link as a clickable anchor element.
 */
class AutoLinkWidget extends WidgetType {
  constructor(
    readonly url: string,
    readonly text: string,
  ) {
    super()
  }

  toDOM(): HTMLElement {
    const link = document.createElement('a')
    link.href = this.url
    link.textContent = this.text
    link.className = 'auto-link external-link cm-link'
    return link
  }
}

/**
 * View plugin that decorates auto-links in Live Preview.
 */
class AutoLinkPlugin implements PluginValue {
  decorations: DecorationSet

  constructor(
    readonly view: EditorView,
    readonly plugin: AutoLinksPlugin,
  ) {
    this.decorations = this.buildDecorations(view)
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.decorations = this.buildDecorations(update.view)
    }
  }

  buildDecorations(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = []
    const doc = view.state.doc
    const cursorPos = view.state.selection.main.head

    // Process each line in viewport
    for (let i = 1; i <= doc.lines; i++) {
      const line = doc.line(i)
      const text = line.text

      // Find matches in this line
      const matches = findAutoLinks(text, this.plugin.settings.rules)

      for (const match of matches) {
        const from = line.from + match.start
        const to = line.from + match.end

        // Don't decorate if cursor is within the match
        if (cursorPos >= from && cursorPos <= to) {
          continue
        }

        // Check if match is in a skip zone using syntax tree (if available)
        let inSkipZone = false
        const tree = syntaxTree(view.state)
        tree.iterate({
          from,
          to,
          enter: (node: SyntaxNodeRef) => {
            if (!nodeOverlapsRange(node.from, node.to, from, to)) {
              return
            }
            const nodeType = node.type.name.toLowerCase()
            // Skip if inside code, link, or inline-code nodes
            if (
              nodeType.includes('code') ||
              nodeType.includes('link') ||
              nodeType.includes('inline') ||
              nodeType.includes('hmd-codeblock') ||
              nodeType.includes('formatting')
            ) {
              inSkipZone = true
            }
          },
        })

        if (inSkipZone) {
          continue
        }

        // Create decoration
        const decoration = Decoration.replace({
          widget: new AutoLinkWidget(match.url, match.matchedText),
        })

        decorations.push(decoration.range(from, to))
      }
    }

    return Decoration.set(decorations, true)
  }

  destroy() {}
}

/**
 * Create CodeMirror 6 extension for Live Preview auto-links.
 */
export function createEditorExtension(plugin: AutoLinksPlugin): Extension {
  return ViewPlugin.fromClass(
    class extends AutoLinkPlugin {
      constructor(view: EditorView) {
        super(view, plugin)
      }
    },
    {
      decorations: (value) => value.decorations,
    },
  )
}
