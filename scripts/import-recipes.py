#!/usr/bin/env python3
"""
Import recipes from the Shengtao/recipe dataset (MIT license, HuggingFace)
into Claude Chef markdown + YAML frontmatter format.

Usage:
    python3 scripts/import-recipes.py <parquet_file> [--limit 10000] [--output recipes/]
"""

import pandas as pd
import re
import json
import ast
import sys
import os
from collections import Counter


# === Category mapping: dataset slug -> Claude Chef category ===
CATEGORY_MAP = {
    'main-dish': 'Main Course',
    'desserts': 'Dessert',
    'appetizers-and-snacks': 'Appetizer',
    'side-dish': 'Side Dish',
    'salad': 'Salad',
    'bread': 'Bread',
    'soups-stews-and-chili': 'Soup',
    'meat-and-poultry': 'Main Course',
    'breakfast-and-brunch': 'Breakfast',
    'seafood': 'Main Course',
    'drinks': 'Beverage',
    'world-cuisine': 'Main Course',
    'trusted-brands-recipes-and-tips': 'Main Course',
    'everyday-cooking': 'Main Course',
    'fruits-and-vegetables': 'Side Dish',
    'pasta-and-noodles': 'Main Course',
    'holidays-and-events': 'Main Course',
    'bbq-grilling': 'Main Course',
    'uncategorized': 'Main Course',
    'ingredients': 'Side Dish',
}

# === Allergy detection from ingredient text ===
ALLERGY_KEYWORDS = {
    'Dairy': ['milk', 'butter', 'cream', 'cheese', 'yogurt', 'sour cream', 'whipping cream',
              'half-and-half', 'half and half', 'buttermilk', 'ghee', 'mozzarella',
              'parmesan', 'cheddar', 'ricotta', 'mascarpone', 'gruyere', 'brie',
              'gouda', 'feta', 'provolone', 'colby', 'monterey jack', 'swiss cheese',
              'cream cheese', 'cottage cheese', 'evaporated milk', 'condensed milk',
              'whole milk', 'skim milk', 'heavy cream', 'light cream', 'whipped cream'],
    'Gluten': ['flour', 'bread', 'pasta', 'noodle', 'spaghetti', 'macaroni', 'penne',
               'fettuccine', 'linguine', 'lasagna', 'couscous', 'breadcrumb', 'cracker',
               'tortilla', 'pita', 'baguette', 'croissant', 'crouton', 'panko',
               'soy sauce', 'teriyaki', 'worcestershire', 'beer', 'malt',
               'all-purpose flour', 'wheat', 'semolina', 'barley', 'rye', 'orzo'],
    'Eggs': ['egg', 'eggs', 'egg white', 'egg yolk', 'mayonnaise', 'mayo'],
    'Soy': ['soy sauce', 'soy', 'tofu', 'tempeh', 'edamame', 'miso', 'teriyaki'],
    'Tree Nuts': ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut',
                  'macadamia', 'pine nut', 'pine nuts', 'chestnut', 'brazil nut'],
    'Peanuts': ['peanut', 'peanuts', 'peanut butter'],
    'Shellfish': ['shrimp', 'crab', 'lobster', 'crawfish', 'crayfish', 'prawn',
                  'scallop', 'clam', 'mussel', 'oyster'],
    'Fish': ['salmon', 'tuna', 'cod', 'tilapia', 'halibut', 'trout', 'bass',
             'swordfish', 'mahi', 'anchovy', 'anchovies', 'sardine', 'catfish',
             'snapper', 'grouper', 'fish sauce', 'fish'],
    'Sesame': ['sesame', 'tahini'],
}

# === Flavor detection ===
FLAVOR_KEYWORDS = {
    'Sweet': ['sugar', 'honey', 'maple', 'brown sugar', 'powdered sugar',
              'molasses', 'agave', 'caramel', 'chocolate', 'vanilla extract',
              'sweet', 'condensed milk', 'corn syrup', 'jam', 'jelly',
              'marshmallow', 'candy', 'cake', 'cookie', 'pie', 'dessert'],
    'Savory': ['chicken broth', 'beef broth', 'stock', 'bouillon',
               'worcestershire', 'soy sauce', 'meat', 'bacon', 'ham',
               'mushroom', 'onion', 'garlic', 'thyme', 'rosemary', 'sage'],
    'Spicy': ['cayenne', 'chili', 'chile', 'jalapeno', 'habanero', 'hot sauce',
              'sriracha', 'tabasco', 'red pepper flakes', 'chipotle',
              'crushed red pepper', 'serrano', 'ghost pepper', 'wasabi'],
    'Sour': ['lemon', 'lime', 'vinegar', 'tamarind', 'sour cream',
             'buttermilk', 'yogurt', 'citrus', 'grapefruit', 'cranberry'],
    'Umami': ['soy sauce', 'fish sauce', 'miso', 'parmesan', 'mushroom',
              'tomato paste', 'anchovy', 'worcestershire', 'nutritional yeast',
              'dried tomato', 'seaweed', 'kombu', 'bonito'],
    'Smoky': ['smoked paprika', 'liquid smoke', 'chipotle', 'smoked',
              'barbecue', 'mesquite', 'hickory'],
    'Tangy': ['mustard', 'pickle', 'caper', 'horseradish', 'relish',
              'dijon', 'apple cider vinegar', 'balsamic'],
    'Herbaceous': ['basil', 'cilantro', 'parsley', 'dill', 'mint',
                   'oregano', 'thyme', 'rosemary', 'sage', 'tarragon',
                   'chive', 'bay leaf'],
}

