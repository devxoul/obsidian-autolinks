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
- **Dependency vulnerabilities** — the bot scans the dependency tree and flags "Potentially vulnerable dependency". `bun audit` reproduces the exact list. **Every flagged package is a dev-only transitive dependency of `eslint-plugin-obsidianmd` — none are bundled into the shipped `main.js`**, so they have no runtime impact on users.

### Dependency Audit Policy

- Patch what is safely patchable. `overrides` in `package.json` force minimum-safe versions for leaf packages that have only one major in the tree (`flatted`, `picomatch`, `yaml`, `fast-uri`).
- Do **not** force `minimatch`, `ajv`, or `brace-expansion` via overrides. Multiple incompatible majors coexist in the ESLint toolchain (e.g. `ajv@6` is pinned deliberately by `@eslint/eslintrc`; `minimatch@3 → 9` changes the module shape). Bun's `overrides` are global/flat and cannot scope by major, so forcing these would break `bun run lint`/`bun run build` for no user-facing benefit.
- Bumping `eslint-plugin-obsidianmd` does not currently collapse the multi-major tree and introduces new false-positive lint errors, so it stays pinned at `^0.1.9`.
- The remaining `bun audit` findings are accepted as dev-only, non-bundled risk. Revisit only if the bot turns warnings into blockers.

## Release

Use the **Release** GitHub Actions workflow (`workflow_dispatch`, see `.github/workflows/release.yml`). It typechecks, lints, format-checks, tests, bumps the version in `package.json` / `manifest.json`, builds `main.js`, commits, tags, and creates a GitHub Release with `main.js`, `manifest.json`, and `styles.css` attached for manual installation. Tags have no `v` prefix (use `1.1.0`, not `v1.1.0`).

The workflow is the only supported release path. Plugin asset attachments (`main.js`, `manifest.json`, `styles.css`) are required so users can install manually outside the Obsidian Community Plugins directory.

### Version Decision

- If the user specifies an exact version (e.g., `1.2.0`), use it as-is.
  Otherwise, the agent decides the bump level based on the changes since the last release (never bump major unless the user explicitly asks):
  - **minor** — New features, new pattern capabilities, breaking changes
  - **patch** — Bug fixes, refactors, docs, dependency updates, minor improvements
- Never ask the user which version to bump. Decide and proceed.
