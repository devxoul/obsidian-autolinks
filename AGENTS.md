# obsidian-autolinks

Obsidian plugin that auto-converts regex patterns into clickable links in both Reading View and Live Preview.

## Commands

```bash
bun install         # Install dependencies
bun run dev         # Development build (watch mode)
bun run build       # Production build (typecheck + esbuild) → main.js
bun run typecheck   # Type check without emitting
bun run lint        # Lint with oxlint
bun run lint:fix    # Lint with oxlint (autofix)
bun run format      # Format with oxfmt
bun run format:check # Check formatting with oxfmt
bun test            # Run tests
```

## Release

Use the **Release** GitHub Actions workflow (`workflow_dispatch`, see `.github/workflows/release.yml`). It typechecks, lints, format-checks, tests, bumps the version in `package.json` / `manifest.json`, builds `main.js`, commits, tags, and creates a GitHub Release with `main.js`, `manifest.json`, and `styles.css` attached for manual installation. Tags have no `v` prefix (use `1.1.0`, not `v1.1.0`).

The workflow is the only supported release path. Plugin asset attachments (`main.js`, `manifest.json`, `styles.css`) are required so users can install manually outside the Obsidian Community Plugins directory.

### Version Decision

- If the user specifies an exact version (e.g., `1.2.0`), use it as-is.
  Otherwise, the agent decides the bump level based on the changes since the last release (never bump major unless the user explicitly asks):
  - **minor** — New features, new pattern capabilities, breaking changes
  - **patch** — Bug fixes, refactors, docs, dependency updates, minor improvements
- Never ask the user which version to bump. Decide and proceed.
