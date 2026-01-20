# Release Command

Bump version and create a new release for the Obsidian plugin.

## Arguments

- `$ARGUMENTS` - The new version number (e.g., `1.0.5`)

## Version Files to Update

Update the version in these files:

1. **package.json** (line 6) - `"version": "X.X.X"`
2. **manifest.json** (line 4) - `"version": "X.X.X"`

## Release Steps

### Step 1: Validate Version Argument

Ensure `$ARGUMENTS` is provided and is a valid semver version (e.g., `1.0.5`).
If not provided, ask the user for the version number.

### Step 2: Update Version in All Files

Update the version string in each file listed above. Use the Edit tool for precise updates.

### Step 3: Build

Run the build command:
```bash
bun run build
```

Ensure the build succeeds before proceeding.

### Step 4: Create Commit

Stage and commit all changes including:
- Version file changes (package.json, manifest.json)
- Build output (main.js)

Commit message format:
```
$ARGUMENTS
```

### Step 5: Create Tag and Push

Create a git tag with the version:
```bash
git tag $ARGUMENTS
git push origin main
git push origin $ARGUMENTS
```

### Step 6: Create GitHub Release

Create a GitHub release using `gh release create`:
- Tag: `$ARGUMENTS`
- Title: `$ARGUMENTS`
- Generate release notes automatically
- Attach plugin files: `main.js`, `manifest.json`, `styles.css`

```bash
gh release create $ARGUMENTS --title "$ARGUMENTS" --generate-notes main.js manifest.json styles.css
```

## Important Notes

- **No `v` prefix**: Tags and release titles should NOT include the `v` prefix (use `1.0.5` not `v1.0.5`)
- **Plugin files**: The release must include `main.js`, `manifest.json`, and `styles.css` as attachments for manual installation
- **Build before commit**: Always build before committing to ensure `main.js` is up to date
