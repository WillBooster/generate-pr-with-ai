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
  if (
    indices.some((index) => index === -1) ||
    !indices.every((index, i) => i === 0 || index > (indices[i - 1] as number))
  ) {
    return undefined;
  }

  return headers.map((header, i) => {
    const start = (indices[i] as number) + 1 + header.length;
    const end = i + 1 < headers.length ? (indices[i + 1] as number) + 1 : modifiedResponse.length;
    return modifiedResponse.slice(start, end).trim();
  });
}

export function findDistinctFence(content: string, fenceChar: '`' | '~'): string {
  const regex = new RegExp(`${fenceChar}{3,}`, 'g');
  const matches = content.match(regex);
  const maxLength = matches ? Math.max(...matches.map((seq) => seq.length)) : 0;
  const fenceLength = Math.max(3, maxLength + 1);
  return fenceChar.repeat(fenceLength);
}

export function trimCodeBlockFences(content: string): string {
  // Remove code block fences with any number of backticks or tildes from the beginning and end
  return content.trim().replace(/^(`{3,}|~{3,})[\s\S]*?\n([\s\S]*?)\n\1\s*$/, '$2');
}
