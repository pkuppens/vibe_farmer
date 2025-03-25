// config.js - Game Constants and Settings

export const CONFIG = {
    // Grid dimensions
    GRID_SIZE: 10,
    CELL_SIZE: 1.0, // Size of each cell in 3D space
    CELL_SPACING: 0.05, // Gap between cells

    // Gameplay
    ACTIONS_PER_DAY: 10,
    TRASH_SPAWN_CHANCE: 0.25, // Chance for empty cell to become trash overnight
    INITIAL_TRASH_DENSITY: 0.4, // Percentage of grid filled with trash initially

    // Cell Types
    CELL_TYPES: {
        EMPTY: 'empty',
        WEED: 'weed',
        WOOD: 'wood',
        STONE: 'stone',
        PLOT: 'plot',
    },

    // Resources
    RESOURCES: {
        WOOD: 'wood',
        STONE: 'stone',
        COIN: 'coins',
    },

    // Seeds - Define different seed types here
    SEEDS: {
        WHEAT: {
            name: 'Wheat',
            growTime: 3, // Days to grow
            yieldMultiplier: 1, // Coins per grow day
            color: 0xffff00, // Yellowish
        },
        PUMPKIN: {
            name: 'Pumpkin',
            growTime: 5,
            yieldMultiplier: 1.2,
            color: 0xffa500, // Orange
        },
        BERRY: {
            name: 'Magic Berry',
            growTime: 7,
            yieldMultiplier: 1.5,
            color: 0x8a2be2, // BlueViolet
        },
    },

    // Upgrades - Define upgrades here
    UPGRADES: {
        BEEHIVE: {
            id: 'BEEHIVE',
            name: 'Beehive',
            description: 'Reduces grow time by 1 day (min 2).',
            cost: { coins: 8, wood: 5 },
            effect: (gameState) => {
                // Modify grow times in the config or apply a global modifier
                // For simplicity, let's add a flag to gameState
                gameState.upgrades.beehive = true;
                console.log("Beehive purchased! Grow times reduced.");
                // Note: Actual grow time reduction logic will be in gameLogic.js
            },
            isPurchased: (gameState) => gameState.upgrades.beehive,
        },
        FERTILIZER_BAG: {
            id: 'FERTILIZER_BAG',
            name: 'Fertilizer Bag',
            description: 'Increases harvest yield by 20%.',
            cost: { coins: 15, stone: 3 },
             effect: (gameState) => {
                gameState.upgrades.fertilizer = true;
                console.log("Fertilizer purchased! Yields increased.");
            },
            isPurchased: (gameState) => gameState.upgrades.fertilizer,
        },
         SCARECROW: {
            id: 'SCARECROW',
            name: 'Scarecrow',
            description: 'Reduces chance of trash spawning on empty tiles by half.',
            cost: { coins: 10, wood: 8 },
             effect: (gameState) => {
                gameState.upgrades.scarecrow = true;
                console.log("Scarecrow purchased! Trash spawn chance reduced.");
            },
            isPurchased: (gameState) => gameState.upgrades.scarecrow,
        }
        // Add more upgrades: Better Axe, Pickaxe, Auto-Harvester?
    },

    // Visuals
    COLORS: {
        GRID: 0x8b4513, // Brownish
        EMPTY: 0x9b7653, // Lighter brown
        WEED: 0x00ff00, // Green
        WOOD: 0xa0522d, // Sienna
        STONE: 0x808080, // Grey
        PLOT: 0x654321, // Darker brown (tilled earth)
        HIGHLIGHT: 0xffffff, // White for selection/hover
    },

    GROWTH_STAGES_VISUAL_SCALE: [0.1, 0.3, 0.6, 1.0], // Relative scale for plant growth visuals
};

// Helper function to get a random seed type name
export function getRandomSeedType() {
    const seedKeys = Object.keys(CONFIG.SEEDS);
    return seedKeys[Math.floor(Math.random() * seedKeys.length)];
}

// Helper to calculate effective grow time considering upgrades
export function getEffectiveGrowTime(seedType, gameState) {
    let baseTime = CONFIG.SEEDS[seedType]?.growTime || 3;
    if (gameState.upgrades.beehive) {
        baseTime = Math.max(2, baseTime - 1); // Apply beehive bonus, minimum 2 days
    }
    return baseTime;
}

// Helper to calculate yield considering upgrades
export function calculateYield(seedType, growTime, gameState) {
     const seedConfig = CONFIG.SEEDS[seedType];
     if (!seedConfig) return 0;

     let baseYield = growTime * seedConfig.yieldMultiplier;
     if (gameState.upgrades.fertilizer) {
         baseYield *= 1.20; // Apply fertilizer bonus
     }
     return Math.floor(baseYield); // Return whole coins
}

// Helper to calculate trash spawn chance considering upgrades
export function getTrashSpawnChance(gameState) {
    let chance = CONFIG.TRASH_SPAWN_CHANCE;
    if (gameState.upgrades.scarecrow) {
        chance /= 2; // Apply scarecrow bonus
    }
    return chance;
}
