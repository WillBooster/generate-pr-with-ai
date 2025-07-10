## Project Information

- Name: gen-pr
- Description: undefined
- Package Manager: bun

## General Instructions

- After making code changes, commit them to the current branch using the `--no-verify` option. Make sure to add a new line at the end of your commit message with: `Co-authored-by: WillBooster (Agent) <agent@willbooster.com>`.
- Once you have committed your changes, run `bun check-for-ai` to perform type checking and linting.
- When your work is fully complete, run `bun check-all-for-ai` to execute all tests (note: this may take up to 30 minutes).
- Once `bun check-all-for-ai` passes, commit any remaining changes to the current branch and push.

## Coding Style

- When adding new functions or classes, define them below any functions or classes that call them to maintain clear call order.
