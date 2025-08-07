import { describe, expect, test } from 'bun:test';
import { normalizeNewLines, removeRegexPattern, stripHtmlComments, stripMetadataSections } from '../../src/text.js';

describe('removeRegexPattern', () => {
  test('should remove text matching regex pattern', () => {
    const text = 'Hello world! This is a test.';
    const pattern = 'world!';
    const result = removeRegexPattern(text, pattern);
    expect(result).toBe('Hello  This is a test.');
  });

  test('should remove multiple matches with global flag', () => {
    const text = 'Remove this and this but keep that.';
    const pattern = 'this';
    const result = removeRegexPattern(text, pattern);
    expect(result).toBe('Remove  and  but keep that.');
  });

  test('should handle regex special characters', () => {
    const text = 'Price: $100.50 and $200.75';
    const pattern = '\\$\\d+\\.\\d+';
    const result = removeRegexPattern(text, pattern);
    expect(result).toBe('Price:  and ');
  });

  test('should handle multiline patterns', () => {
    const text = 'Line 1\n<!-- comment -->\nLine 2';
    const pattern = '<!--[\\s\\S]*?-->';
    const result = removeRegexPattern(text, pattern);
    expect(result).toBe('Line 1\n\nLine 2');
  });

  test('should return original text when pattern is empty', () => {
    const text = 'Hello world!';
    const pattern = '';
    const result = removeRegexPattern(text, pattern);
    expect(result).toBe('Hello world!');
  });

  test('should return original text when pattern matches nothing', () => {
    const text = 'Hello world!';
    const pattern = 'xyz';
    const result = removeRegexPattern(text, pattern);
    expect(result).toBe('Hello world!');
  });

  test('should handle invalid regex pattern gracefully', () => {
    const text = 'Hello world!';
    const pattern = '[invalid';
    // Mock console.warn to avoid test output pollution
    const originalWarn = console.warn;
    console.warn = () => {};
    const result = removeRegexPattern(text, pattern);
    console.warn = originalWarn;
    expect(result).toBe('Hello world!');
  });

  test('should remove case-sensitive matches by default', () => {
    const text = 'Hello World and hello world';
    const pattern = 'hello';
    const result = removeRegexPattern(text, pattern);
    expect(result).toBe('Hello World and  world');
  });

  test('should handle complex patterns', () => {
    const text = 'Contact: user@example.com or admin@test.org for help';
    const pattern = '[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}';
    const result = removeRegexPattern(text, pattern);
    expect(result).toBe('Contact:  or  for help');
  });

  test('should remove debug lines with pattern', () => {
    const text = 'Line 1\nDEBUG: This is a debug message\nLine 3\nINFO: This is info\nLine 5';
    const pattern = 'DEBUG:.*\\n?';
    const result = removeRegexPattern(text, pattern);
    expect(result).toBe('Line 1\nLine 3\nINFO: This is info\nLine 5');
  });
});

describe('stripHtmlComments', () => {
  test('should remove HTML comments', () => {
    const text = 'Hello <!-- this is a comment --> world!';
    const result = stripHtmlComments(text);
    expect(result).toBe('Hello  world!');
  });

  test('should remove multiline HTML comments', () => {
    const text = `Hello
<!-- this is a 
multiline comment --> 
world!`;
    const result = stripHtmlComments(text);
    expect(result).toBe(`Hello
 
world!`);
  });
});

describe('stripMetadataSections', () => {
  test('should remove gen-pr metadata sections', () => {
    const text = `Some content

## gen-pr Metadata

This should be removed`;
    const result = stripMetadataSections(text);
    expect(result).toBe(`Some content

`);
  });

  test('should return original text when no metadata section exists', () => {
    const text = 'Just regular content';
    const result = stripMetadataSections(text);
    expect(result).toBe('Just regular content');
  });
});

describe('normalizeNewLines', () => {
  test('should convert CRLF to LF', () => {
    const text = 'Line 1\r\nLine 2\r\nLine 3';
    const result = normalizeNewLines(text);
    expect(result).toBe('Line 1\nLine 2\nLine 3');
  });

  test('should trim whitespace', () => {
    const text = '  \n  Content  \n  ';
    const result = normalizeNewLines(text);
    expect(result).toBe('Content');
  });
});