# === Tool detection from instruction text ===
TOOL_KEYWORDS = {
    'Oven': ['oven', 'bake', 'roast', 'broil', 'preheat'],
    'Skillet': ['skillet', 'fry', 'frying pan', 'saut'],
    'Mixing Bowl': ['bowl', 'mix', 'combine', 'whisk', 'stir together'],
    'Baking Sheet': ['baking sheet', 'sheet pan', 'cookie sheet', 'parchment'],
    'Saucepan': ['saucepan', 'sauce pan'],
    'Stock Pot': ['stock pot', 'large pot', 'soup pot', 'dutch oven', 'stockpot'],
    'Blender': ['blender', 'blend', 'puree', 'purée'],
    'Food Processor': ['food processor', 'process until', 'pulse'],
    'Grill': ['grill', 'grilled', 'grilling', 'charcoal', 'barbecue'],
    'Slow Cooker': ['slow cooker', 'crock pot', 'crockpot'],
    'Instant Pot': ['instant pot', 'pressure cook'],
    'Stand Mixer': ['stand mixer', 'mixer', 'electric mixer', 'hand mixer'],
    'Cutting Board': ['chop', 'dice', 'mince', 'slice', 'julienne', 'cut'],
    'Rolling Pin': ['roll out', 'rolling pin', 'roll the dough'],
    'Whisk': ['whisk'],
    'Colander': ['drain', 'colander', 'strainer'],
    'Baking Dish': ['baking dish', 'casserole dish', '9x13', '8x8', 'baking pan'],
    'Muffin Tin': ['muffin tin', 'muffin pan', 'cupcake'],
    'Cake Pan': ['cake pan', 'springform', 'bundt'],
    'Pie Dish': ['pie dish', 'pie plate', 'pie pan', 'pie crust'],
    'Wok': ['wok', 'stir-fry', 'stir fry'],
}

# === Cuisine detection ===
CUISINE_KEYWORDS = {
    'Italian': ['pasta', 'penne', 'spaghetti', 'lasagna', 'risotto', 'gnocchi',
                'focaccia', 'bruschetta', 'pesto', 'marinara', 'bolognese',
                'prosciutto', 'pancetta', 'mozzarella', 'parmesan', 'ricotta',
                'tiramisu', 'cannoli', 'biscotti', 'italian'],
    'Mexican': ['tortilla', 'taco', 'burrito', 'enchilada', 'salsa', 'guacamole',
                'jalapeno', 'chipotle', 'cumin', 'cilantro', 'queso', 'churro',
                'quesadilla', 'fajita', 'mexican', 'chili powder'],
    'Chinese': ['soy sauce', 'wok', 'stir-fry', 'ginger', 'sesame oil',
                'rice vinegar', 'hoisin', 'five spice', 'chinese', 'bok choy',
                'tofu', 'lo mein', 'fried rice', 'dumpling', 'dim sum',
                'szechuan', 'kung pao', 'sweet and sour'],
    'Indian': ['curry', 'turmeric', 'garam masala', 'cumin', 'coriander',
               'cardamom', 'naan', 'tandoori', 'masala', 'paneer', 'dal',
               'chutney', 'biryani', 'tikka', 'indian', 'basmati'],
    'Japanese': ['miso', 'teriyaki', 'wasabi', 'sushi', 'nori', 'sake',
                 'mirin', 'dashi', 'ramen', 'udon', 'tempura', 'japanese',
                 'edamame', 'ponzu', 'togarashi'],
    'Thai': ['thai', 'coconut milk', 'lemongrass', 'fish sauce', 'thai basil',
             'galangal', 'pad thai', 'green curry', 'red curry', 'sriracha',
             'kaffir lime'],
    'French': ['beurre', 'french', 'béchamel', 'bechamel', 'roux', 'gratin',
               'soufflé', 'souffle', 'crepe', 'quiche', 'croissant', 'brioche',
               'dijon', 'herbes de provence', 'béarnaise', 'hollandaise'],
    'Mediterranean': ['olive oil', 'feta', 'hummus', 'pita', 'tahini',
                      'mediterranean', 'greek', 'za\'atar', 'zaatar',
                      'greek yogurt', 'kalamata', 'tzatziki'],
    'Korean': ['gochujang', 'kimchi', 'korean', 'sesame', 'bibimbap',
               'bulgogi', 'gochugaru', 'doenjang'],
    'Southern': ['cornbread', 'grits', 'collard', 'biscuits and gravy',
                 'fried chicken', 'pecan pie', 'sweet tea', 'hush puppy',
                 'jambalaya', 'gumbo', 'cajun', 'creole', 'blackened'],
    'American': ['hamburger', 'hot dog', 'mac and cheese', 'meatloaf',
                 'corndog', 'buffalo wing', 'ranch'],
}


