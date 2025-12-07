## Project Information

- Name: gen-pr
- Description: undefined
- Package Manager: bun

## General Instructions

- Do not write tests unless explicitly requested.
- After making code changes, run `bun check-all-for-ai` to execute all tests (note: this may take up to 30 minutes), or run `bun check-for-ai` for type checking and linting only.
  - If you are confident your changes will not break any tests, you may use `check-for-ai`.
- Once you have verified your changes, commit them to the non-main branch using the `--no-verify` option and push to the current branch.
  - Follow conventional commits, i.e., your commit message should start with `feat:`, `fix:`, etc.
  - Make sure to add a new line at the end of your commit message with: `Co-authored-by: WillBooster (Gemini CLI) <agent@willbooster.com>`.
  - Always create new commits. Avoid using `--amend`.

## Coding Style

- Write comments that explain "why" rather than "what". Avoid explanations that can be understood from the code itself.
- Use stderr for logging debug messages temporarily since stdout output is sometimes omitted.
- When adding new functions or classes, define them below any functions or classes that call them to maintain clear call order.
- Prefer `undefined` over `null` unless explicitly dealing with APIs or libraries that require `null`.
- Always perform existence checks on array due to `noUncheckedIndexedAccess: true`.
