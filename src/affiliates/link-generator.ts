import { AffiliateLink, AffiliateProvider } from './types';
import { EnrichmentResult } from '../enrichment/types';

export function generateAffiliateLinks(
  enrichment: EnrichmentResult,
  providers: AffiliateProvider[]
): AffiliateLink[] {
  const links: AffiliateLink[] = [];

  const allTerms = [
    ...enrichment.ingredients.map(i => i.searchTerm),
    ...enrichment.gear.map(g => g.searchTerm),
  ];

  for (const provider of providers) {
    for (const term of allTerms) {
      links.push({
        provider: provider.name,
        term,
        url: provider.generateLink(term),
      });
    }
  }

  return links;
}
