import { stripLinks, enforceHeadingHierarchy, sanitizeContent } from '../src/generator/sanitizer';

describe('Content Sanitizer', () => {
  describe('stripLinks', () => {
    it('should remove markdown links but keep the text', () => {
      const input = 'Check out [this recipe](https://example.com) for details.';
      expect(stripLinks(input)).toBe('Check out this recipe for details.');
    });

    it('should handle multiple links in one line', () => {
      const input = 'See [link one](http://a.com) and [link two](http://b.com).';
      expect(stripLinks(input)).toBe('See link one and link two.');
    });

    it('should leave text without links unchanged', () => {
      const input = 'No links here, just plain text.';
      expect(stripLinks(input)).toBe('No links here, just plain text.');
    });

    it('should handle bare URLs by removing them', () => {
      const input = 'Visit https://example.com for more.';
      expect(stripLinks(input)).toBe('Visit for more.');
    });

    it('should handle image links', () => {
      const input = 'Here is ![an image](https://example.com/img.png) inline.';
      expect(stripLinks(input)).toBe('Here is an image inline.');
    });
  });

  describe('enforceHeadingHierarchy', () => {
    it('should not modify content with correct H2/H3 hierarchy', () => {
      const input = '## Section\n\n### Subsection\n\nContent here.';
      expect(enforceHeadingHierarchy(input)).toBe(input);
    });

    it('should demote H1 headings to H2', () => {
      const input = '# Top Level\n\nSome content.';
      expect(enforceHeadingHierarchy(input)).toBe('## Top Level\n\nSome content.');
    });
  });

  describe('sanitizeContent', () => {
    it('should strip links and enforce heading hierarchy', () => {
      const input = '# Title\n\nSee [this](https://example.com).';
      const result = sanitizeContent(input);
      expect(result).not.toContain('https://');
      expect(result).not.toContain('[');
      expect(result).toStartWith('## Title');
    });
  });
});

// Custom matcher
expect.extend({
  toStartWith(received: string, expected: string) {
    const pass = received.startsWith(expected);
    return {
      message: () => `expected ${received} to start with ${expected}`,
      pass,
    };
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toStartWith(expected: string): R;
    }
  }
}
