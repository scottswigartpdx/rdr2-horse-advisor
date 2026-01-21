/**
 * Data utilities for cross-referencing animals and crafting recipes
 * Computes relationships at runtime to avoid data duplication
 */

const DataUtils = {
  // Exotic birds for Algernon Wasp's stranger mission
  ALGERNON_BIRDS: ['egret', 'heron', 'spoonbill', 'parakeet', 'parrot', 'macaw'],

  // Flying birds that provide Flight Feathers (used for Field crafting arrows)
  FLYING_BIRD_TERMS: [
    'eagle', 'hawk', 'owl', 'crow', 'raven', 'robin', 'cardinal', 'oriole',
    'sparrow', 'songbird', 'woodpecker', 'jay', 'waxwing', 'duck', 'goose',
    'pelican', 'crane', 'cormorant', 'gull', 'loon', 'booby', 'condor',
    'vulture', 'pigeon', 'pheasant', 'quail', 'egret', 'heron', 'spoonbill',
    'parakeet', 'macaw'
  ],

  // Birds that do NOT provide Flight Feathers
  NO_FLIGHT_FEATHER_PATTERNS: ['wild turkey', 'rooster', 'chicken'],

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
      .replace('bull gator', 'alligator')
      .replace(/ ?\(.*\)/, '')
      .trim();
  },

  /**
   * Build a map of ingredient -> crafting locations from recipes
   */
  buildIngredientLocationMap(recipes) {
    const map = {};
    for (const recipe of recipes) {
      if (!recipe.ingredients) continue;
      for (const ing of recipe.ingredients) {
        const item = ing.item.toLowerCase();
        if (!map[item]) map[item] = new Set();
        map[item].add(recipe.craftedAt);
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
        const item = ing.item.toLowerCase();
        if (!map[item]) map[item] = [];
        map[item].push({
          name: recipe.name,
          category: recipe.category,
          craftedAt: recipe.craftedAt,
          qty: ing.qty
        });
      }
    }
    return map;
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
      if (ingredient.includes(baseAnimal) ||
          ingredient.includes(normalized) ||
          (animal.legendary && ingredient.includes('legendary'))) {
        locations.forEach(loc => usedBy.add(loc));
      }
    }

    // Check if exotic bird for Algernon
    if (this.isAlgernonBird(animal.name)) {
      usedBy.add('Algernon');
    }

    // Flying birds provide Flight Feathers -> Field crafting
    if (this.isFlyingBird(animal.name)) {
      usedBy.add('Field');
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
      if (ingredient.includes(baseAnimal) ||
          ingredient.includes(normalized) ||
          (animal.legendary && ingredient.includes('legendary'))) {
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
