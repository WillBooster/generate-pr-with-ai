export const HEADING_OF_GEN_PR_METADATA = '## gen-pr Metadata';

/**
 * Truncate long text.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length > maxLength) {
    const truncated = text.slice(0, maxLength);
    const omitted = text.length - maxLength;
    return `${truncated}\n\n... (${Math.floor(omitted)} characters truncated) ...`;
  }

  return text;
}

/**
 * Removes HTML-style comments from a string.
 *
 * @param markdownContent The string containing markdown content
 * @returns The string with HTML comments removed
 */
export function stripHtmlComments(markdownContent: string): string {
  return markdownContent.replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * Removes gen-pr metadata sections from a PR body markdown.
 */
export function stripMetadataSections(markdownContent: string): string {
  const index = markdownContent.indexOf(HEADING_OF_GEN_PR_METADATA);
  return index >= 0 ? markdownContent.substring(0, index) : markdownContent;
}

export function normalizeNewLines(text: string): string {
  return text.replaceAll('\r\n', '\n').trim();
}

/**
 * Removes text matching the specified regex pattern.
 *
 * @param text The input text
 * @param pattern The regex pattern string to remove
 * @returns The text with matched patterns removed
 */
export function removeRegexPattern(text: string, pattern: string): string {
  if (!pattern) return text;
  try {
    const regex = new RegExp(pattern, 'g');
    return text.replace(regex, '');
  } catch (error) {
    console.warn(`Invalid regex pattern "${pattern}":`, error);
    return text;
  }
}
