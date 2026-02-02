import * as fs from 'fs';
import * as path from 'path';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function scaffoldRecipe(title: string): string {
  return `---
title: ${title}
description: TODO - Add a description
author: Claude Chef Community
prep_time: PT0M
cook_time: PT0M
servings: 1
calories: 0
keywords:
  - TODO
recipe_ingredients:
  - TODO
allergies:
  - TODO
flavors:
  - TODO
sauces:
  - TODO
tools:
  - TODO
skill_level: Easy
---

## Ingredients

- TODO: Add ingredients

## Instructions

1. TODO: Add instructions

## Notes

TODO: Add any notes or tips.
`;
}

export function createRecipeFile(title: string, recipesDir: string): string {
  if (!fs.existsSync(recipesDir)) {
    fs.mkdirSync(recipesDir, { recursive: true });
  }

  const slug = slugify(title);
  const filePath = path.join(recipesDir, `${slug}.md`);

  if (fs.existsSync(filePath)) {
    throw new Error(`Recipe file already exists: ${filePath}`);
  }

  const content = scaffoldRecipe(title);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}