def clean_author_name(name: str) -> str:
    """Clean up author names that are emails, usernames, or numeric IDs."""
    name = name.strip()
    if not name:
        return 'Community'

    if '@' in name:
        local_part = name.split('@')[0]
        local_part = re.sub(r'[._]+', ' ', local_part)
        local_part = re.sub(r'\d+$', '', local_part).strip()
        if not local_part:
            return 'Community'
        return local_part.title()

    if name.isdigit():
        return f'Chef {name}'

    if re.fullmatch(r'[a-z0-9]+', name):
        cleaned = re.sub(r'\d+$', '', name)
        if not cleaned:
            return f'Chef {name}'
        return cleaned.title()

    return name.title()


def slugify(title: str) -> str:
    """Convert title to URL-friendly slug."""
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = re.sub(r'^-|-$', '', slug)
    return slug


def parse_time_to_iso(time_str: str) -> str:
    """Convert '1 hr 30 mins' or '10 mins' to ISO 8601 'PT1H30M'."""
    if not time_str or pd.isna(time_str):
        return 'PT0M'

    time_str = str(time_str).strip().lower()
    hours = 0
    minutes = 0

    hr_match = re.search(r'(\d+)\s*(?:hrs?|hours?)', time_str)
    if hr_match:
        hours = int(hr_match.group(1))

    min_match = re.search(r'(\d+)\s*(?:mins?|minutes?)', time_str)
    if min_match:
        minutes = int(min_match.group(1))

    day_match = re.search(r'(\d+)\s*(?:days?)', time_str)
    if day_match:
        hours += int(day_match.group(1)) * 24

    if hours == 0 and minutes == 0:
        num_match = re.search(r'(\d+)', time_str)
        if num_match:
            minutes = int(num_match.group(1))
        else:
            return 'PT0M'

    if hours > 0 and minutes > 0:
        return f'PT{hours}H{minutes}M'
    elif hours > 0:
        return f'PT{hours}H'
    else:
        return f'PT{minutes}M'


def parse_ingredients_list(ingredients_str: str) -> list[str]:
    """Parse semicolon-separated ingredient string into a list."""
    if not ingredients_str or pd.isna(ingredients_str):
        return []
    items = [item.strip() for item in ingredients_str.split(';')]
    return [item for item in items if item]


def parse_instructions(row) -> list[str]:
    """Parse instructions from either instructions_list (JSON) or directions (text)."""
    if pd.notna(row.get('instructions_list')):
        try:
            steps = ast.literal_eval(row['instructions_list'])
            if isinstance(steps, list) and len(steps) > 0:
                return [step.strip() for step in steps if step.strip()]
        except (ValueError, SyntaxError):
            pass

    if pd.notna(row.get('directions')):
        text = row['directions']
        sentences = re.split(r'(?<=\.)\s+(?=[A-Z])', text)
        return [s.strip() for s in sentences if s.strip()]

    return []


