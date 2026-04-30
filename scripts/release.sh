#!/usr/bin/env bash
# Cut a release of design-md-generator.
#
# Usage:
#   scripts/release.sh                  # use the version already in packages/*/package.json
#   scripts/release.sh 0.1.1            # bump all three packages to 0.1.1, then release
#   scripts/release.sh 0.1.1 --dry-run  # print what would happen; no mutations
#
# Pre-flight (any failure aborts before mutations):
#   - required tools: pnpm, node, git, gh
#   - branch == main, working tree clean, in sync with origin/main
#   - chosen tag does not already exist locally or on origin
#   - pnpm install / build / typecheck / test all pass
#
# After pre-flight: bumps versions if needed, commits, tags, pushes,
# and runs `gh release create` — which fires the publish workflow.

set -euo pipefail

DRY_RUN=false
NEW_VERSION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    -h|--help) sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "unknown flag: $1" >&2; exit 1 ;;
    *) NEW_VERSION="$1" ;;
  esac
  shift
done

step() { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31merror:\033[0m %s\n' "$*" >&2; }

for cmd in pnpm node git gh; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    err "missing required tool: $cmd"
    exit 1
  fi
done

cd "$(git rev-parse --show-toplevel)"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" != "main" ]]; then
  err "must be on main (currently on $BRANCH)"
  exit 1
fi

if ! git diff-index --quiet HEAD --; then
  err "working tree has uncommitted changes; commit or stash first"
  git status --short >&2
  exit 1
fi

step "fetching origin"
git fetch --quiet origin main

LOCAL="$(git rev-parse @)"
REMOTE="$(git rev-parse 'origin/main' 2>/dev/null || true)"
if [[ -n "$REMOTE" && "$LOCAL" != "$REMOTE" ]]; then
  err "local main is not in sync with origin/main"
  err "  local : $LOCAL"
  err "  remote: $REMOTE"
  exit 1
fi

CURRENT_VERSION="$(node -p "require('./packages/cli/package.json').version")"
if [[ -z "$NEW_VERSION" ]]; then
  NEW_VERSION="$CURRENT_VERSION"
fi
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.-]+)?$ ]]; then
  err "version '$NEW_VERSION' is not a valid semver"
  exit 1
fi
TAG="v$NEW_VERSION"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  err "tag $TAG already exists locally; delete with: git tag -d $TAG"
  exit 1
fi
if git ls-remote --exit-code --tags origin "$TAG" >/dev/null 2>&1; then
  err "tag $TAG already exists on origin; delete with: git push origin :refs/tags/$TAG"
  exit 1
fi

step "releasing $TAG (current packages/cli version: $CURRENT_VERSION)"

if [[ "$DRY_RUN" == "true" ]]; then
  step "dry run — stopping before any mutations"
  exit 0
fi

if [[ "$NEW_VERSION" != "$CURRENT_VERSION" ]]; then
  step "bumping packages to $NEW_VERSION"
  for pkg in packages/core packages/cli packages/adapters; do
    node -e "
      const fs = require('fs');
      const p = '$pkg/package.json';
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      j.version = '$NEW_VERSION';
      fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
    "
  done
  # The CLI prints its version via cac.version(). Keep it in sync.
  node -e "
    const fs = require('fs');
    const p = 'packages/cli/src/index.ts';
    const t = fs.readFileSync(p, 'utf8');
    fs.writeFileSync(p, t.replace(/cli\\.version\\('[^']*'\\)/, \"cli.version('$NEW_VERSION')\"));
  "
fi

step "verifying (install, build, typecheck, test)"
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test

if ! git diff --quiet; then
  step "committing version bump"
  git add packages/
  git commit -m "release: bump to $NEW_VERSION"
fi

step "tagging $TAG"
git tag "$TAG"

step "pushing main and tag"
git push origin main "$TAG"

step "creating GitHub release (this fires the publish workflow)"
gh release create "$TAG" --generate-notes --title "$TAG"

step "done"
echo
echo "Watch the publish workflow:"
echo "  gh run watch"
echo
echo "Once green, packages will be at:"
echo "  https://github.com/varunsat?tab=packages"
