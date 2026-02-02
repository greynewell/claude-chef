import { generateRobotsTxt } from '../src/generator/robots';

describe('Robots.txt Generator', () => {
  const sitemapUrl = 'https://greynewell.github.io/claude-chef/sitemap.xml';

  it('should allow all user agents', () => {
    const robots = generateRobotsTxt(sitemapUrl);
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
  });

  it('should explicitly allow GPTBot', () => {
    const robots = generateRobotsTxt(sitemapUrl);
    expect(robots).toContain('User-agent: GPTBot');
  });

  it('should explicitly allow ClaudeBot', () => {
    const robots = generateRobotsTxt(sitemapUrl);
    expect(robots).toContain('User-agent: ClaudeBot');
  });

  it('should explicitly allow Googlebot', () => {
    const robots = generateRobotsTxt(sitemapUrl);
    expect(robots).toContain('User-agent: Googlebot');
  });

  it('should explicitly allow Bingbot', () => {
    const robots = generateRobotsTxt(sitemapUrl);
    expect(robots).toContain('User-agent: Bingbot');
  });

  it('should explicitly allow PerplexityBot', () => {
    const robots = generateRobotsTxt(sitemapUrl);
    expect(robots).toContain('User-agent: PerplexityBot');
  });

  it('should include the sitemap URL', () => {
    const robots = generateRobotsTxt(sitemapUrl);
    expect(robots).toContain(`Sitemap: ${sitemapUrl}`);
  });
});