def extract_ingredient_tags(ingredients: list[str]) -> list[str]:
    """Extract clean ingredient names for recipe_ingredients tags."""
    # Comprehensive unit patterns
    UNITS = (
        r'cups?|tablespoons?|teaspoons?|tbsps?|tsps?|ounces?|oz|pounds?|lbs?|'
        r'grams?|g|kilograms?|kg|milligrams?|mg|liters?|l|milliliters?|ml|'
        r'quarts?|gallons?|pints?|fluid\s+ounces?|fl\s+oz|'
        r'pinch(?:es)?|dash(?:es)?|drops?|sprigs?|stalks?|cloves?|heads?|'
        r'bunch(?:es)?|handfuls?|pieces?|slices?|strips?|cubes?|wedges?|'
        r'sticks?|sheets?|leaves?|ears?|ribs?|links?|loaves?|rounds?|halves?|'
        r'inch(?:es)?|cm|centimeters?|mm|millimeters?'
    )

    # Container words to remove
    CONTAINERS = (
        r'cans?|jars?|bags?|boxes?|packages?|pkgs?|packets?|bottles?|cartons?|'
        r'containers?|tubs?|pouches?|envelopes?|sleeves?|rolls?|bars?|blocks?'
    )

    # Preparation words to remove
    PREPARATIONS = (
        r'chopped|diced|minced|sliced|shredded|grated|crushed|crumbled|ground|'
        r'mashed|pureed|puréed|julienned|cubed|quartered|halved|'
        r'peeled|cored|seeded|deveined|deboned|skinless|boneless|bone[\s\-]?in|skin[\s\-]?on|'
        r'trimmed|washed|rinsed|drained|patted\s+dry|dried|fresh|frozen|'
        r'thawed|softened|melted|cooled|chilled|room\s+temperature|'
        r'cooked|uncooked|raw|toasted|roasted|sauteed|sautéed|fried|'
        r'blanched|steamed|boiled|grilled|baked|smoked|cured|'
        r'beaten|whisked|sifted|packed|loosely\s+packed|firmly\s+packed|'
        r'divided|plus\s+more|optional|to\s+taste|as\s+needed|for\s+garnish|'
        r'finely|coarsely|roughly|thinly|thickly|lightly|well|'
        r'freshly|newly|just|recently|cracked|zested|juiced|'
        r'cut\s+into|cut\s+in|broken\s+into|torn\s+into|'
        r'crosswise|lengthwise|diagonally|horizontally|vertically|'
        r'cut|each'
    )

    # Size descriptors to remove
    SIZES = (
        r'extra[\s\-]?large|extra[\s\-]?small|'
        r'large|medium|small|big|little|tiny|huge|'
        r'thick|thin|wide|narrow|long|short'
    )

    # Brand/quality descriptors to remove
    # NOTE: vanilla/chocolate are NOT removed - they're key flavor ingredients
    DESCRIPTORS = (
        r'organic|natural|all[\s\-]?natural|pure|real|authentic|'
        r'homemade|store[\s\-]?bought|prepared|ready[\s\-]?made|'
        r'low[\s\-]?fat|fat[\s\-]?free|reduced[\s\-]?fat|nonfat|non[\s\-]?fat|'
        r'low[\s\-]?sodium|no[\s\-]?salt|unsalted|salted|'
        r'sweetened|unsweetened|sugar[\s\-]?free|'
        r'whole|skim|2%|1%|'
        r'extra[\s\-]?virgin|virgin|light|dark|'
        r'plain|flavored'
    )

    # Plural to singular mappings
    PLURAL_MAP = {
        'eggs': 'egg', 'tomatoes': 'tomato', 'potatoes': 'potato',
        'onions': 'onion', 'carrots': 'carrot', 'peppers': 'pepper',
        'mushrooms': 'mushroom', 'olives': 'olive', 'apples': 'apple',
        'oranges': 'orange', 'lemons': 'lemon', 'limes': 'lime',
        'bananas': 'banana', 'berries': 'berry', 'cherries': 'cherry',
        'strawberries': 'strawberry', 'blueberries': 'blueberry',
        'raspberries': 'raspberry', 'blackberries': 'blackberry',
        'cranberries': 'cranberry', 'grapes': 'grape',
        'peaches': 'peach', 'pears': 'pear', 'plums': 'plum',
        'avocados': 'avocado', 'mangoes': 'mango', 'mangos': 'mango',
        'shallots': 'shallot', 'scallions': 'scallion', 'chives': 'chive',
        'anchovies': 'anchovy', 'sardines': 'sardine',
        'shrimp': 'shrimp', 'clams': 'clam', 'mussels': 'mussel',
        'oysters': 'oyster', 'scallops': 'scallop',
        'chicken breasts': 'chicken breast', 'chicken thighs': 'chicken thigh',
        'pork chops': 'pork chop', 'lamb chops': 'lamb chop',
        'tortillas': 'tortilla', 'noodles': 'noodle', 'crackers': 'cracker',
        'breadcrumbs': 'breadcrumb', 'croutons': 'crouton',
        'almonds': 'almond', 'walnuts': 'walnut', 'pecans': 'pecan',
        'cashews': 'cashew', 'peanuts': 'peanut', 'pistachios': 'pistachio',
        'hazelnuts': 'hazelnut', 'pine nuts': 'pine nut',
        'raisins': 'raisin', 'dates': 'date', 'prunes': 'prune',
        'beans': 'bean', 'lentils': 'lentil', 'chickpeas': 'chickpea',
        'peas': 'pea', 'sprouts': 'sprout',
        'chips': 'chip', 'flakes': 'flake', 'crumbs': 'crumb',
    }

    tags = []
    seen_lower = set()

    for ing in ingredients:
        cleaned = ing.strip()

        # 1. Remove parenthetical content first (often contains sizes/notes)
        cleaned = re.sub(r'\([^)]*\)', '', cleaned)

        # 2. Remove quantities: numbers, fractions, ranges at start or throughout
        cleaned = re.sub(r'^[\d½¼¾⅓⅔⅛⅜⅝⅞\s\/\.\-]+', '', cleaned)
        cleaned = re.sub(r'\b\d+[\d\/\.\-]*\b', '', cleaned)

        # 3. Remove units (with word boundaries)
        cleaned = re.sub(rf'\b({UNITS})\b\.?', '', cleaned, flags=re.IGNORECASE)

        # 4. Remove containers
        cleaned = re.sub(rf'\b({CONTAINERS})\b', '', cleaned, flags=re.IGNORECASE)

        # 5. Remove preparations
        cleaned = re.sub(rf'\b({PREPARATIONS})\b', '', cleaned, flags=re.IGNORECASE)

        # 6. Remove sizes
        cleaned = re.sub(rf'\b({SIZES})\b', '', cleaned, flags=re.IGNORECASE)

        # 7. Remove descriptors
        cleaned = re.sub(rf'\b({DESCRIPTORS})\b', '', cleaned, flags=re.IGNORECASE)

        # 8. Remove trailing comma phrases (cooking instructions like "cut into strips")
        cleaned = re.sub(r',\s*(at room temperature|softened|melted|to taste|for serving|for garnish|or to taste|if desired|as needed|divided|plus more).*$', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r',\s*(cut into|sliced into|chopped into|broken into).*$', '', cleaned, flags=re.IGNORECASE)
        # Clean up dangling commas but keep content after them
        cleaned = re.sub(r'\s*,\s*', ' ', cleaned)

        # 9. Clean up dangling hyphens from compound words
        cleaned = re.sub(r'\B-|-\B', ' ', cleaned)

        # 10. Remove dangling conjunctions and prepositions
        # First, remove standalone conjunctions in the middle (surrounded by spaces)
        cleaned = re.sub(r'\s+(and|or|with|into|in|to|for|from|of)\s+', ' ', cleaned, flags=re.IGNORECASE)
        # Then remove at start/end
        cleaned = re.sub(r'\b(and|or|with|into|in|to|for|from|of)\s*$', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'^\s*(and|or|with|into|in|to|for|from|of)\b', '', cleaned, flags=re.IGNORECASE)

        # 11. Remove leading/trailing punctuation and whitespace
        cleaned = re.sub(r'^[\s\-,;:\.]+|[\s\-,;:\.]+$', '', cleaned)

        # 12. Collapse multiple spaces
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()

        # 13. Skip if too short or just common words
        if len(cleaned) < 2:
            continue
        skip_words = {'of', 'or', 'and', 'the', 'a', 'an', 'for', 'with', 'your', 'favorite'}
        if cleaned.lower() in skip_words:
            continue

        # 14. Normalize plurals
        cleaned_lower = cleaned.lower()
        for plural, singular in PLURAL_MAP.items():
            if cleaned_lower == plural:
                cleaned = singular.title() if cleaned[0].isupper() else singular
                cleaned_lower = singular
                break

        # 15. Title case
        tag = cleaned.title()

        # 16. Deduplicate (case-insensitive)
        tag_lower = tag.lower()
        if tag_lower not in seen_lower and len(tag) > 1:
            seen_lower.add(tag_lower)
            tags.append(tag)

    return tags[:12]


