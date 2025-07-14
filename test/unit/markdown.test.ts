import { describe, expect, test } from 'bun:test';
import { extractHeaderContents, findDistinctFence } from '../../src/markdown.js';

describe('extractHeaderContent', () => {
  test('should extract content between headers in correct order', () => {
    const response = `
# Header 1
Content for header 1
Some more content

## Header 2
Content for header 2
Multiple lines
of content

### Header 3
Final content
`;

    const headers = ['# Header 1', '## Header 2', '### Header 3'];
    const result = extractHeaderContents(response, headers);

    expect(result).toEqual([
      'Content for header 1\nSome more content',
      'Content for header 2\nMultiple lines\nof content',
      'Final content',
    ]);
  });

  test('should return undefined when headers are missing', () => {
    const response = `
# Header 1
Content for header 1

### Header 3
Content for header 3
`;

    const headers = ['# Header 1', '## Header 2', '### Header 3'];
    const result = extractHeaderContents(response, headers);

    expect(result).toBeUndefined();
  });

  test('should return undefined when headers are in wrong order', () => {
    const response = `
## Header 2
Content for header 2

# Header 1
Content for header 1

### Header 3
Content for header 3
`;

    const headers = ['# Header 1', '## Header 2', '### Header 3'];
    const result = extractHeaderContents(response, headers);

    expect(result).toBeUndefined();
  });

  test('should handle empty content between headers', () => {
    const response = `
# Header 1

## Header 2

### Header 3
Some content
`;

    const headers = ['# Header 1', '## Header 2', '### Header 3'];
    const result = extractHeaderContents(response, headers);

    expect(result).toEqual(['', '', 'Some content']);
  });

  test('should handle single header', () => {
    const response = `
# Single Header
This is the only content
`;

    const headers = ['# Single Header'];
    const result = extractHeaderContents(response, headers);

    expect(result).toEqual(['This is the only content']);
  });

  test('should handle headers with no content after last header', () => {
    const response = `
# Header 1
Content 1

## Header 2
`;

    const headers = ['# Header 1', '## Header 2'];
    const result = extractHeaderContents(response, headers);

    expect(result).toEqual(['Content 1', '']);
  });

  test('should return undefined for empty response', () => {
    const response = '';
    const headers = ['# Header 1'];
    const result = extractHeaderContents(response, headers);

    expect(result).toBeUndefined();
  });

  test('should return empty array for empty headers array', () => {
    const response = 'Some content';
    const headers: string[] = [];
    const result = extractHeaderContents(response, headers);

    expect(result).toEqual([]);
  });

  test('should handle headers with special characters', () => {
    const response = `
## Task: Fix Bug #123
Bug fix content

### Solution: Update API
API update content
`;

    const headers = ['## Task: Fix Bug #123', '### Solution: Update API'];
    const result = extractHeaderContents(response, headers);

    expect(result).toEqual(['Bug fix content', 'API update content']);
  });

  test('should trim whitespace from extracted content', () => {
    const response = `
# Header 1
   Content with leading spaces

## Header 2
	Content with tabs
`;

    const headers = ['# Header 1', '## Header 2'];
    const result = extractHeaderContents(response, headers);

    expect(result).toEqual(['Content with leading spaces', 'Content with tabs']);
  });

  test('should handle duplicate headers by using first occurrence', () => {
    const response = `
# Header 1
First content

# Header 1
Second content

## Header 2
Header 2 content
`;

    const headers = ['# Header 1', '## Header 2'];
    const result = extractHeaderContents(response, headers);

    expect(result).toEqual(['First content\n\n# Header 1\nSecond content', 'Header 2 content']);
  });

  test('should only match headers at the beginning of lines', () => {
    const response = `
This is not # Header 1 but contains it
# Header 1
Actual header content

## Header 2
More content
`;

    const headers = ['# Header 1', '## Header 2'];
    const result = extractHeaderContents(response, headers);

    expect(result).toEqual(['Actual header content', 'More content']);
  });

  test('should return undefined when headers are not at line start', () => {
    const response = `
Some text # Header 1
Content here
    ## Header 2
More content
`;

    const headers = ['# Header 1', '## Header 2'];
    const result = extractHeaderContents(response, headers);

    expect(result).toBeUndefined();
  });
});

describe('findDistinctFence', () => {
  test('should return minimum 3 characters when no fences found', () => {
    expect(findDistinctFence('Some regular content', '`')).toBe('```');
    expect(findDistinctFence('Some regular content', '~')).toBe('~~~');
    expect(findDistinctFence('', '`')).toBe('```');
    expect(findDistinctFence('', '~')).toBe('~~~');
  });

  test('should return one more than longest sequence found', () => {
    expect(findDistinctFence('Content with ```code```', '`')).toBe('````');
    expect(findDistinctFence('Content with ~~~code~~~', '~')).toBe('~~~~');
    expect(findDistinctFence('Content with `````long`````', '`')).toBe('``````');
    expect(findDistinctFence('Content with ~~~~~~~long~~~~~~~', '~')).toBe('~~~~~~~~');
  });

  test('should use longest sequence when multiple found', () => {
    expect(findDistinctFence('```short``` and `````long`````', '`')).toBe('``````');
    expect(findDistinctFence('~~~short~~~ and ~~~~~~~long~~~~~~~', '~')).toBe('~~~~~~~~');
  });

  test('should ignore other fence character', () => {
    expect(findDistinctFence('Content with ~~~tildes~~~', '`')).toBe('```');
    expect(findDistinctFence('Content with ```backticks```', '~')).toBe('~~~');
  });
});
