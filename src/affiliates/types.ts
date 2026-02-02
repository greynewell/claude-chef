export interface AffiliateProvider {
  name: string;
  generateLink(term: string): string;
}

export interface AffiliateLink {
  provider: string;
  term: string;
  url: string;
}