def detect_allergies(ingredients_lower: str) -> list[str]:
    """Detect potential allergens from ingredient text."""
    allergies = []
    for allergy, keywords in ALLERGY_KEYWORDS.items():
        for kw in keywords:
            if kw in ingredients_lower:
                allergies.append(allergy)
                break
    return allergies


def detect_flavors(ingredients_lower: str, title_lower: str) -> list[str]:
    """Detect flavor profiles from ingredients and title."""
    flavors = []
    combined = ingredients_lower + ' ' + title_lower
    for flavor, keywords in FLAVOR_KEYWORDS.items():
        for kw in keywords:
            if kw in combined:
                flavors.append(flavor)
                break
    return flavors[:5]


def detect_tools(instructions_lower: str) -> list[str]:
    """Detect cooking tools from instructions."""
    tools = []
    for tool, keywords in TOOL_KEYWORDS.items():
        for kw in keywords:
            if kw in instructions_lower:
                tools.append(tool)
                break
    return tools[:6]


def detect_cuisine(ingredients_lower: str, title_lower: str, category: str) -> str | None:
    """Detect cuisine from ingredients and title."""
    combined = ingredients_lower + ' ' + title_lower + ' ' + category.lower()
    scores = {}
    for cuisine, keywords in CUISINE_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in combined)
        if score >= 2:
            scores[cuisine] = score
    if scores:
        return max(scores, key=scores.get)
    return None


def infer_skill_level(prep_time_min: int, cook_time_min: int, num_ingredients: int,
                      num_steps: int) -> str:
    """Infer skill level from recipe complexity."""
    complexity = 0
    total_time = prep_time_min + cook_time_min
    if total_time > 120:
        complexity += 2
    elif total_time > 60:
        complexity += 1

    if num_ingredients > 15:
        complexity += 2
    elif num_ingredients > 10:
        complexity += 1

    if num_steps > 10:
        complexity += 2
    elif num_steps > 6:
        complexity += 1

    if complexity >= 4:
        return 'Hard'
    elif complexity >= 2:
        return 'Medium'
    return 'Easy'


