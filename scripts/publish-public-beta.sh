#!/usr/bin/env bash
# Publish only the reviewed source snapshot, never the private working directory.
set -euo pipefail
release_tag=v0.9.4-beta.1
release_repo=Malasuerte94/FBones
script_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
release_dir=${1:-"$script_root/.local/public-beta/current"}
release_dir=$(cd -- "$release_dir" && pwd)
source_dir="$release_dir/repository"
archive="$release_dir/fbones-$release_tag-source.tar.gz"
for tool in git gh python3 sha256sum; do
  command -v "$tool" >/dev/null || { echo "Required publishing tool is unavailable: $tool" >&2; exit 1; }
done
[[ -d "$source_dir/.git" ]] || { echo 'Prepare and commit the reviewed source snapshot first.' >&2; exit 1; }
[[ -z $(git -C "$source_dir" status --porcelain) ]] || { echo 'Release source has uncommitted changes.' >&2; exit 1; }
python3 "$script_root/scripts/prepare-public-release.py" --verify "$source_dir" --archive "$archive"
(cd -- "$release_dir" && sha256sum --check SHA256SUMS)
[[ -f "$archive" ]] || exit 1
[[ $(git -C "$source_dir" branch --show-current) == main ]] || { echo 'Expected main branch.' >&2; exit 1; }
[[ $(git -C "$source_dir" rev-parse HEAD) == $(git -C "$source_dir" rev-list -n 1 "$release_tag") ]] || { echo 'Release tag must match HEAD.' >&2; exit 1; }
gh auth status --hostname github.com
[[ $(gh api user --jq .login) == Malasuerte94 ]] || { echo 'Expected authenticated GitHub account Malasuerte94.' >&2; exit 1; }
if gh repo view "$release_repo" --json nameWithOwner >/dev/null 2>&1; then
  [[ $(gh repo view "$release_repo" --json visibility --jq .visibility) == PUBLIC ]] || { echo 'Existing repository is not public; refusing to change its visibility.' >&2; exit 1; }
else
  gh repo create "$release_repo" --public --disable-wiki \
    --description 'Free, open-source offline 2D skeletal animation editor. Early beta; compatibility is progressive.'
fi
origin_url=$(git -C "$source_dir" remote get-url origin 2>/dev/null || true)
if [[ -z "$origin_url" ]]; then
  git -C "$source_dir" remote add origin "https://github.com/$release_repo.git"
else
  [[ "$origin_url" == "https://github.com/$release_repo.git" ]] || { echo 'Unexpected origin; refusing to publish.' >&2; exit 1; }
fi
# Use gh credentials for this command only; do not change global Git configuration.
git -C "$source_dir" -c credential.helper= -c 'credential.helper=!gh auth git-credential' \
  push --atomic origin main "refs/tags/$release_tag"
# The tag workflow owns release creation, after all platform and UI jobs pass.
# Wait for the exact commit/tag run; never bypass that gate with a local release.
release_commit=$(git -C "$source_dir" rev-parse HEAD)
release_run=
for attempt in {1..30}; do
  release_run=$(gh run list --repo "$release_repo" --workflow desktop.yml \
    --commit "$release_commit" --event push --limit 30 \
    --json databaseId,headBranch \
    --jq 'map(select(.headBranch == "v0.9.4-beta.1")) | .[0].databaseId // empty')
  [[ -n "$release_run" ]] && break
  sleep 2
done
[[ -n "$release_run" ]] || { echo 'Tag pushed; no matching workflow run observed yet. Check GitHub Actions before retrying.' >&2; exit 1; }
gh run watch "$release_run" --repo "$release_repo" --exit-status
gh repo view "$release_repo" --json url,visibility --jq '{url,visibility}'
gh release view "$release_tag" --repo "$release_repo" --json url,isPrerelease,tagName,assets
