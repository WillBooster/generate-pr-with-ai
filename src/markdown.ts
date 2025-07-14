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

export function findDistinctFence(content: string, fenceChar?: '`' | '~'): string {
  if (fenceChar) {
    // Use the specified fence character
    const escapedChar = fenceChar === '`' ? '`' : '~';
    const regex = new RegExp(`${escapedChar}{3,}`, 'g');
    const matches = content.match(regex);
    const maxLength = matches ? Math.max(...matches.map((seq) => seq.length)) : 0;
    const fenceLength = Math.max(3, maxLength + 1);
    return fenceChar.repeat(fenceLength);
  }

  // Auto-detect logic (existing behavior)
  // Find the longest sequence of backticks and tildes in the content
  const backticksMatch = content.match(/```+/g);
  const tildesMatch = content.match(/~~~+/g);

  const maxBackticks = backticksMatch ? Math.max(...backticksMatch.map((seq) => seq.length)) : 0;
  const maxTildes = tildesMatch ? Math.max(...tildesMatch.map((seq) => seq.length)) : 0;

  // Determine which fence character to use
  if (maxBackticks === 0 && maxTildes === 0) {
    // No fences found, default to backticks
    return '```';
  } else if (maxBackticks === 0) {
    // Only tildes found, use backticks
    const fenceLength = Math.max(3, maxTildes + 1);
    return '`'.repeat(fenceLength);
  } else if (maxTildes === 0) {
    // Only backticks found, use tildes
    const fenceLength = Math.max(3, maxBackticks + 1);
    return '~'.repeat(fenceLength);
  } else {
    // Both found, use the one that requires fewer characters
    const backticksNeeded = Math.max(3, maxBackticks + 1);
    const tildesNeeded = Math.max(3, maxTildes + 1);

    if (tildesNeeded <= backticksNeeded) {
      return '~'.repeat(tildesNeeded);
    } else {
      return '`'.repeat(backticksNeeded);
    }
  }
}

export function trimCodeBlockFences(content: string): string {
  // Remove code block fences with any number of backticks or tildes from the beginning and end
  return content.trim().replace(/^(`{3,}|~{3,})[\s\S]*?\n([\s\S]*?)\n\1\s*$/, '$2');
}