def time_to_minutes(iso_time: str) -> int:
    """Convert ISO 8601 duration to minutes."""
    hours = 0
    minutes = 0
    h_match = re.search(r'(\d+)H', iso_time)
    m_match = re.search(r'(\d+)M', iso_time)
    if h_match:
        hours = int(h_match.group(1))
    if m_match:
        minutes = int(m_match.group(1))
    return hours * 60 + minutes


def extract_keywords(title: str, category: str, ingredients: list[str]) -> list[str]:
    """Generate keywords from title, category, and key ingredients."""
    keywords = set()
    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                  'of', 'with', 'by', 'from', 'is', 'it', 'my', 'our', 'your', 'best',
                  'easy', 'simple', 'quick', 'homemade', 'recipe', 'style', 'old',
                  'fashioned', 'ever', 'favorite', 'favourite', 'good', 'great', 'super',
                  'really', 'very', 'most', 'more', 'i', 'ii', 'iii', 'no'}
    for word in re.findall(r'[a-z]+', title.lower()):
        if word not in stop_words and len(word) > 2:
            keywords.add(word)
    for word in re.findall(r'[a-z]+', category.lower()):
        if word not in stop_words and len(word) > 2:
            keywords.add(word)
    return sorted(list(keywords))[:8]


def generate_unique_description(title: str, category: str, cuisine: str | None,
                                ingredients: list[str], prep_min: int, cook_min: int,
                                calories: int, skill_level: str, servings: int) -> str:
    """Generate a unique, SEO-friendly description for a recipe."""
    import random

    key_ingredients = [ing.split(',')[0].strip() for ing in ingredients[:5]]
    clean_ings = []
    for ing in key_ingredients:
        # Remove parenthetical content
        cleaned = re.sub(r'\([^)]*\)', '', ing)
        # Remove quantities
        cleaned = re.sub(r'^[\d½¼¾⅓⅔⅛⅜⅝⅞\s\/\.\-]+', '', cleaned)
        # Remove units and containers
        cleaned = re.sub(
            r'\b(cups?|tablespoons?|teaspoons?|tbsps?|tsps?|ounces?|oz|pounds?|lbs?|'
            r'grams?|cloves?|cans?|jars?|bags?|packages?|pkgs?|bottles?|'
            r'pieces?|slices?|stalks?|sprigs?|heads?|bunche?s?)\b\.?',
            '', cleaned, flags=re.IGNORECASE
        )
        # Remove prep words
        cleaned = re.sub(
            r'\b(chopped|diced|minced|sliced|shredded|grated|peeled|'
            r'fresh|frozen|large|medium|small|finely|coarsely)\b',
            '', cleaned, flags=re.IGNORECASE
        )
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        if cleaned and len(cleaned) > 2:
            clean_ings.append(cleaned.lower())
    clean_ings = clean_ings[:3]

    total_min = prep_min + cook_min
    time_desc = ''
    if total_min > 0 and total_min <= 30:
        time_desc = 'ready in under 30 minutes'
    elif total_min > 0 and total_min <= 60:
        time_desc = f'ready in about {total_min} minutes'
    elif total_min > 60:
        hours = total_min // 60
        mins = total_min % 60
        if mins > 0:
            time_desc = f'ready in about {hours} hour{"s" if hours > 1 else ""} and {mins} minutes'
        else:
            time_desc = f'ready in about {hours} hour{"s" if hours > 1 else ""}'

    cuisine_desc = f'{cuisine} ' if cuisine else ''

    ing_phrase_2 = ", ".join(clean_ings[:2]) if clean_ings else "simple ingredients"
    star_ing = clean_ings[0] if clean_ings else "fresh ingredients"
    time_cap = time_desc.capitalize() if time_desc else "Simple to prepare"

    templates = [
        f'A delicious {cuisine_desc}{category.lower()} made with {ing_phrase_2}. {time_cap} and serves {servings}.',
        f'This {skill_level.lower()}-level {cuisine_desc}{category.lower()} features {ing_phrase_2} and is {time_desc}. Serves {servings}.',
        f'Built around {star_ing}, this {cuisine_desc}{category.lower()} is {time_desc}. Yields {servings} servings.',
        f'{time_cap}, this {cuisine_desc}{category.lower()} uses {ing_phrase_2}. Serves {servings} at {calories} calories each.',
        f'A flavorful dish — this {category.lower()} uses {ing_phrase_2} and is {time_desc}. Serves {servings}.',
    ]

    idx = hash(title) % len(templates)
    desc = templates[idx]

    if len(desc) > 200:
        desc = desc[:197] + '...'
    return desc


