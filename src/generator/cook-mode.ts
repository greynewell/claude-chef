import { EnrichmentResult } from '../enrichment/types';
import { AffiliateLink } from '../affiliates/types';
import { ParsedRecipe } from '../types';

export function generateCookModePrompt(
  enrichment: EnrichmentResult,
  affiliateLinks: AffiliateLink[],
  recipe: ParsedRecipe
): string {
  const ingredientsList = recipe.ingredients.map(i => `- ${i}`).join('\n');
  const instructionsList = recipe.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n');

  const tips = enrichment.cookingTips.map(t => `- ${t}`).join('\n');

  let shoppingSection = '';
  if (affiliateLinks.length > 0) {
    const linkLines = affiliateLinks.map(l => `- ${l.term}: ${l.url} (${l.provider})`).join('\n');
    shoppingSection = `\n\nShopping Links:\n${linkLines}`;
  }

  return `I want to cook: ${recipe.frontmatter.title}

${enrichment.coachingPrompt}

Ingredients:
${ingredientsList}

Instructions:
${instructionsList}

Key Tips:
${tips}${shoppingSection}

Please guide me through this recipe step by step, including timing, technique details, and what to watch for at each stage.`;
}
