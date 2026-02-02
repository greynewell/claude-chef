import { AffiliateProvider } from './types';

export class AmazonProvider implements AffiliateProvider {
  name = 'Amazon';
  private tag: string;

  constructor(tag: string) {
    this.tag = tag;
  }

  generateLink(term: string): string {
    const encoded = encodeURIComponent(term).replace(/%20/g, '+');
    return `https://www.amazon.com/s?k=${encoded}&tag=${this.tag}`;
  }
}