def generate_faqs(title: str, category: str, cuisine: str | None,
                  ingredients: list[str], instructions: list[str],
                  allergies: list[str], calories: int, servings: int,
                  prep_min: int, cook_min: int, skill_level: str,
                  tools: list[str]) -> list[tuple[str, str]]:
    """Generate 5-6 unique FAQ Q&A pairs for a recipe."""
    faqs = []
    title_lower = title.lower()

    total_time = prep_min + cook_min

    if total_time > 0:
        time_str = f'{total_time} minutes' if total_time < 60 else f'{total_time // 60} hour{"s" if total_time >= 120 else ""}{" and " + str(total_time % 60) + " minutes" if total_time % 60 else ""}'
        faqs.append((
            f'How long does it take to make {title}?',
            f'This recipe takes approximately {time_str} from start to finish — {prep_min} minutes of prep and {cook_min} minutes of cooking. It is rated as {skill_level.lower()} difficulty.'
        ))
    else:
        faqs.append((
            f'How difficult is {title} to make?',
            f'This recipe is rated {skill_level.lower()} difficulty.'
        ))

    faqs.append((
        f'How many servings does this {title} recipe make?',
        f'This recipe yields {servings} serving{"s" if servings != 1 else ""}. You can adjust the serving size using the servings slider above the ingredient list.'
    ))

    storage_answers = {
        'Dessert': f'Store leftover {title_lower} in an airtight container in the refrigerator for up to 3-4 days.',
        'Soup': f'This soup stores well in the refrigerator for 4-5 days. It also freezes well for up to 3 months.',
        'Bread': f'Store this bread at room temperature in a bread box or sealed bag for 2-3 days.',
    }
    default_storage = f'Store leftovers in an airtight container in the refrigerator for up to 3-4 days.'
    faqs.append((
        f'Can I make {title} ahead of time? How should I store leftovers?',
        storage_answers.get(category, default_storage)
    ))

    if calories > 0:
        faqs.append((
            f'How many calories are in {title}?',
            f'Each serving contains approximately {calories} calories. The recipe serves {servings}.'
        ))

    if 'Oven' in tools:
        faqs.append((
            f'What temperature should I use for {title}?',
            f'Follow the temperature specified in the recipe instructions. Make sure to preheat your oven fully.'
        ))

    return faqs[:6]


