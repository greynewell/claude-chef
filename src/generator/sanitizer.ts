/**
 * Strip all markdown links [text](url) and bare URLs from content.
 * Image syntax ![alt](url) is also stripped, keeping the alt text.
 */
export function stripLinks(content: string): string {
  // Strip image links: ![alt](url) -> alt
  let result = content.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  // Strip markdown links: [text](url) -> text
  result = result.replace(/\[([^\]]*)\]\([^)]+\)/g, '$1');
  // Strip bare URLs
  result = result.replace(/https?:\/\/[^\s)]+/g, '');
  // Clean up extra spaces from removed URLs
  result = result.replace(/  +/g, ' ');
  return result;
}

/**
 * Enforce H2/H3 heading hierarchy by demoting H1s to H2.
 */
export function enforceHeadingHierarchy(content: string): string {
  return content.replace(/^# (?!#)/gm, '## ');
}

/**
 * Apply all sanitization: strip links and enforce heading hierarchy.
 */
export function sanitizeContent(content: string): string {
  let result = stripLinks(content);
  result = enforceHeadingHierarchy(result);
  return result;
}
