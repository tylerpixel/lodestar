# Lodestar

Personal operations console for macOS. Local-first, single-user, single-machine.
Three modules: job application pipeline, habit tracking, money tracking (ledger).

Built with Tauri 2 + Svelte 5. All data lives in SQLite at
`~/Library/Application Support/com.tylerpixel.lodestar/lodestar.db` — outside the
app bundle, untouched by updates.

Strictly personal software: unsigned (ad-hoc), no notarisation. First install of a
.dmg needs a one-time Gatekeeper bypass (right-click → Open). Updates after that
flow through the built-in updater.

## Development

```sh
npm install
npm run tauri dev
```

## Releasing

1. Bump `version` in `src-tauri/tauri.conf.json` and `package.json`.
2. Commit, then tag and push:

```sh
git tag vX.Y.Z && git push origin main --tags
```

CI builds the .dmg and updater artifacts, signs the update with the Tauri updater
key (`TAURI_SIGNING_PRIVATE_KEY` repo secret; keypair lives in `~/.tauri/lodestar.key`),
and publishes a GitHub Release with `latest.json`. Installed apps pick it up on
next launch or via "Check for updates".

See `lodestar-prd.md` (kept alongside this repo) for the full product spec,
architecture rules, and milestones.