def generate_recipe_markdown(row, ingredients: list[str], instructions: list[str]) -> str:
    """Generate the full markdown file content for a recipe."""
    title = str(row['title']).strip()
    raw_author = str(row.get('author', 'Community')).strip() if pd.notna(row.get('author')) else 'Community'
    author = clean_author_name(raw_author)
    prep_time = parse_time_to_iso(row.get('prep_time'))
    cook_time = parse_time_to_iso(row.get('cook_time'))
    servings = int(row.get('servings', 4)) if pd.notna(row.get('servings')) else 4
    calories = int(round(row.get('calories', 0))) if pd.notna(row.get('calories')) else 0
    category = CATEGORY_MAP.get(str(row.get('category', '')), 'Main Course')

    ingredients_lower = ' '.join(ingredients).lower()
    instructions_lower = ' '.join(instructions).lower()
    title_lower = title.lower()
    prep_min = time_to_minutes(prep_time)
    cook_min = time_to_minutes(cook_time)

    keywords = extract_keywords(title, category, ingredients)
    recipe_ingredients = extract_ingredient_tags(ingredients)
    allergies = detect_allergies(ingredients_lower)
    flavors = detect_flavors(ingredients_lower, title_lower)
    tools = detect_tools(instructions_lower)
    cuisine = detect_cuisine(ingredients_lower, title_lower, str(row.get('category', '')))
    skill_level = infer_skill_level(prep_min, cook_min, len(ingredients), len(instructions))

    lines = ['---']
    safe_title = title.replace('"', '\\"')
    lines.append(f'title: "{safe_title}"')

    description = generate_unique_description(
        title, category, cuisine, ingredients, prep_min, cook_min,
        calories, skill_level, servings
    )
    safe_desc = description.replace('"', '\\"')
    lines.append(f'description: "{safe_desc}"')

    safe_author = author.replace('"', '\\"')
    lines.append(f'author: "{safe_author}"')
    lines.append(f'prep_time: {prep_time}')
    lines.append(f'cook_time: {cook_time}')
    lines.append(f'servings: {servings}')
    lines.append(f'calories: {calories}')
    lines.append(f'recipe_category: {category}')

    if cuisine:
        lines.append(f'cuisine: {cuisine}')

    yaml_reserved = {'true', 'false', 'yes', 'no', 'null', 'on', 'off'}

    if keywords:
        lines.append('keywords:')
        for kw in keywords:
            if kw.lower() in yaml_reserved:
                lines.append(f'  - "{kw}"')
            else:
                lines.append(f'  - {kw}')

    if recipe_ingredients:
        lines.append('recipe_ingredients:')
        for ri in recipe_ingredients:
            safe_ri = ri.replace('"', '\\"').replace(':', ' -')
            lines.append(f'  - "{safe_ri}"')

    if allergies:
        lines.append('allergies:')
        for a in allergies:
            lines.append(f'  - {a}')

    if flavors:
        lines.append('flavors:')
        for f in flavors:
            lines.append(f'  - {f}')

    if tools:
        lines.append('tools:')
        for t in tools:
            lines.append(f'  - {t}')

    lines.append(f'skill_level: {skill_level}')

    # Add source URL if available
    source_url = row.get('url')
    if pd.notna(source_url) and source_url:
        lines.append(f'source_url: "{source_url}"')

    lines.append('---')
    lines.append('')

    lines.append('## Ingredients')
    lines.append('')
    for ing in ingredients:
        clean_ing = ing.strip()
        if clean_ing:
            lines.append(f'- {clean_ing}')
    lines.append('')

    lines.append('## Instructions')
    lines.append('')
    for i, step in enumerate(instructions, 1):
        clean_step = step.strip()
        if clean_step:
            clean_step = re.sub(r'^\d+[\.\)]\s*', '', clean_step)
            lines.append(f'{i}. {clean_step}')
    lines.append('')

    faqs = generate_faqs(
        title, category, cuisine, ingredients, instructions,
        allergies, calories, servings, prep_min, cook_min,
        skill_level, tools
    )
    if faqs:
        lines.append('## Frequently Asked Questions')
        lines.append('')
        for question, answer in faqs:
            lines.append(f'### {question}')
            lines.append('')
            lines.append(answer)
            lines.append('')

    return '\n'.join(lines)


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Import recipes from Shengtao/recipe dataset')
    parser.add_argument('parquet_file', help='Path to the parquet file')
    parser.add_argument('--limit', type=int, default=10000, help='Number of recipes to import')
    parser.add_argument('--output', default='recipes/', help='Output directory')
    parser.add_argument('--min-ingredients', type=int, default=3, help='Minimum ingredients')
    parser.add_argument('--min-steps', type=int, default=2, help='Minimum instruction steps')
    args = parser.parse_args()

    print(f"Loading dataset from {args.parquet_file}...")
    df = pd.read_parquet(args.parquet_file)
    print(f"  Total rows: {len(df)}")

    print("Filtering for quality...")
    df = df[df['title'].notna() & df['ingredients'].notna() & df['calories'].notna()]
    df = df[df['directions'].notna() | df['instructions_list'].notna()]
    print(f"  After basic filter: {len(df)}")

    df = df.drop_duplicates(subset='title', keep='first')
    print(f"  After dedup: {len(df)}")

    print("Processing recipes...")
    recipes = []
    seen_slugs = set()

    existing_dir = args.output
    if os.path.exists(existing_dir):
        for f in os.listdir(existing_dir):
            if f.endswith('.md'):
                seen_slugs.add(f[:-3])
        print(f"  Found {len(seen_slugs)} existing recipes to skip")

    for idx, row in df.iterrows():
        title = str(row['title']).strip()
        slug = slugify(title)

        if slug in seen_slugs or len(slug) < 3:
            continue

        ingredients = parse_ingredients_list(row['ingredients'])
        instructions = parse_instructions(row)

        if len(ingredients) < args.min_ingredients:
            continue
        if len(instructions) < args.min_steps:
            continue
        if len(title) < 5 or len(title) > 100:
            continue

        score = 0
        if pd.notna(row.get('rating')) and row['rating'] >= 4.0:
            score += 3
        elif pd.notna(row.get('rating')) and row['rating'] >= 3.5:
            score += 1
        if pd.notna(row.get('rating_count')) and row['rating_count'] >= 10:
            score += 2
        if pd.notna(row.get('prep_time')):
            score += 1
        if pd.notna(row.get('cook_time')):
            score += 1
        if len(ingredients) >= 5:
            score += 1
        if len(instructions) >= 3:
            score += 1
        if pd.notna(row.get('instructions_list')):
            score += 1

        seen_slugs.add(slug)
        recipes.append((score, slug, row, ingredients, instructions))

    recipes.sort(key=lambda x: x[0], reverse=True)
    selected = recipes[:args.limit]
    print(f"  Selected {len(selected)} recipes (from {len(recipes)} candidates)")

    print(f"Writing recipe files to {args.output}...")
    os.makedirs(args.output, exist_ok=True)

    category_counts = Counter()
    errors = 0

    for i, (score, slug, row, ingredients, instructions) in enumerate(selected):
        try:
            content = generate_recipe_markdown(row, ingredients, instructions)
            filepath = os.path.join(args.output, f'{slug}.md')
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            category = CATEGORY_MAP.get(str(row.get('category', '')), 'Main Course')
            category_counts[category] += 1
        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"  Error on '{slug}': {e}")

        if (i + 1) % 1000 == 0:
            print(f"  Written {i + 1}/{len(selected)} recipes...")

    print(f"\nDone! Wrote {len(selected) - errors} recipes ({errors} errors)")
    print(f"\nCategory distribution:")
    for cat, count in category_counts.most_common():
        print(f"  {cat}: {count}")


if __name__ == '__main__':
    main()
