#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { lintRecipe } from './submit';
import { createRecipeFile } from './create';
import { enrichCommand } from './enrich';
import { ClaudeClient } from '../enrichment/llm-client';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'submit') {
  const recipesDir = args[1] || path.resolve(__dirname, '../../recipes');
  const files = fs.readdirSync(recipesDir).filter(f => f.endsWith('.md'));

  let hasErrors = false;

  for (const file of files) {
    const content = fs.readFileSync(path.join(recipesDir, file), 'utf-8');
    const result = lintRecipe(content, file);

    if (result.errors.length > 0 || result.warnings.length > 0) {
      console.log(`\n--- ${result.file} ---`);
      for (const error of result.errors) {
        console.log(`  ERROR: ${error}`);
        hasErrors = true;
      }
      for (const warning of result.warnings) {
        console.log(`  WARN:  ${warning}`);
      }
    } else {
      console.log(`  OK: ${result.file}`);
    }
  }

  process.exit(hasErrors ? 1 : 0);
} else if (command === 'create') {
  const title = args[1];
  if (!title) {
    console.error('Usage: chef create "Recipe Title"');
    process.exit(1);
  }
  const recipesDir = args[2] || path.resolve(__dirname, '../../recipes');
  try {
    const filePath = createRecipeFile(title, recipesDir);
    console.log(`Created: ${filePath}`);
  } catch (err: unknown) {
    console.error((err as Error).message);
    process.exit(1);
  }
} else if (command === 'enrich') {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY environment variable is required for enrichment.');
    process.exit(1);
  }
  const recipesDir = args[2] || path.resolve(__dirname, '../../recipes');
  const slug = args[1] || undefined;
  const client = new ClaudeClient(apiKey);
  enrichCommand(recipesDir, client, slug).catch(err => {
    console.error('Enrichment failed:', err);
    process.exit(1);
  });
} else {
  console.log('Usage:');
  console.log('  chef submit [recipes-dir]   Lint all recipes for submission readiness.');
  console.log('  chef create "Title"         Scaffold a new recipe markdown file.');
  console.log('  chef enrich [slug]          Enrich recipes via LLM (requires ANTHROPIC_API_KEY).');
  process.exit(1);
}
