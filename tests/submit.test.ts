import { lintRecipe } from '../src/cli/submit';

const VALID_RECIPE = `---
title: Valid Recipe
description: A perfectly valid recipe.
author: Claude Chef Community
prep_time: PT10M
cook_time: PT20M
servings: 2
calories: 400
keywords:
  - valid
---

## Ingredients

- 100g flour
- 200ml water

## Instructions

1. Mix ingredients.
2. Cook thoroughly.
`;

const RECIPE_WITH_LINKS = `---
title: Recipe With Links
description: This recipe has links.
author: Claude Chef Community
prep_time: PT10M
cook_time: PT20M
servings: 2
calories: 400
keywords:
  - test
---

## Ingredients

- 100g flour from [this store](https://example.com)

## Instructions

1. Follow [these instructions](https://example.com/guide) carefully.
`;

const RECIPE_MISSING_FIELDS = `---
title: Incomplete Recipe
---

## Ingredients

- Some stuff

## Instructions

1. Do something.
`;

describe('Recipe Linter (chef submit)', () => {
  it('should pass a valid recipe with no errors', () => {
    const result = lintRecipe(VALID_RECIPE, 'valid-recipe.md');
    expect(result.errors).toHaveLength(0);
  });

  it('should detect hyperlinks in the body', () => {
    const result = lintRecipe(RECIPE_WITH_LINKS, 'links-recipe.md');
    expect(result.errors.some(e => e.toLowerCase().includes('hyperlink'))).toBe(true);
  });

  it('should warn about missing frontmatter fields', () => {
    const result = lintRecipe(RECIPE_MISSING_FIELDS, 'incomplete.md');
    const allMessages = [...result.errors, ...result.warnings];
    expect(allMessages.some(m => m.includes('description'))).toBe(true);
    expect(allMessages.some(m => m.includes('prep_time'))).toBe(true);
    expect(allMessages.some(m => m.includes('calories'))).toBe(true);
  });

  it('should include the filename in the result', () => {
    const result = lintRecipe(VALID_RECIPE, 'my-recipe.md');
    expect(result.file).toBe('my-recipe.md');
  });

  it('should detect missing Ingredients section', () => {
    const noIngredients = `---
title: No Ingredients
description: Missing ingredients.
author: Claude Chef Community
prep_time: PT10M
cook_time: PT20M
servings: 2
calories: 400
keywords:
  - test
---

## Instructions

1. Do something.
`;
    const result = lintRecipe(noIngredients, 'no-ingredients.md');
    expect(result.errors.some(e => e.toLowerCase().includes('ingredient'))).toBe(true);
  });

  it('should detect missing Instructions section', () => {
    const noInstructions = `---
title: No Instructions
description: Missing instructions.
author: Claude Chef Community
prep_time: PT10M
cook_time: PT20M
servings: 2
calories: 400
keywords:
  - test
---

## Ingredients

- Something
`;
    const result = lintRecipe(noInstructions, 'no-instructions.md');
    expect(result.errors.some(e => e.toLowerCase().includes('instruction'))).toBe(true);
  });
});
