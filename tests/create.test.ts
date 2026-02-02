import * as fs from 'fs';
import * as path from 'path';
import { scaffoldRecipe, createRecipeFile } from '../src/cli/create';

const TEST_DIR = path.resolve(__dirname, '../.test-create-recipes');

describe('scaffoldRecipe', () => {
  it('should generate valid frontmatter with title and slug', () => {
    const content = scaffoldRecipe('Spicy Garlic Noodles');
    expect(content).toContain('title: Spicy Garlic Noodles');
    expect(content).toContain('description:');
    expect(content).toContain('author: Claude Chef Community');
    expect(content).toContain('## Ingredients');
    expect(content).toContain('## Instructions');
  });

  it('should generate a slug-friendly filename', () => {
    const content = scaffoldRecipe('My Amazing Recipe!');
    expect(content).toContain('title: My Amazing Recipe!');
  });

  it('should include all required frontmatter fields', () => {
    const content = scaffoldRecipe('Test');
    expect(content).toContain('prep_time:');
    expect(content).toContain('cook_time:');
    expect(content).toContain('servings:');
    expect(content).toContain('calories:');
    expect(content).toContain('keywords:');
  });
});

describe('createRecipeFile', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('should create a .md file with the slugified name', () => {
    const filePath = createRecipeFile('Spicy Garlic Noodles', TEST_DIR);
    expect(filePath).toContain('spicy-garlic-noodles.md');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('title: Spicy Garlic Noodles');
  });

  it('should not overwrite an existing recipe', () => {
    createRecipeFile('Duplicate Recipe', TEST_DIR);
    expect(() => createRecipeFile('Duplicate Recipe', TEST_DIR)).toThrow(/already exists/);
  });

  it('should create the recipes directory if it does not exist', () => {
    const nestedDir = path.join(TEST_DIR, 'nested');
    const filePath = createRecipeFile('Nested Recipe', nestedDir);
    expect(fs.existsSync(filePath)).toBe(true);
  });
});
