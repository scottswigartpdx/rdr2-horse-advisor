/**
 * Data utilities for cross-referencing animals and crafting recipes
 * Computes relationships at runtime to avoid data duplication
 */

const DataUtils = {
  // Exotic birds for Algernon Wasp's stranger mission
  ALGERNON_BIRDS: ['egret', 'heron', 'spoonbill', 'parakeet', 'parrot', 'macaw'],

  // Flying birds that provide Flight Feathers (used for Campfire crafting arrows)
  FLYING_BIRD_TERMS: [
    'eagle', 'hawk', 'owl', 'crow', 'raven', 'robin', 'cardinal', 'oriole',
    'sparrow', 'songbird', 'woodpecker', 'jay', 'waxwing', 'duck', 'goose',
    'pelican', 'crane', 'cormorant', 'gull', 'loon', 'booby', 'condor',
    'vulture', 'pigeon', 'pheasant', 'quail', 'egret', 'heron', 'spoonbill',
    'parakeet', 'macaw'
  ],

  // Birds that do NOT provide Flight Feathers
  NO_FLIGHT_FEATHER_PATTERNS: ['wild turkey', 'rooster', 'chicken'],

  // Animals that provide Animal Fat (used for Campfire crafting explosives)
  ANIMAL_FAT_PROVIDERS: [
    'bear', 'beaver', 'boar', 'duck', 'goose', 'peccary', 'javelina',
    'pig', 'pheasant', 'bison'
  ],

  /**
   * Check if an animal is a flying bird that provides flight feathers
   */
  isFlyingBird(name) {
    const lower = name.toLowerCase();
    if (this.NO_FLIGHT_FEATHER_PATTERNS.some(b => lower.includes(b))) return false;
    return this.FLYING_BIRD_TERMS.some(b => lower.includes(b));
  },

  /**
   * Check if an animal is an exotic bird for Algernon
   */
  isAlgernonBird(name) {
    const lower = name.toLowerCase();
    return this.ALGERNON_BIRDS.some(bird => lower.includes(bird));
  },

  /**
   * Check if an animal provides Animal Fat
   */
  providesAnimalFat(name) {
    const lower = name.toLowerCase();
    return this.ANIMAL_FAT_PROVIDERS.some(animal => lower.includes(animal));
  },

  /**
   * Normalize animal name for matching with recipe ingredients
   */
  normalizeAnimalName(name) {
    return name.toLowerCase()
      .replace('legendary ', '')
      .replace('american ', '')
      .replace('north american ', '')
      .replace('california ', '')
      .replace('californian ', '')
      .replace('western ', '')
      .replace('sierra nevada ', '')
      .replace('rocky mountain ', '')
      .replace('banded ', '')
      .replace('bharati grizzly ', '')
      .replace('giaguaro ', '')
      .replace('wild ', '')  // "Wild Boar" -> "boar", "Wild Turkey" -> "turkey"
      .replace('bull gator', 'alligator')
      .replace(/ ?\(.*\)/, '')
      .trim();
  },

  /**
   * Expand a recipe ingredient into a list of concrete item names.
   * Supports either:
   *  - { item: "Eagle Feather", qty: 2 }
   *  - { anyOf: ["Eagle Feather", "Hawk Feather"], qty: 2 }
   */
  getIngredientItems(ing) {
    if (!ing) return [];
    if (Array.isArray(ing.anyOf)) {
      return ing.anyOf.map(x => String(x).trim()).filter(Boolean);
    }
    if (typeof ing.item === 'string' && ing.item.trim()) return [ing.item.trim()];
    return [];
  },

  /**
   * Human-friendly label for an ingredient spec (supports anyOf + match constraints).
   */
  getIngredientLabel(ing) {
    if (!ing) return '';
    if (typeof ing.label === 'string' && ing.label.trim()) return ing.label.trim();
    if (Array.isArray(ing.anyOf) && ing.anyOf.length) return ing.anyOf.join(' or ');
    if (typeof ing.item === 'string' && ing.item.trim()) return ing.item.trim();
    if (ing.match && (ing.match.all || ing.match.any || ing.match.none)) return 'Any matching item';
    return '';
  },

  /**
   * Normalize a string for ingredient-query matching (lowercase, collapse spaces).
   */
  normalizeText(s) {
    return String(s ?? '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  },

  /**
   * Return extra query terms that should be considered equivalent for matching.
   * This makes "ginseng" match Alaskan/American Ginseng, etc.
   */
  expandIngredientQueryTerms(query) {
    const q = this.normalizeText(query);
    if (!q) return [];

    const out = new Set([q]);

    // Common canonicalization / synonym expansions used across our data
    const aliasGroups = [
      ['ginseng', 'alaskan ginseng', 'american ginseng'],
      ['currant', 'blackcurrant', 'golden currant'],
      ['sage', 'hummingbird sage', 'desert sage'],
      ['shotgun shell', 'regular shotgun shell', 'slug shotgun shell'],
      ['cartridge', 'regular cartridge', 'express cartridge', 'high velocity cartridge'],
    ];

    for (const group of aliasGroups) {
      const norms = group.map(x => this.normalizeText(x));
      if (norms.includes(q)) norms.forEach(x => out.add(x));
    }

    return [...out];
  },

  /**
   * Decide if an ingredient spec matches a query (used for "what can I make with X?").
   *
   * Supported ingredient shapes:
   *  - { item: "Eagle Feather", qty: 2 }
   *  - { anyOf: ["Eagle Feather", "Hawk Feather"], qty: 2 }
   *  - { match: { all?: string[], any?: string[], none?: string[] }, label?: string, qty: 1 }
   */
  ingredientMatchesQuery(ing, query) {
    const qTerms = this.expandIngredientQueryTerms(query);
    if (!qTerms.length) return false;

    // anyOf: match if any option matches
    if (Array.isArray(ing?.anyOf)) {
      return ing.anyOf.some(opt => this.ingredientMatchesQuery({ item: opt }, query));
    }

    // item: substring match against expanded terms
    if (typeof ing?.item === 'string' && ing.item.trim()) {
      const hay = this.normalizeText(ing.item);
      return qTerms.some(q => hay.includes(q));
    }

    // match: evaluate predicate against the raw query text (plus expanded terms)
    if (ing?.match) {
      const all = Array.isArray(ing.match.all) ? ing.match.all.map(this.normalizeText) : [];
      const any = Array.isArray(ing.match.any) ? ing.match.any.map(this.normalizeText) : [];
      const none = Array.isArray(ing.match.none) ? ing.match.none.map(this.normalizeText) : [];

      // Evaluate against every expanded query term; if any expanded term satisfies, accept.
      return qTerms.some(qRaw => {
        const q = this.normalizeText(qRaw);
        if (all.length && !all.every(t => q.includes(t))) return false;
        if (any.length && !any.some(t => q.includes(t))) return false;
        if (none.length && none.some(t => q.includes(t))) return false;
        return true;
      });
    }

    return false;
  },

  /**
   * Build a map of ingredient -> crafting locations from recipes
   */
  buildIngredientLocationMap(recipes) {
    const map = {};
    for (const recipe of recipes) {
      if (!recipe.ingredients) continue;
      for (const ing of recipe.ingredients) {
        for (const itemName of this.getIngredientItems(ing)) {
          const key = itemName.toLowerCase();
          if (!map[key]) map[key] = new Set();
          map[key].add(recipe.craftedAt);
        }
      }
    }
    return map;
  },

  /**
   * Build a map of ingredient -> recipe names
   */
  buildIngredientRecipeMap(recipes) {
    const map = {};
    for (const recipe of recipes) {
      if (!recipe.ingredients) continue;
      for (const ing of recipe.ingredients) {
        for (const itemName of this.getIngredientItems(ing)) {
          const key = itemName.toLowerCase();
          if (!map[key]) map[key] = [];
          map[key].push({
            name: recipe.name,
            category: recipe.category,
            craftedAt: recipe.craftedAt,
            qty: ing.qty,
          });
        }
      }
    }
    return map;
  },

  /**
   * Return true if a recipe uses an ingredient that matches the given query.
   * (Supports item / anyOf / match.)
   */
  recipeUsesIngredientQuery(recipe, query) {
    if (!recipe?.ingredients?.length) return false;
    return recipe.ingredients.some(ing => this.ingredientMatchesQuery(ing, query));
  },

  /**
   * Check if an ingredient matches an animal
   */
  ingredientMatchesAnimal(ingredient, animal, normalized, baseAnimal) {
    const isLegendaryIngredient = ingredient.includes('legendary');
    const words = normalized.split(' ');

    // Check if any word in the animal name matches the ingredient
    // Words must be at least 3 chars to avoid false matches (e.g., "ox" in "fox")
    // Exception: always check the base animal name (last word) regardless of length
    const anyWordMatches = words.some((word, idx) => {
      const isBaseAnimal = idx === words.length - 1;
      if (isBaseAnimal) {
        // For base animal, require word boundary match to avoid "ox" matching "fox"
        const regex = new RegExp('\\b' + word + '\\b');
        return regex.test(ingredient);
      }
      return word.length >= 3 && ingredient.includes(word);
    });

    // Legendary ingredients should only match legendary animals of that type
    if (isLegendaryIngredient) {
      // Only legendary animals can match legendary ingredients
      if (!animal.legendary) return false;
      // Must contain a word from the animal name
      return anyWordMatches;
    }

    // Legendary animals only drop legendary materials, not regular pelts
    // So they should NOT match non-legendary ingredients
    if (animal.legendary) return false;

    // Non-legendary ingredients: match if any significant word matches
    // e.g., "pronghorn hide" matches "American Pronghorn Buck" via "pronghorn"
    return anyWordMatches;
  },

  /**
   * Get usedBy locations for an animal based on crafting recipes
   */
  getUsedBy(animal, ingredientLocationMap) {
    const usedBy = new Set();

    // Fish are used for cooking
    if (animal.type === 'fish') {
      usedBy.add('Cooking');
      return [...usedBy];
    }

    const normalized = this.normalizeAnimalName(animal.name);
    const words = normalized.split(' ');
    const baseAnimal = words[words.length - 1];

    // Check all ingredients for matches
    for (const [ingredient, locations] of Object.entries(ingredientLocationMap)) {
      if (this.ingredientMatchesAnimal(ingredient, animal, normalized, baseAnimal)) {
        locations.forEach(loc => usedBy.add(loc));
      }
    }

    // Check if exotic bird for Algernon
    if (this.isAlgernonBird(animal.name)) {
      usedBy.add('Algernon');
    }

    // Flying birds provide Flight Feathers -> Campfire crafting
    if (this.isFlyingBird(animal.name)) {
      usedBy.add('Campfire');
    }

    // Animals that provide Animal Fat -> Campfire crafting (explosives, fire bottles)
    if (this.providesAnimalFat(animal.name)) {
      usedBy.add('Campfire');
    }

    return [...usedBy];
  },

  /**
   * Get unlocks (what items can be crafted) for an animal
   */
  getUnlocks(animal, ingredientRecipeMap) {
    if (animal.type === 'fish') return [];

    const unlocks = [];
    const normalized = this.normalizeAnimalName(animal.name);
    const words = normalized.split(' ');
    const baseAnimal = words[words.length - 1];
    const seen = new Set();

    for (const [ingredient, recipes] of Object.entries(ingredientRecipeMap)) {
      if (this.ingredientMatchesAnimal(ingredient, animal, normalized, baseAnimal)) {
        for (const recipe of recipes) {
          if (!seen.has(recipe.name)) {
            seen.add(recipe.name);
            unlocks.push({
              name: recipe.name,
              category: recipe.category,
              craftedAt: recipe.craftedAt,
              qty: recipe.qty
            });
          }
        }
      }
    }

    // Animals that provide Animal Fat unlock fat-based recipes
    if (this.providesAnimalFat(animal.name) && !animal.legendary) {
      const fatRecipes = ingredientRecipeMap['animal fat'] || [];
      for (const recipe of fatRecipes) {
        if (!seen.has(recipe.name)) {
          seen.add(recipe.name);
          unlocks.push({
            name: recipe.name,
            category: recipe.category,
            craftedAt: recipe.craftedAt,
            qty: recipe.qty
          });
        }
      }
    }

    // Flying birds provide Flight Feathers for arrow crafting
    if (this.isFlyingBird(animal.name) && !animal.legendary) {
      const featherRecipes = ingredientRecipeMap['flight feather'] || [];
      for (const recipe of featherRecipes) {
        if (!seen.has(recipe.name)) {
          seen.add(recipe.name);
          unlocks.push({
            name: recipe.name,
            category: recipe.category,
            craftedAt: recipe.craftedAt,
            qty: recipe.qty
          });
        }
      }
    }

    return unlocks;
  },

  /**
   * Enrich animals data with computed usedBy and unlocks
   * Call this once after loading both animals and crafting data
   */
  enrichAnimalsData(animals, recipes) {
    const ingredientLocationMap = this.buildIngredientLocationMap(recipes);
    const ingredientRecipeMap = this.buildIngredientRecipeMap(recipes);

    return animals.map(animal => ({
      ...animal,
      usedBy: this.getUsedBy(animal, ingredientLocationMap),
      unlocks: this.getUnlocks(animal, ingredientRecipeMap)
    }));
  }
};

// Export for use in browser
if (typeof window !== 'undefined') {
  window.DataUtils = DataUtils;
}

// Export for Node.js (for testing/scripts)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataUtils;
}
