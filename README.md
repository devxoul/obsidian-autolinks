# Obsidian Auto Links

Auto-convert regex patterns to clickable links in Obsidian, similar to GitHub's autolink feature but with full regex support.

![obsidian-autolinks](https://github.com/user-attachments/assets/c607f168-01eb-4dca-8084-8fd5d228bdff)

![settings](https://github.com/user-attachments/assets/3cb5127a-c2a2-4621-b768-2f41c93b5d96)

## Features

- ✅ **Regex Pattern Matching**: Use full regex patterns with capture groups ($1-$9)
- ✅ **Dual Rendering**: Works in both Reading View and Live Preview
- ✅ **Per-Pattern Toggle**: Enable/disable individual patterns
- ✅ **Smart Skip Zones**: Automatically skips code blocks, inline code, existing links, wikilinks, and frontmatter
- ✅ **First-Match-Wins**: Prevents overlapping link conflicts
- ✅ **Real-time Updates**: Changes apply immediately without restart

## Installation

### From Obsidian Community Plugins (Coming Soon)

1. Open Settings → Community Plugins
2. Search for "Auto Links"
3. Click Install, then Enable

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create folder `<vault>/.obsidian/plugins/obsidian-autolinks/`
3. Copy the downloaded files into the folder
4. Reload Obsidian
5. Enable the plugin in Settings → Community Plugins

## Usage

### Adding a Pattern

1. Open Settings → Auto Links
2. Click "Add new rule"
3. Enter your regex pattern (e.g., `ISSUE-(\d+)`)
4. Enter the URL template (e.g., `https://github.com/myorg/myrepo/issues/$1`)
5. The pattern is automatically enabled

### Pattern Examples

| Pattern | URL Template | Input | Output Link |
|---------|--------------|-------|-------------|
| `ISSUE-(\d+)` | `https://github.com/myorg/myrepo/issues/$1` | `ISSUE-123` | `https://github.com/myorg/myrepo/issues/123` |
| `\$([A-Z]{3})` | `https://finance.yahoo.com/quote/$1` | `$AAPL` | `https://finance.yahoo.com/quote/AAPL` |
| `PR#(\d+)` | `https://github.com/myorg/myrepo/pull/$1` | `PR#456` | `https://github.com/myorg/myrepo/pull/456` |
| `@([a-zA-Z0-9_]+)` | `https://twitter.com/$1` | `@username` | `https://twitter.com/username` |

### Capture Groups

Use `$1` through `$9` in your URL template to reference capture groups from your regex pattern:

```
Pattern: USER-(\d+)-([A-Z]+)
URL: https://example.com/users/$1/type/$2
Input: USER-123-ADMIN
Output: https://example.com/users/123/type/ADMIN
```

### Skip Zones

Auto Links automatically skips creating links in:

- **Code blocks**: ``` ... ```
- **Inline code**: `...`
- **Markdown links**: [text](url)
- **Wikilinks**: [[page]]
- **Frontmatter**: YAML front matter at the start of files

Example:

```markdown
Normal text: ISSUE-123 ← becomes a link

Code block:
```
ISSUE-123 ← NOT a link
```

Inline code: `ISSUE-123` ← NOT a link

Existing link: [ISSUE-123](http://example.com) ← NOT a link

Wikilink: [[ISSUE-123]] ← NOT a link
```

### Managing Patterns

- **Enable/Disable**: Toggle the switch next to each pattern
- **Edit**: Click on the pattern or URL field to edit
- **Delete**: Click the trash icon to remove a pattern
- **Reorder**: Patterns are evaluated in order (first match wins)

## Pattern Conflict Resolution

When multiple patterns could match the same text, the **first matching pattern wins**. This prevents overlapping links.

Example:
```
Pattern 1: ISSUE-(\d+)
Pattern 2: ISSUE-123

Input: "See ISSUE-123"
Result: Only Pattern 1 matches (Pattern 2 never evaluated for this position)
```

## Regex Tips

### Common Patterns

- **Numbers**: `\d+` (one or more digits)
- **Letters**: `[A-Za-z]+` (one or more letters)
- **Alphanumeric**: `[A-Za-z0-9]+`
- **Word characters**: `\w+` (letters, numbers, underscore)
- **Specific characters**: `[ABC]+` (only A, B, or C)

### Escaping Special Characters

If your pattern includes special regex characters, escape them with `\`:

- `.` → `\.`
- `$` → `\$`
- `(` → `\(`
- `[` → `\[`

### Testing Patterns

Use [regex101.com](https://regex101.com/) to test your patterns before adding them to Obsidian.

## Troubleshooting

### Pattern Not Matching

1. Check if the pattern is enabled (toggle should be on)
2. Verify the regex syntax is correct
3. Check if the text is in a skip zone (code block, inline code, etc.)
4. Test the pattern on [regex101.com](https://regex101.com/)

### Links Not Appearing

1. Ensure the plugin is enabled in Settings → Community Plugins
2. Check browser console for errors (Ctrl+Shift+I / Cmd+Option+I)
3. Try disabling and re-enabling the plugin
4. Verify the URL template uses correct capture group syntax ($1, $2, etc.)

### Invalid Regex Error

The plugin validates regex patterns when you save. If you see an error:

1. Check for unmatched brackets: `[`, `]`, `(`, `)`
2. Check for unescaped special characters
3. Verify capture groups are properly formed: `(...)` not `(...`

## Performance

Auto Links is designed for performance:

- **Reading View**: Processes only visible text nodes
- **Live Preview**: Uses CodeMirror's syntax tree for efficient skip zone detection
- **Lazy Evaluation**: Patterns are only evaluated when text changes
- **First-Match-Wins**: Stops evaluation after first match per position

## Development

### Building from Source

```bash
# Install dependencies
bun install

# Development build (watch mode)
bun run dev

# Production build
bun run build
```

## License

MIT
