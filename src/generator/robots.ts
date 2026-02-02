/**
 * Generate a permissive robots.txt that explicitly allows AI and search crawlers.
 */
export function generateRobotsTxt(sitemapUrl: string): string {
  return `User-agent: *
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: ${sitemapUrl}
`;
}
