以下のコーディング規約を踏まえて、日本語でレビューしてください。

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
