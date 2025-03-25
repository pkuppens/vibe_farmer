// gameState.js - Manages the core game data

import { CONFIG } from './config.js';

export class GameState {
    constructor(gridSize) {
        this.gridSize = gridSize;
        this.grid = this.initializeGrid(); // 2D array of cell states
        this.inventory = {
            coins: 10, // Start with some coins
            wood: 0,
            stone: 0,
            seeds: {}, // { SEED_TYPE: count }
        };
        this.day = 1;
        this.actionsLeft = CONFIG.ACTIONS_PER_DAY;
        this.selectedSeed = null; // Stores the type ('WHEAT', 'PUMPKIN') of seed selected for planting
        this.upgrades = { // Track purchased upgrades
            beehive: false,
            fertilizer: false,
            scarecrow: false,
            // Add flags for other upgrades as they are created
        };
    }

    initializeGrid() {
        const grid = [];
        for (let y = 0; y < this.gridSize; y++) {
            const row = [];
            for (let x = 0; x < this.gridSize; x++) {
                row.push(this.createInitialCellState(x, y));
            }
            grid.push(row);
        }
        return grid;
    }

    createInitialCellState(x, y) {
        const rand = Math.random();
        let type = CONFIG.CELL_TYPES.EMPTY;

        if (rand < CONFIG.INITIAL_TRASH_DENSITY) {
            const trashTypeRand = Math.random();
            if (trashTypeRand < 0.4) {
                type = CONFIG.CELL_TYPES.WEED;
            } else if (trashTypeRand < 0.7) {
                type = CONFIG.CELL_TYPES.WOOD;
            } else {
                type = CONFIG.CELL_TYPES.STONE;
            }
        }

        return {
            x,
            y,
            type: type, // 'empty', 'weed', 'wood', 'stone', 'plot'
            content: null, // For plots: { seedType: 'WHEAT', growthStage: 0, maxGrowth: 3 }
            mesh: null, // Reference to the main content mesh (weed, wood, stone, plant)
            baseMesh: null, // Reference to the base grid plane mesh
        };
    }

    getCell(x, y) {
        if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
            return this.grid[y][x];
        }
        return null; // Out of bounds
    }

    setCellType(x, y, type) {
        const cell = this.getCell(x, y);
        if (cell) {
            cell.type = type;
            if (type !== CONFIG.CELL_TYPES.PLOT) {
                cell.content = null; // Clear content if not a plot
            }
        }
    }

    setPlotContent(x, y, seedType, maxGrowth) {
        const cell = this.getCell(x, y);
        if (cell && cell.type === CONFIG.CELL_TYPES.PLOT) {
            cell.content = {
                seedType: seedType,
                growthStage: 0,
                maxGrowth: maxGrowth,
            };
        }
    }

    incrementPlotGrowth(x, y) {
        const cell = this.getCell(x, y);
        if (cell && cell.type === CONFIG.CELL_TYPES.PLOT && cell.content) {
            if (cell.content.growthStage < cell.content.maxGrowth) {
                cell.content.growthStage++;
                return true; // Grew
            }
        }
        return false; // Didn't grow (or not a plot/already grown)
    }

    isPlotFullyGrown(x, y) {
        const cell = this.getCell(x, y);
        return cell
            && cell.type === CONFIG.CELL_TYPES.PLOT
            && cell.content
            && cell.content.growthStage >= cell.content.maxGrowth;
    }

    addResource(resourceType, amount) {
        if (this.inventory.hasOwnProperty(resourceType)) {
            this.inventory[resourceType] += amount;
        } else {
            console.warn(`Tried to add unknown resource: ${resourceType}`);
        }
    }

    removeResource(resourceType, amount) {
         if (this.inventory.hasOwnProperty(resourceType) && this.inventory[resourceType] >= amount) {
            this.inventory[resourceType] -= amount;
            return true;
        }
        return false; // Not enough resource
    }

    addSeed(seedType, amount) {
        if (!CONFIG.SEEDS[seedType]) {
            console.warn(`Tried to add unknown seed type: ${seedType}`);
            return;
        }
        this.inventory.seeds[seedType] = (this.inventory.seeds[seedType] || 0) + amount;
    }

    removeSeed(seedType, amount) {
        if (this.inventory.seeds[seedType] && this.inventory.seeds[seedType] >= amount) {
            this.inventory.seeds[seedType] -= amount;
            if (this.inventory.seeds[seedType] === 0) {
                delete this.inventory.seeds[seedType]; // Clean up if count reaches zero
                if (this.selectedSeed === seedType) {
                    this.selectedSeed = null; // Deselect if we ran out
                }
            }
            return true;
        }
        return false; // Not enough seeds
    }

    selectSeed(seedType) {
        if (this.inventory.seeds[seedType] && this.inventory.seeds[seedType] > 0) {
            this.selectedSeed = seedType;
            return true;
        }
        this.selectedSeed = null; // Deselect if trying to select an unavailable seed
        return false;
    }

    deselectSeed() {
        this.selectedSeed = null;
    }

    spendAction() {
        if (this.actionsLeft > 0) {
            this.actionsLeft--;
            return true;
        }
        return false; // No actions left
    }

    resetActions() {
        this.actionsLeft = CONFIG.ACTIONS_PER_DAY;
    }

    nextDay() {
        this.day++;
        this.resetActions();
    }

    canAfford(cost) {
        for (const resource in cost) {
            if (!this.inventory.hasOwnProperty(resource) || this.inventory[resource] < cost[resource]) {
                return false;
            }
        }
        return true;
    }

    spendCost(cost) {
        if (this.canAfford(cost)) {
            for (const resource in cost) {
                this.inventory[resource] -= cost[resource];
            }
            return true;
        }
        return false;
    }
}
