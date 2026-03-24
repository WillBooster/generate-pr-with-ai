#!/bin/bash

changed_files="$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD)"

run_if_changed() {
  if echo "$changed_files" | grep --quiet -E "$1"; then
    eval "$2"
  fi
}

run_if_changed "(mise\.toml|\.mise\.toml|\.tool-versions|\..+-version)" "mise install"
run_if_changed "package\.json" "bun install"
