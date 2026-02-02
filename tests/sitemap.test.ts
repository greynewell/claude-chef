import { generateSitemap } from '../src/generator/sitemap';
import { SitemapEntry } from '../src/types';

describe('Sitemap Generator', () => {
  const baseUrl = 'https://greynewell.github.io/claude-chef';

  const entries: SitemapEntry[] = [
    { loc: `${baseUrl}/high-protein-carbonara.html`, lastmod: '2024-01-15', priority: '0.8' },
    { loc: `${baseUrl}/engineers-ramen.html`, lastmod: '2024-01-10', priority: '0.8' },
  ];

  it('should generate valid XML with urlset root element', () => {
    const xml = generateSitemap(entries);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('</urlset>');
  });

  it('should include all entries as <url> elements', () => {
    const xml = generateSitemap(entries);
    const urlCount = (xml.match(/<url>/g) || []).length;
    expect(urlCount).toBe(2);
  });

  it('should include loc, lastmod, and priority for each entry', () => {
    const xml = generateSitemap(entries);
    expect(xml).toContain(`<loc>${baseUrl}/high-protein-carbonara.html</loc>`);
    expect(xml).toContain('<lastmod>2024-01-15</lastmod>');
    expect(xml).toContain('<priority>0.8</priority>');
  });

  it('should produce well-formed XML for empty entries', () => {
    const xml = generateSitemap([]);
    expect(xml).toContain('<urlset');
    expect(xml).toContain('</urlset>');
    const urlCount = (xml.match(/<url>/g) || []).length;
    expect(urlCount).toBe(0);
  });
});
