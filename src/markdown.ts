/**
 * Extracts content between specified headers from a text
 * @param text The text to parse
 * @param headers Array of header strings to extract content for
 * @returns Array of content strings, or undefined if any headers are missing or in different order
 */
export function extractHeaderContents(text: string, headers: string[]): string[] | undefined {
  const modifiedResponse = `\n${text}`;
  const indices = headers.map((header) => modifiedResponse.indexOf(`\n${header}`));

  // Return undefined if any headers are missing or not in order
  if (indices.some((index) => index === -1) || !indices.every((index, i) => i === 0 || index > indices[i - 1])) {
    return undefined;
  }

  return headers.map((header, i) => {
    const start = indices[i] + 1 + header.length;
    const end = i + 1 < headers.length ? indices[i + 1] + 1 : modifiedResponse.length;
    return modifiedResponse.slice(start, end).trim();
  });
}

export function findDistinctFence(content: string): string {
  // Find the longest sequence of backticks in the content to ensure proper escaping
  const backticksMatch = content.match(/```+/g);
  const maxBackticks = backticksMatch ? Math.max(...backticksMatch.map((seq) => seq.length)) : 0;

  // Use one more backtick than the maximum found to properly fence the code block
  const fenceLength = Math.max(3, maxBackticks + 1);
  return '`'.repeat(fenceLength);
}

export function trimCodeBlockFences(content: string): string {
  // Remove code block fences with any number of backticks or tildes from the beginning and end
  return content.trim().replace(/^(`{3,}|~{3,})[\s\S]*?\n([\s\S]*?)\n\1\s*$/, '$2');
}

/**
 * Omit contents of fenced code blocks that exceed the given length.
 */
export function stripLargeCodeBlocks(text: string, maxLength = 10000): string {
  return text.replace(/(`{3,}[^\n]*\n)([\s\S]*?)(`{3,})/g, (_match, openFence, content, closeFence) => {
    if (content.length > maxLength) {
      return `${openFence}... (${content.length} characters omitted) ...\n${closeFence}`;
    }
    return `${openFence}${content}${closeFence}`;
  });
}
