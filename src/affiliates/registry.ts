import { AffiliateProvider } from './types';
import { AmazonProvider } from './amazon';
import { WalmartProvider } from './walmart';

export function buildProviders(env: Record<string, string | undefined>): AffiliateProvider[] {
  const providers: AffiliateProvider[] = [];

  if (env.AMAZON_AFFILIATE_TAG) {
    providers.push(new AmazonProvider(env.AMAZON_AFFILIATE_TAG));
  }

  if (env.WALMART_AFFILIATE_ID) {
    providers.push(new WalmartProvider(env.WALMART_AFFILIATE_ID));
  }

  return providers;
}
