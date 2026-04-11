## Project Information

- Name: `gen-pr`
- Description: undefined
- Package Manager: bun

## General Instructions

- Create a new branch if the current branch is `main`.
- Run any `git` commands sequentially.
- Write tests ONLY if explicitly requested. If requested, follow these rules:
  - Continue modifying the tests and code until all tests pass.
  - Ensure tests reset any related persistent data, as our test infrastructure does not clear it automatically.
  - Prefer actual API calls over mocks. Use mocks when actual calls are impractical, have unintended side effects, or are explicitly requested.
- Before fixing issues, always investigate the root cause first (e.g., by gathering debug logs, taking screenshots, etc.).
- After making code changes, run `bun check-all-for-ai` to execute all tests (takes up to 1 hour) or `bun check-for-ai` for type checking and linting only (takes up to 10 minutes).
  - If you are confident your changes will not break any tests, you may use `check-for-ai`.
- Once you have verified your changes, commit and push them to the current (non-main) branch then create a PR via `gh`.
  - Follow the conventional commits; your commit message should start with `feat:`, `fix:`, etc.
  - If not specified, make sure to add a new line at the end of your commit message with: `Co-authored-by: WillBooster (Claude Code) <agent@willbooster.com>`.
  - Always create new commits. Avoid using `--amend`.

## Coding Style

- Simplify code as much as possible to eliminate redundancy.
- Design each module with high cohesion, grouping related functionality together.
  - Refactor existing large modules into smaller, focused modules when necessary.
  - Create well-organized directory structures with low coupling and high cohesion.
- Place calling functions in the file above the functions they call to maintain a clear top-down order.
  - e.g. `function caller() { callee(); } function callee() { ... }`
- Write comments that explain "why" rather than "what". Avoid stating what can be understood from the code itself.
- Prefer `undefined` over `null` unless explicitly required by APIs or libraries.
- Prefer using a single template literal for prompts instead of `join()` with an array of strings.
