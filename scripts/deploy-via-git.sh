#!/usr/bin/env bash

set -euo pipefail

remote="${DEPLOY_GIT_REMOTE:-origin}"
production_branch="${DEPLOY_GIT_BRANCH:-main}"
dry_run=false
skip_verify=false

usage() {
  cat <<'EOF'
Push a verified commit to the branch connected to Vercel's Git integration.

Usage: bun run deploy:git -- [options]

Options:
  --dry-run       Run all local checks, but do not push.
  --skip-verify   Skip typecheck, tests, SDK build, and site build.
  --remote NAME   Git remote to push (default: origin).
  --branch NAME   Vercel production branch (default: main).
  -h, --help      Show this help.

Environment equivalents:
  DEPLOY_GIT_REMOTE, DEPLOY_GIT_BRANCH
EOF
}

while (($# > 0)); do
  case "$1" in
    --dry-run)
      dry_run=true
      shift
      ;;
    --skip-verify)
      skip_verify=true
      shift
      ;;
    --remote)
      [[ $# -ge 2 ]] || { echo "Missing value for --remote" >&2; exit 2; }
      remote="$2"
      shift 2
      ;;
    --branch)
      [[ $# -ge 2 ]] || { echo "Missing value for --branch" >&2; exit 2; }
      production_branch="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "This command must run inside the OtterVoice Git repository." >&2
  exit 1
}
cd "$repo_root"

current_branch="$(git branch --show-current)"
if [[ -z "$current_branch" ]]; then
  echo "Cannot deploy from a detached HEAD." >&2
  exit 1
fi
if [[ "$current_branch" != "$production_branch" ]]; then
  echo "Current branch is '$current_branch'; Vercel production branch is '$production_branch'." >&2
  echo "Switch branches or pass --branch $current_branch if that is intentional." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "The worktree is not clean. Commit or stash changes before deployment." >&2
  git status --short >&2
  exit 1
fi

git remote get-url "$remote" >/dev/null 2>&1 || {
  echo "Git remote '$remote' does not exist." >&2
  exit 1
}

if [[ "$skip_verify" == false ]]; then
  echo "Running deployment checks..."
  bun run verify:deploy
fi

commit="$(git rev-parse HEAD)"
short_commit="$(git rev-parse --short HEAD)"

if [[ "$dry_run" == true ]]; then
  echo "Dry run passed for $short_commit. No push was performed."
  echo "Production command: git push $remote HEAD:refs/heads/$production_branch"
  exit 0
fi

echo "Pushing $short_commit to $remote/$production_branch..."
git push "$remote" "HEAD:refs/heads/$production_branch"

echo "Pushed $commit successfully."
echo "Vercel will now deploy this commit through its GitHub integration."
echo "Required Vercel project settings: Root Directory 'docs/site', Production Branch '$production_branch'."
