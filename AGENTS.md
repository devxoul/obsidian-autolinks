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
bun run audit       # Scan dependency tree for known vulnerabilities (bun audit)
bun run review      # Run the full local review: typecheck + lint + format:check + test + audit
```

## Community Plugin Review

The Obsidian Community Plugin submission/update flow runs `ObsidianReviewBot`, which posts automated warnings on the PR in `obsidianmd/obsidian-releases`. Two warning classes show up for this plugin, both reproducible locally via `bun run review`:

- **JS/TS + CSS lint** — the bot's open-source checks come from [`eslint-plugin-obsidianmd`](https://github.com/obsidianmd/eslint-plugin), which this repo runs through oxlint as a JS plugin (`jsPlugins` in `.oxlintrc.json`). `bun run lint` reproduces these. CSS `!important` is flagged per Obsidian's theme guidelines — win specificity instead (see `styles.css`: scope the rule to `input.auto-link-error` plus its `:hover`/`:focus`/`:active` states rather than using `!important`).
- **Dependency vulnerabilities** — the bot scans the dependency tree and flags "Potentially vulnerable dependency". `bun audit` reproduces the exact list. Every flagged package is a dev-only transitive dependency of `eslint-plugin-obsidianmd` — **none are bundled into the shipped `main.js`** — but all findings are nonetheless patched via `overrides` so `bun audit` reports clean.

### Dependency Audit Policy

`bun audit` must report **zero** vulnerabilities; `bun run review` enforces this. All findings are patched through the `overrides` block in `package.json`:

- Bun 1.3.x `overrides` are **flat/global** — there is no major-scoped or nested override syntax ([Bun docs](https://bun.com/docs/pm/overrides); tracking issue [oven-sh/bun#6608](https://github.com/oven-sh/bun/issues/6608)). A single override forces **every** instance of a package to that version.
- For packages with one major in the tree, the override is a same-major bump (`flatted`, `picomatch`, `yaml`, `fast-uri`, `minimatch@^9.0.7`, `brace-expansion@^2.0.3`).
- **Do NOT override `ajv`.** `@eslint/eslintrc` (pulled in by `eslint-plugin-obsidianmd`) declares `ajv: ^6.12.4` and uses ajv v6-only APIs (the `missingRefs` option / `defaultMeta`). Because Bun overrides are flat/global, forcing `ajv@8` collapses eslintrc's `ajv@6` too, and eslintrc then crashes at lint time with `NOT SUPPORTED: option missingRefs` / `Cannot set properties of undefined (setting 'defaultMeta')`. This breaks `bun run lint` in any clean `bun install --frozen-lockfile` install (i.e. CI), even if a stale local `node_modules` (holding a nested `ajv@6`) masks it. Without the override, Bun resolves a single safe `ajv@6.15.0` and `bun audit` still reports zero vulnerabilities — so the override is both unnecessary and harmful.
- Keep `eslint-plugin-obsidianmd` pinned at `^0.1.9`. Bumping to `^0.3.0` does not reduce the audit surface and introduces false-positive `ui/sentence-case` lint errors on regex/URL example strings in the settings UI.
- When adding any dependency, re-run `bun audit`. If new transitive findings appear, extend `overrides` with the minimum safe version, then verify against a **clean** install (`rm -rf node_modules bun.lock && bun install`, then `rm -rf node_modules && bun install --frozen-lockfile`) — never trust a stale local `node_modules` — and confirm `bun run review` stays green.

## Release

Use the **Release** GitHub Actions workflow (`workflow_dispatch`, see `.github/workflows/release.yml`). It typechecks, lints, format-checks, tests, bumps the version in `package.json` / `manifest.json`, builds `main.js`, commits, tags, and creates a GitHub Release with `main.js`, `manifest.json`, and `styles.css` attached for manual installation. Tags have no `v` prefix (use `1.1.0`, not `v1.1.0`).

The workflow is the only supported release path. Plugin asset attachments (`main.js`, `manifest.json`, `styles.css`) are required so users can install manually outside the Obsidian Community Plugins directory.

### Version Decision

- If the user specifies an exact version (e.g., `1.2.0`), use it as-is.
  Otherwise, the agent decides the bump level based on the changes since the last release (never bump major unless the user explicitly asks):
  - **minor** — New features, new pattern capabilities, breaking changes
  - **patch** — Bug fixes, refactors, docs, dependency updates, minor improvements
- Never ask the user which version to bump. Decide and proceed.
