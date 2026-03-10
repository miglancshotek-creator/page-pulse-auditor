import React from "react";

/**
 * Detects text within quotation marks (double quotes, single quotes,
 * or curly/smart quotes) and renders them as <strong> elements.
 */
export function renderWithBoldQuotes(text: string): React.ReactNode {
  if (!text) return text;

  // Match text in various quote styles: "…", '…', "…", «…»
  // Only match double quotes and smart quotes — never single quotes/apostrophes
  // Double/smart quotes: any content
  // Single quotes: only multi-word content (contains a space) to avoid apostrophes
  const pattern = /(?<!\w)[""\u201C\u201D«»](.+?)[""\u201C\u201D«»](?!\w)|(?<!\w)'([^']*\s[^']*?)'(?!\w)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const quoted = match[1] || match[2];
    parts.push(
      <strong key={match.index} className="font-bold">
        "{quoted}"
      </strong>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}
