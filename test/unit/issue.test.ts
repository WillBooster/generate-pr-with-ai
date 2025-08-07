import { describe, expect, test } from 'bun:test';
import { createIssueInfo } from '../../src/issue.js';
import type { MainOptions } from '../../src/main.js';

const TIMEOUT = 20000;

describe('createIssueInfo', () => {
  // Test for issue #32 - Basic issue functionality
  test(
    'should handle issue #32 (basic issue without references)',
    async () => {
      const options: MainOptions = {
        twoStagePlanning: false,
        dryRun: false,
        noBranch: false,
        issueNumber: 32,
        maxTestAttempts: 3,
        codingTool: 'aider',
      };

      const result = await createIssueInfo(options);

      // Basic properties
      expect(result.author).toBe('exKAZUu');
      expect(result.title).toBe('feat: Strip HTML comments from issue/PR descriptions before LLM processing');

      // Description content
      expect(result.description).toContain('Current Behavior:');
      expect(result.description).toContain('Problem:');
      expect(result.description).toContain('Proposed Solution:');

      // Issue characteristics
      expect(result.comments).toEqual([]);
      expect(result.code_changes).toBeUndefined(); // Not a PR
      expect(result.referenced_issues).toBeUndefined(); // No references
    },
    { timeout: TIMEOUT }
  );

  // Test for PR #3 - Basic pull request functionality
  test(
    'should handle PR #3 (basic PR without references)',
    async () => {
      const options: MainOptions = {
        twoStagePlanning: false,
        dryRun: false,
        noBranch: false,
        issueNumber: 3,
        maxTestAttempts: 3,
        codingTool: 'aider',
      };

      const result = await createIssueInfo(options);

      // Basic properties
      expect(result.author).toBe('app/renovate');
      expect(result.title).toBe('chore(deps): pin dependency python to 3.13.3');

      // Description content
      expect(result.description).toContain('This PR contains the following updates:');
      expect(result.description).toContain('python');
      expect(result.description).toContain('3.x');
      expect(result.description).toContain('3.13.3');

      // HTML comments should be stripped
      expect(result.description).not.toContain('<!--renovate-debug:');
      expect(result.description).not.toContain('<!-- rebase-check -->');

      // PR characteristics
      expect(result.comments).toEqual([]);
      expect(result.code_changes).toBeDefined(); // Is a PR
      expect(result.code_changes).toContain('action.yml');
      expect(result.code_changes).toContain("-        python-version: '3.x'");
      expect(result.code_changes).toContain("+        python-version: '3.13.3'");
      expect(result.referenced_issues).toBeUndefined(); // No references
    },
    { timeout: TIMEOUT }
  );

  // Test for issue #8 - Issue with references
  test(
    'should handle issue #8 (issue with references to #89)',
    async () => {
      const options: MainOptions = {
        twoStagePlanning: false,
        dryRun: false,
        noBranch: false,
        issueNumber: 8,
        maxTestAttempts: 3,
        codingTool: 'aider',
      };

      const result = await createIssueInfo(options);

      // Basic properties
      expect(result.author).toBe('exKAZUu');
      expect(result.title).toBe('feat: print "Hello World" (<- example issue for debugging gen-pr)');

      // Description content
      expect(result.description).toContain('Modify `src/main.ts` to print "Hello World"');

      // Issue characteristics
      expect(result.comments.length).toBeGreaterThan(0);
      expect(result.comments.some((c) => c.body.includes('#89'))).toBe(true);
      expect(result.code_changes).toBeUndefined(); // Not a PR

      // Referenced issues
      expect(result.referenced_issues).toBeDefined();
      expect(result.referenced_issues?.length).toBe(1);
      expect(result.referenced_issues?.[0].author).toBe('exKAZUu');
      expect(result.referenced_issues?.[0].title).toBe('feat: print "Hi" (<- example issue for debugging gen-pr)');
      expect(result.referenced_issues?.[0].code_changes).toBeUndefined(); // Referenced issues don't include diffs
    },
    { timeout: TIMEOUT }
  );

  // Test for PR #12 - PR with nested references (#12 → #8 → #32)
  test(
    'should handle PR #12 (PR with nested references)',
    async () => {
      const options: MainOptions = {
        twoStagePlanning: false,
        dryRun: false,
        noBranch: false,
        issueNumber: 12,
        maxTestAttempts: 3,
        codingTool: 'aider',
      };

      const result = await createIssueInfo(options);

      // Basic properties
      expect(result.author).toBe('app/github-actions');
      expect(result.title).toBe('feat: Add Hello World step to action workflow');

      // Description content
      expect(result.description).toContain('Closes #8');
      expect(result.description).toContain('Hello, World!');

      // PR characteristics
      expect(result.comments).toEqual([]);
      expect(result.code_changes).toBeDefined(); // Is a PR
      expect(result.code_changes).toContain('action.yml');
      expect(result.code_changes).toContain('Print Hello World');
      expect(result.code_changes).toContain('echo "Hello, World!"');

      // Referenced issues - should have nested chain #12 → #8 → #89
      expect(result.referenced_issues).toBeDefined();
      expect(result.referenced_issues?.length).toBe(1);

      // Issue #8
      const issue8 = result.referenced_issues?.[0];
      expect(issue8).toBeDefined();
      expect(issue8?.author).toBe('exKAZUu');
      expect(issue8?.title).toBe('feat: print "Hello World" (<- example issue for debugging gen-pr)');
      expect(issue8?.code_changes).toBeUndefined(); // Referenced issues don't include diffs
      expect(issue8?.referenced_issues).toBeDefined();
      expect(issue8?.referenced_issues?.length).toBe(1);

      // Issue #89
      const issue89 = issue8?.referenced_issues?.[0];
      expect(issue89).toBeDefined();
      expect(issue89?.author).toBe('exKAZUu');
      expect(issue89?.title).toBe('feat: print "Hi" (<- example issue for debugging gen-pr)');
      expect(issue89?.code_changes).toBeUndefined(); // Referenced issues don't include diffs
      expect(issue89?.referenced_issues).toBeUndefined(); // End of chain
    },
    { timeout: TIMEOUT }
  );

  // Test for PR #9 - PR with large bundled file diff that should be truncated
  test(
    'should handle PR #9 (PR with large bundled file diff)',
    async () => {
      const options: MainOptions = {
        twoStagePlanning: false,
        dryRun: false,
        noBranch: false,
        issueNumber: 9,
        maxTestAttempts: 3,
        codingTool: 'aider',
      };

      const result = await createIssueInfo(options);

      // Basic properties
      expect(result.author).toBe('exKAZUu');
      expect(result.title).toBe('feat: add hello world step');

      // Description content
      expect(result.description).toContain('Closes #8');
      expect(result.description).toContain('Hello, World!');
      expect(result.description).toContain('action.yml');

      // PR characteristics
      expect(result.comments).toEqual([]);
      expect(result.code_changes).toBeDefined(); // Is a PR

      // Should contain the small action.yml change
      expect(result.code_changes).toContain('action.yml');
      expect(result.code_changes).toContain('Print Hello World');
      expect(result.code_changes).toContain('echo "Hello, World!"');

      // Should contain the src/index.ts change
      expect(result.code_changes).toContain('src/index.ts');

      // Should have truncated the large bundled dist/index.js file
      expect(result.code_changes).toContain('dist/index.js');
      expect(result.code_changes).toContain('(large bundled/compiled file diff truncated)');

      // Should not contain the full bundled content (which would be very long)
      // The original diff has minified JS content, so we check it's been truncated
      const distSectionMatch = result.code_changes?.match(/diff --git a\/dist\/index\.js[\s\S]*?(?=diff --git|$)/);
      if (distSectionMatch) {
        const distSection = distSectionMatch[0];
        expect(distSection.length).toBeLessThan(500); // Should be much shorter than original
        expect(distSection).not.toMatch(/var ks,Os,Es;const Ss=/); // Should not contain minified JS
      }

      // Referenced issues
      expect(result.referenced_issues).toBeDefined();
      expect(result.referenced_issues?.length).toBe(1);
      expect(result.referenced_issues?.[0].title).toBe(
        'feat: print "Hello World" (<- example issue for debugging gen-pr)'
      );
    },
    { timeout: TIMEOUT }
  );

  // Test for PR #103 - PR with code review comments and "Use Hello" functionality
  test(
    'should handle PR #103 (PR with code review comments and Hello change)',
    async () => {
      const options: MainOptions = {
        twoStagePlanning: false,
        dryRun: false,
        noBranch: false,
        issueNumber: 103,
        maxTestAttempts: 3,
        codingTool: 'aider',
      };

      const result = await createIssueInfo(options);

      // Basic properties
      expect(result.author).toBe('WillBooster-bot');
      expect(result.title).toBe('fix: Close #89');

      // Description content
      expect(result.description).toContain('Close #89');
      expect(result.description).toContain('Planning Model:');
      expect(result.description).toContain('Coding Tool:');
      expect(result.description).toContain('Codex');

      // PR characteristics
      expect(result.code_changes).toBeDefined(); // Is a PR
      expect(result.code_changes).toContain('src/main.ts');
      expect(result.code_changes).toContain('configureEnvVars();');
      expect(result.code_changes).toContain("console.log('Hi');");

      // Code review comments functionality - "Use Hello" feature
      expect(result.comments.length).toBeGreaterThan(0);
      const reviewComment = result.comments.find((c) => c.body.includes('Use Hello'));
      expect(reviewComment).toBeDefined();
      expect(reviewComment?.author).toBe('exKAZUu');
      expect(reviewComment?.body).toContain('Review comment on `src/main.ts:54`');
      expect(reviewComment?.body).toContain('~~~yaml');
      expect(reviewComment?.body).toContain("codeCommented: +  console.log('Hi');");
      expect(reviewComment?.body).toContain('comment: Use Hello');

      // Referenced issues - should reference #89
      expect(result.referenced_issues).toBeDefined();
      expect(result.referenced_issues?.length).toBe(1);
      expect(result.referenced_issues?.[0].title).toBe('feat: print "Hi" (<- example issue for debugging gen-pr)');
      expect(result.referenced_issues?.[0].author).toBe('exKAZUu');

      // The PR should show the change that adds console.log('Hi')
      expect(result.code_changes).toContain("+  console.log('Hi');");
    },
    { timeout: TIMEOUT }
  );
});
