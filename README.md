# Lodestar

Personal operations console for macOS. Local-first, single-user, single-machine.
Three modules: job application pipeline, habit tracking, money tracking (ledger).

Built with Tauri 2 + Svelte 5. All data lives in SQLite at
`~/Library/Application Support/com.tylerpixel.lodestar/lodestar.db` — outside the
app bundle, untouched by updates.

Strictly personal software: unsigned (ad-hoc), no notarisation. A freshly
downloaded .dmg install triggers the Gatekeeper "damaged" dialog on Apple
Silicon; fix once with:

```sh
xattr -d com.apple.quarantine /Applications/Lodestar.app
```

Updates after that flow through the built-in updater with no prompts.

## Development

```sh
npm install
npm run tauri dev
```

## Releasing

```sh
scripts/release.sh X.Y.Z "commit message"
```

Bumps both version fields, runs check + build, commits, tags `vX.Y.Z`, and pushes.

CI builds the .dmg and updater artifacts, signs the update with the Tauri updater
key (`TAURI_SIGNING_PRIVATE_KEY` repo secret; keypair lives in `~/.tauri/lodestar.key`),
and publishes a GitHub Release with `latest.json`. Installed apps pick it up on
next launch or via "Check for updates".

See `lodestar-prd.md` (kept alongside this repo) for the full product spec,
architecture rules, and milestones.
