const fs = require('fs');
const animals = JSON.parse(fs.readFileSync('../animals.json', 'utf8'));

// Current animal names (lowercase for comparison)
const existing = new Set(animals.animals.filter(a => a.type === 'animal').map(a => a.name.toLowerCase()));

// Missing animals with size, weapon, locations, and legendary status
// Sizes based on RDR2 weapon guide:
// Small = Small Game Arrows (chipmunks, small birds, bats, rats, squirrels)
// Moderate = Varmint Rifle (rabbits, raccoons, muskrats, iguanas, most birds, snakes)
// Medium = Repeater (foxes, coyotes, turkeys, geese)
// Large = Rifle (wolves, deer, boar, cougars, sheep, pronghorn)
// Massive = Rifle (elk, moose, bears, alligators, bison)

const missingAnimals = [
  // Legendary variants we're missing
  { name: "Legendary Bullgator", size: "Massive", weapon: "Rifle", locations: ["Bayou Nwa", "Bluewater Marsh"], legendary: true },

  // Bulls (domestic - Large)
  { name: "Angus Bull", size: "Large", weapon: "Rifle", locations: ["Heartland Overflow", "Emerald Ranch"], legendary: false },
  { name: "Devon Bull", size: "Large", weapon: "Rifle", locations: ["Heartland Overflow", "Emerald Ranch"], legendary: false },
  { name: "Hereford Bull", size: "Large", weapon: "Rifle", locations: ["Heartland Overflow", "Emerald Ranch"], legendary: false },

  // Bucks (Large)
  { name: "White-tailed Buck", size: "Large", weapon: "Rifle", locations: ["West Elizabeth", "New Hanover", "Lemoyne"], legendary: false },

  // Deer (Large)
  { name: "White-tailed Deer", size: "Large", weapon: "Rifle", locations: ["West Elizabeth", "New Hanover", "Lemoyne"], legendary: false },

  // Chickens (Small)
  { name: "Greater Prairie Chicken", size: "Small", weapon: "Small Game Arrow", locations: ["Hennigan's Stead", "New Austin"], legendary: false },
  { name: "Java Chicken", size: "Small", weapon: "Small Game Arrow", locations: ["Farms", "Rhodes"], legendary: false },
  { name: "Leghorn Chicken", size: "Small", weapon: "Small Game Arrow", locations: ["Farms", "Valentine"], legendary: false },

  // Roosters (Small)
  { name: "Dominique Rooster", size: "Small", weapon: "Small Game Arrow", locations: ["Farms", "Valentine"], legendary: false },
  { name: "Java Rooster", size: "Small", weapon: "Small Game Arrow", locations: ["Farms", "Rhodes"], legendary: false },
  { name: "Leghorn Rooster", size: "Small", weapon: "Small Game Arrow", locations: ["Farms", "Valentine"], legendary: false },

  // Condor (Moderate - large bird)
  { name: "California Condor", size: "Moderate", weapon: "Varmint Rifle", locations: ["Gaptooth Ridge", "New Austin"], legendary: false },

  // Cormorants (Moderate)
  { name: "Double-crested Cormorant", size: "Moderate", weapon: "Varmint Rifle", locations: ["Bayou Nwa", "Flat Iron Lake"], legendary: false },
  { name: "Neotropic Cormorant", size: "Moderate", weapon: "Varmint Rifle", locations: ["Bayou Nwa", "San Luis River"], legendary: false },

  // Cow (Large)
  { name: "Florida Cracker Cow", size: "Large", weapon: "Rifle", locations: ["Scarlett Meadows", "Lemoyne"], legendary: false },

  // Cranes (Moderate)
  { name: "Sandhill Crane", size: "Moderate", weapon: "Varmint Rifle", locations: ["Bayou Nwa", "Bluewater Marsh"], legendary: false },

  // Ducks (Moderate)
  { name: "Pekin Duck", size: "Moderate", weapon: "Varmint Rifle", locations: ["Farms", "Flat Iron Lake"], legendary: false },

  // Eagles (Moderate)
  { name: "Golden Eagle", size: "Moderate", weapon: "Varmint Rifle", locations: ["Grizzlies", "Ambarino", "New Austin"], legendary: false },

  // Egrets (Small)
  { name: "Little Egret", size: "Small", weapon: "Small Game Arrow", locations: ["Bayou Nwa", "Bluewater Marsh"], legendary: false },
  { name: "Snowy Egret", size: "Small", weapon: "Small Game Arrow", locations: ["Bayou Nwa", "Bluewater Marsh"], legendary: false },

  // Foxes (Medium)
  { name: "American Gray Fox", size: "Medium", weapon: "Repeater", locations: ["Scarlett Meadows", "Lemoyne"], legendary: false },
  { name: "Silver Fox", size: "Medium", weapon: "Repeater", locations: ["Grizzlies", "Ambarino"], legendary: false },

  // Gulls (Small)
  { name: "Herring Gull", size: "Small", weapon: "Small Game Arrow", locations: ["Van Horn", "Annesburg", "Coastline"], legendary: false },
  { name: "Laughing Gull", size: "Small", weapon: "Small Game Arrow", locations: ["Saint Denis", "Coastline"], legendary: false },
  { name: "Ring-billed Gull", size: "Small", weapon: "Small Game Arrow", locations: ["Flat Iron Lake", "Coastline"], legendary: false },

  // Hawks (Moderate)
  { name: "Ferruginous Hawk", size: "Moderate", weapon: "Varmint Rifle", locations: ["New Austin", "Cholla Springs"], legendary: false },
  { name: "Rough-legged Hawk", size: "Moderate", weapon: "Varmint Rifle", locations: ["Grizzlies", "Ambarino"], legendary: false },

  // Herons (Small - wading birds like egrets)
  { name: "Tricolored Heron", size: "Small", weapon: "Small Game Arrow", locations: ["Bayou Nwa", "Bluewater Marsh"], legendary: false },

  // Iguanas (Moderate)
  { name: "Green Iguana", size: "Moderate", weapon: "Varmint Rifle", locations: ["Guarma"], legendary: false },

  // Lion (Large - rare)
  { name: "Masai Lion", size: "Large", weapon: "Rifle", locations: ["Emerald Ranch (escaped)"], legendary: false },

  // Loons (Moderate)
  { name: "Pacific Loon", size: "Moderate", weapon: "Varmint Rifle", locations: ["O'Creagh's Run", "Grizzlies"], legendary: false },
  { name: "Yellow-billed Loon", size: "Moderate", weapon: "Varmint Rifle", locations: ["O'Creagh's Run", "Grizzlies"], legendary: false },

  // Moose (Massive)
  { name: "Western Moose", size: "Massive", weapon: "Rifle", locations: ["Grizzlies", "Roanoke Ridge", "Ambarino"], legendary: false },

  // Orioles (Small)
  { name: "Hooded Oriole", size: "Small", weapon: "Small Game Arrow", locations: ["Scarlett Meadows", "Lemoyne"], legendary: false },

  // Owls (Moderate)
  { name: "California Horned Owl", size: "Moderate", weapon: "Varmint Rifle", locations: ["New Austin", "Tall Trees"], legendary: false },
  { name: "Coastal Horned Owl", size: "Moderate", weapon: "Varmint Rifle", locations: ["Roanoke Ridge", "Bluewater Marsh"], legendary: false },

  // Oxen (Large)
  { name: "Angus Ox", size: "Large", weapon: "Rifle", locations: ["Emerald Ranch", "Heartland Overflow"], legendary: false },
  { name: "Devon Ox", size: "Large", weapon: "Rifle", locations: ["Emerald Ranch", "Heartland Overflow"], legendary: false },

  // Panthers (Large)
  { name: "Florida Panther", size: "Large", weapon: "Rifle", locations: ["Stillwater Creek", "Lemoyne"], legendary: false },

  // Macaws (Small - exotic birds)
  { name: "Blue-and-yellow Macaw", size: "Small", weapon: "Small Game Arrow", locations: ["Guarma"], legendary: false },
  { name: "Great Green Macaw", size: "Small", weapon: "Small Game Arrow", locations: ["Guarma"], legendary: false },

  // Peccary (Medium)
  { name: "Collared Peccary", size: "Medium", weapon: "Repeater", locations: ["New Austin", "Gaptooth Ridge"], legendary: false },

  // Pelicans (Moderate)
  { name: "American White Pelican", size: "Moderate", weapon: "Varmint Rifle", locations: ["Flat Iron Lake", "San Luis River"], legendary: false },
  { name: "Brown Pelican", size: "Moderate", weapon: "Varmint Rifle", locations: ["Coastline", "Van Horn"], legendary: false },

  // Pheasants (Moderate)
  { name: "Chinese Ring-necked Pheasant", size: "Moderate", weapon: "Varmint Rifle", locations: ["Bluewater Marsh", "Lemoyne"], legendary: false },

  // Pigs (Medium)
  { name: "Big China Pig", size: "Medium", weapon: "Repeater", locations: ["Farms", "Rhodes"], legendary: false },
  { name: "Old Spot Pig", size: "Medium", weapon: "Repeater", locations: ["Farms", "Valentine"], legendary: false },

  // Pigeons (Small)
  { name: "Band-tailed Pigeon", size: "Small", weapon: "Small Game Arrow", locations: ["Tall Trees", "Big Valley"], legendary: false },

  // Pronghorns (Large)
  { name: "American Pronghorn Doe", size: "Large", weapon: "Rifle", locations: ["Heartland Overflow", "New Hanover"], legendary: false },
  { name: "Baja California Pronghorn Buck", size: "Large", weapon: "Rifle", locations: ["Cholla Springs", "New Austin"], legendary: false },
  { name: "Baja California Pronghorn Doe", size: "Large", weapon: "Rifle", locations: ["Cholla Springs", "New Austin"], legendary: false },
  { name: "Sonoran Pronghorn Buck", size: "Large", weapon: "Rifle", locations: ["Gaptooth Ridge", "New Austin"], legendary: false },
  { name: "Sonoran Pronghorn Doe", size: "Large", weapon: "Rifle", locations: ["Gaptooth Ridge", "New Austin"], legendary: false },

  // Raccoon (Moderate)
  { name: "American Raccoon", size: "Moderate", weapon: "Varmint Rifle", locations: ["Lemoyne", "West Elizabeth", "New Hanover"], legendary: false },

  // Rams/Sheep (Large)
  { name: "Desert Bighorn Ram", size: "Large", weapon: "Rifle", locations: ["Gaptooth Ridge", "New Austin"], legendary: false },
  { name: "Rocky Mountain Bighorn Ram", size: "Large", weapon: "Rifle", locations: ["Grizzlies", "Ambarino"], legendary: false },
  { name: "Desert Bighorn Sheep", size: "Large", weapon: "Rifle", locations: ["Gaptooth Ridge", "New Austin"], legendary: false },
  { name: "Rocky Mountain Bighorn Sheep", size: "Large", weapon: "Rifle", locations: ["Grizzlies", "Ambarino"], legendary: false },

  // Rats (Small)
  { name: "Brown Rat", size: "Small", weapon: "Small Game Arrow", locations: ["Saint Denis", "Van Horn", "Annesburg"], legendary: false },

  // Red-footed Booby (Small - seabird)
  { name: "Red-footed Booby", size: "Small", weapon: "Small Game Arrow", locations: ["Guarma"], legendary: false },

  // Snakes (Moderate)
  { name: "Black-tailed Rattlesnake", size: "Moderate", weapon: "Varmint Rifle", locations: ["New Austin", "Gaptooth Ridge"], legendary: false },
  { name: "Cottonmouth Snake", size: "Moderate", weapon: "Varmint Rifle", locations: ["Bayou Nwa", "Bluewater Marsh"], legendary: false },
  { name: "Diamondback Snake", size: "Moderate", weapon: "Varmint Rifle", locations: ["New Austin", "Hennigan's Stead"], legendary: false },
  { name: "Fer-de-Lance Snake", size: "Moderate", weapon: "Varmint Rifle", locations: ["Guarma"], legendary: false },
  { name: "Midland Water Snake", size: "Moderate", weapon: "Varmint Rifle", locations: ["Bayou Nwa", "Bluewater Marsh"], legendary: false },
  { name: "Northern Copperhead", size: "Moderate", weapon: "Varmint Rifle", locations: ["Roanoke Ridge", "Lemoyne"], legendary: false },
  { name: "Northern Water Snake", size: "Moderate", weapon: "Varmint Rifle", locations: ["Roanoke Ridge", "West Elizabeth"], legendary: false },
  { name: "Rainbow Boa", size: "Moderate", weapon: "Varmint Rifle", locations: ["Guarma"], legendary: false },
  { name: "Red Boa", size: "Moderate", weapon: "Varmint Rifle", locations: ["Guarma"], legendary: false },
  { name: "Southern Copperhead", size: "Moderate", weapon: "Varmint Rifle", locations: ["Lemoyne", "Bayou Nwa"], legendary: false },
  { name: "Sunglow Boa", size: "Moderate", weapon: "Varmint Rifle", locations: ["Guarma"], legendary: false },

  // Songbirds (Small)
  { name: "Scarlet Tanager Songbird", size: "Small", weapon: "Small Game Arrow", locations: ["Roanoke Ridge", "Lemoyne"], legendary: false },

  // Sparrows (Small)
  { name: "American Tree Sparrow", size: "Small", weapon: "Small Game Arrow", locations: ["Grizzlies", "Ambarino"], legendary: false },
  { name: "Eurasian Tree Sparrow", size: "Small", weapon: "Small Game Arrow", locations: ["Saint Denis", "Lemoyne"], legendary: false },
  { name: "Golden Crowned Sparrow", size: "Small", weapon: "Small Game Arrow", locations: ["Big Valley", "West Elizabeth"], legendary: false },

  // Spoonbill (Small - wading bird like egrets)
  { name: "Roseate Spoonbill", size: "Small", weapon: "Small Game Arrow", locations: ["Bayou Nwa", "Bluewater Marsh"], legendary: false },

  // Squirrels (Small)
  { name: "Black Squirrel", size: "Small", weapon: "Small Game Arrow", locations: ["Roanoke Ridge", "Lemoyne"], legendary: false },
  { name: "Western Gray Squirrel", size: "Small", weapon: "Small Game Arrow", locations: ["Big Valley", "Tall Trees", "West Elizabeth"], legendary: false },

  // Toads (Small)
  { name: "Sonoran Desert Toad", size: "Small", weapon: "Small Game Arrow", locations: ["New Austin", "Gaptooth Ridge"], legendary: false },

  // Turkeys (Medium)
  { name: "Rio Grande Wild Turkey", size: "Medium", weapon: "Varmint Rifle", locations: ["New Austin", "Hennigan's Stead"], legendary: false },

  // Turtles (Moderate)
  { name: "Alligator Snapping Turtle", size: "Moderate", weapon: "Varmint Rifle", locations: ["Bayou Nwa", "Bluewater Marsh"], legendary: false },
  { name: "Green Sea Turtle", size: "Moderate", weapon: "Varmint Rifle", locations: ["Guarma"], legendary: false },

  // Vultures (Moderate)
  { name: "Eastern Turkey Vulture", size: "Moderate", weapon: "Varmint Rifle", locations: ["Lemoyne", "New Hanover"], legendary: false },
  { name: "Western Turkey Vulture", size: "Moderate", weapon: "Varmint Rifle", locations: ["New Austin", "West Elizabeth"], legendary: false },

  // Waxwing (Small)
  { name: "Cedar Waxwing", size: "Small", weapon: "Small Game Arrow", locations: ["Roanoke Ridge", "Big Valley"], legendary: false },

  // Wolves (Large)
  { name: "Timber Wolf", size: "Large", weapon: "Rifle", locations: ["Grizzlies", "Ambarino", "Tall Trees"], legendary: false },

  // Woodpeckers (Small)
  { name: "Red-bellied Woodpecker", size: "Small", weapon: "Small Game Arrow", locations: ["Lemoyne", "Bayou Nwa"], legendary: false },
];

// Add missing animals
let added = 0;
for (const animal of missingAnimals) {
  if (!existing.has(animal.name.toLowerCase())) {
    animals.animals.push({
      name: animal.name,
      size: animal.size,
      weapon: animal.weapon,
      locations: animal.locations,
      legendary: animal.legendary,
      type: "animal",
      unlocks: [],
      usedBy: []
    });
    added++;
    console.log(`Added: ${animal.name} (${animal.size})`);
  } else {
    console.log(`Skipped (exists): ${animal.name}`);
  }
}

// Sort animals by name
animals.animals.sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync('../animals.json', JSON.stringify(animals, null, 2));

console.log(`\nTotal added: ${added}`);
console.log(`Total animals now: ${animals.animals.filter(a => a.type === 'animal').length}`);
console.log(`Total fish: ${animals.animals.filter(a => a.type === 'fish').length}`);
