import { AffiliateProvider } from './types';

export class WalmartProvider implements AffiliateProvider {
  name = 'Walmart';
  private affiliateId?: string;

  constructor(affiliateId?: string) {
    this.affiliateId = affiliateId;
  }

  generateLink(term: string): string {
    const encoded = encodeURIComponent(term).replace(/%20/g, '+');
    let url = `https://www.walmart.com/search?q=${encoded}`;
    if (this.affiliateId) {
      url += `&affiliateId=${this.affiliateId}`;
    }
    return url;
  }
}
