import { SitemapEntry } from '../types';

/**
 * Generate a sitemap.xml string from an array of entries.
 */
export function generateSitemap(entries: SitemapEntry[]): string {
  const urls = entries
    .map(
      entry => {
        const changefreqTag = entry.changefreq ? `\n    <changefreq>${entry.changefreq}</changefreq>` : '';
        return `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <priority>${entry.priority}</priority>${changefreqTag}
  </url>`;
      }
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}
