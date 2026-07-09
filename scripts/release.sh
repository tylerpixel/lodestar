#!/usr/bin/env bash
# Release Lodestar: bump versions, verify, commit, tag, push.
# Usage: scripts/release.sh X.Y.Z ["commit message"]
set -euo pipefail

VERSION="${1:?usage: scripts/release.sh X.Y.Z [message]}"
MESSAGE="${2:-v$VERSION}"
cd "$(dirname "$0")/.."

node -e "
  const fs = require('fs');
  const f = 'src-tauri/tauri.conf.json';
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  j.version = '$VERSION';
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
"
npm pkg set version="$VERSION"

npm run check
npm run build

git add -A
git commit -m "$MESSAGE"
git tag "v$VERSION"
git push origin main --tags
echo "v$VERSION pushed — CI will build and publish the release."
