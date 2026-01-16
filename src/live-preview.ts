import { Extension } from '@codemirror/state'
import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from '@codemirror/view'
import { findAutoLinks } from './autolink-engine'
import AutoLinksPlugin from './main'

// Import syntaxTree from @codemirror/language if available
// This is provided by Obsidian at runtime
let syntaxTree: any
try {
  const lang = require('@codemirror/language')
  syntaxTree = lang.syntaxTree
} catch (_e) {
  // Fallback if not available
  syntaxTree = null
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
    link.onclick = (e) => {
      e.preventDefault()
      window.open(this.url, '_blank')
    }
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
    const decorations: any[] = []
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
        if (syntaxTree) {
          const tree = syntaxTree(view.state)
          tree.iterate({
            from,
            to,
            enter: (node: any) => {
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
        }

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
