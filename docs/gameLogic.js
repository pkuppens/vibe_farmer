// gameLogic.js - Contains the core game rules and actions

import { CONFIG, getRandomSeedType, getEffectiveGrowTime, calculateYield, getTrashSpawnChance } from './config.js';

export class GameLogic {
    constructor(gameState, sceneManager, uiManager) {
        this.gameState = gameState;
        this.sceneManager = sceneManager;
        this.uiManager = uiManager;
    }

    initializeGame() {
        // Create the visual grid based on the initial game state
        this.sceneManager.createGridBase(this.gameState);
        this.uiManager.initialize(this.gameState, this); // Pass gameLogic ref to UI
        this.uiManager.displayMessage("Farm away! Click tiles to interact.", 5000);
    }

    // Main interaction handler called by InteractionManager
    handleCellClick(x, y) {
        if (this.gameState.actionsLeft <= 0) {
            this.uiManager.displayMessage("No actions left today. Wait for tomorrow!");
            return;
        }

        const cell = this.gameState.getCell(x, y);
        if (!cell) return;

        let actionTaken = false;
        let message = "";
        let updateVisuals = true; // Assume visuals need update unless specified otherwise

        switch (cell.type) {
            case CONFIG.CELL_TYPES.WEED:
                actionTaken = this.handleWeedClick(cell);
                message = actionTaken ? "Cleared weeds, found a seed!" : "Failed to clear weed?";
                break;
            case CONFIG.CELL_TYPES.WOOD:
                actionTaken = this.handleWoodClick(cell);
                message = actionTaken ? "+1 Wood collected." : "Failed to collect wood?";
                break;
            case CONFIG.CELL_TYPES.STONE:
                actionTaken = this.handleStoneClick(cell);
                message = actionTaken ? "+1 Stone collected." : "Failed to collect stone?";
                break;            // ... (cases for WEED, WOOD, STONE) ...
            case CONFIG.CELL_TYPES.EMPTY:
                // Store selected seed *before* potential state change
                const seedToPlant = this.gameState.selectedSeed;
                actionTaken = this.handleEmptyClick(cell);
                 // Modify message based on actual outcome
                if (actionTaken) {
                     message = `Planted ${CONFIG.SEEDS[seedToPlant]?.name}!`;
                } else if (seedToPlant) {
                     message = `Not enough ${CONFIG.SEEDS[seedToPlant]?.name} seeds.`;
                } else {
                     message = "Select a seed from the inventory to plant.";
                     updateVisuals = false; // No visual change if no seed selected
                }
                break;

            case CONFIG.CELL_TYPES.PLOT:
                // Store plot content *before* potential harvest resets it
                const plotContentBeforeHarvest = cell.content ? { ...cell.content } : null;
                actionTaken = this.handlePlotClick(cell);
                 if (actionTaken && plotContentBeforeHarvest) {
                     // Calculate yield based on state *before* harvest
                     const yieldAmount = calculateYield(
                         plotContentBeforeHarvest.seedType,
                         plotContentBeforeHarvest.growthStage,
                         plotContentBeforeHarvest.maxGrowth,
                         this.gameState
                     );
                     // Use stored info for message
                     message = `Harvested ${CONFIG.SEEDS[plotContentBeforeHarvest.seedType]?.name}! +${yieldAmount} Coins.`;
                 } else {
                     message = "This plot isn't ready for harvest yet.";
                     updateVisuals = false; // No visual change if not harvested
                 }
                break;

            case CONFIG.CELL_TYPES.COIN_SPAWN: // Handle clicking spawned coin
                 actionTaken = this.handleCoinSpawnClick(cell);
                 message = actionTaken ? "+1 Coin collected!" : "Failed to collect coin?";
                 break;

            default:
                console.warn(`Unhandled cell type clicked: ${cell.type}`);
                message = "Nothing to do here.";
                updateVisuals = false;
        }

        if (actionTaken) {
            this.gameState.spendAction();
            if (updateVisuals) {
                this.sceneManager.updateCellVisuals(cell); // Update visuals AFTER state change
            }
            this.uiManager.updateAll(this.gameState); // Update entire UI
            this.uiManager.displayMessage(message);

            if (this.gameState.actionsLeft <= 0) {
                // Automatically end day if out of actions
                // Ensure tooltip is hidden before night processing starts
                this.uiManager.handleHoverEnd();
                this.endDay();
            }
        } else if (message) {
             this.uiManager.displayMessage(message, 4000); // Display failure/info message
        }
    }


    // --- Specific Click Handlers ---

    handleWeedClick(cell) {
        const seedType = getRandomSeedType();
        this.gameState.addSeed(seedType, 1);
        this.gameState.setCellType(cell.x, cell.y, CONFIG.CELL_TYPES.EMPTY);
        // Visual update happens in handleCellClick
        return true; // Action was successful
    }

    handleWoodClick(cell) {
        this.gameState.addResource(CONFIG.RESOURCES.WOOD, 1);
        this.gameState.setCellType(cell.x, cell.y, CONFIG.CELL_TYPES.EMPTY);
        return true;
    }

    handleStoneClick(cell) {
        this.gameState.addResource(CONFIG.RESOURCES.STONE, 1);
        this.gameState.setCellType(cell.x, cell.y, CONFIG.CELL_TYPES.EMPTY);
        return true;
    }

    handleEmptyClick(cell) {
        const selectedSeed = this.gameState.selectedSeed;
        if (selectedSeed && this.gameState.inventory.seeds[selectedSeed] > 0) {
            if (this.gameState.removeSeed(selectedSeed, 1)) {
                this.gameState.setCellType(cell.x, cell.y, CONFIG.CELL_TYPES.PLOT);
                const growTime = getEffectiveGrowTime(selectedSeed, this.gameState);
                this.gameState.setPlotContent(cell.x, cell.y, selectedSeed, growTime);
                // If player runs out of the selected seed, deselect it
                if (!this.gameState.inventory.seeds[selectedSeed]) {
                     this.gameState.deselectSeed();
                }
                return true;
            }
        }
        return false; // No seed selected or no seeds left
    }

    handlePlotClick(cell) {
        // Use the renamed check function
        if (this.gameState.isPlotReadyToHarvest(cell.x, cell.y)) {
            const plotContent = cell.content; // Content is still valid here
            const yieldAmount = calculateYield(
                plotContent.seedType,
                plotContent.growthStage,
                plotContent.maxGrowth,
                this.gameState
            );

            this.gameState.addResource(CONFIG.RESOURCES.COIN, yieldAmount);

            // Reset the cell to empty *after* calculations
            this.gameState.setCellType(cell.x, cell.y, CONFIG.CELL_TYPES.EMPTY);

            return true; // Harvest successful
        }
        return false; // Not ready for harvest
    }

    handleCoinSpawnClick(cell) {
        this.gameState.addResource(CONFIG.RESOURCES.COIN, 1);
        this.gameState.setCellType(cell.x, cell.y, CONFIG.CELL_TYPES.EMPTY);
        return true;
    }

     // --- Seed Selection Logic ---
    handleSelectSeed(seedType) {
        if (this.gameState.selectSeed(seedType)) {
            this.uiManager.updateSelectedSeed(this.gameState.selectedSeed);
            this.uiManager.displayMessage(`${CONFIG.SEEDS[seedType].name} selected. Click an empty tile to plant.`, 3000);
        } else {
             this.uiManager.displayMessage(`You don't have any ${CONFIG.SEEDS[seedType].name} seeds!`, 3000);
        }
    }

    handleDeselectSeed() {
        this.gameState.deselectSeed();
        this.uiManager.updateSelectedSeed(null);
        this.uiManager.displayMessage("Seed deselected.", 2000);
    }


    // --- Day/Night Cycle ---

    endDay() {
        this.uiManager.displayMessage("Day ended. Processing night...", 0); // Persistent message
        // Ensure hover state is cleared before night processing
        this.uiManager.handleHoverEnd();

        // Use setTimeout to simulate night processing and allow UI to update
        setTimeout(() => {
            this.processNight();
            this.gameState.nextDay();
            this.uiManager.updateAll(this.gameState);
            this.uiManager.displayMessage(`Day ${this.gameState.day} has begun!`, 3000);
        }, 1000); // 1 second delay for "night"
    }

    processNight() {
        const trashSpawnChance = getTrashSpawnChance(this.gameState);
        const coinSpawnChance = CONFIG.COIN_SPAWN_CHANCE;
        const applyRainbow = this.gameState.upgrades.rainbowBlessing;

        for (let y = 0; y < this.gameState.gridSize; y++) {
            for (let x = 0; x < this.gameState.gridSize; x++) {
                const cell = this.gameState.getCell(x, y);
                let visualUpdateNeeded = false;

                // 1. Grow plots (or increase overdue days)
                if (cell.type === CONFIG.CELL_TYPES.PLOT && cell.content) {
                    if (this.gameState.incrementPlotGrowth(x, y)) {
                         visualUpdateNeeded = true;
                    }
                }
                // 2. Handle Empty Cells (Trash or Coin Spawn)
                else if (cell.type === CONFIG.CELL_TYPES.EMPTY) {
                    let spawnedSomething = false;
                    // Check for coin spawn first if upgrade active
                    if (applyRainbow && Math.random() < coinSpawnChance) {
                        this.gameState.setCellType(x, y, CONFIG.CELL_TYPES.COIN_SPAWN);
                        visualUpdateNeeded = true;
                        spawnedSomething = true;
                    }
                    // If no coin spawned, check for trash spawn
                    if (!spawnedSomething && Math.random() < trashSpawnChance) {
                        const trashTypeRand = Math.random();
                        let newTrashType;
                        if (trashTypeRand < 0.4) newTrashType = CONFIG.CELL_TYPES.WEED;
                        else if (trashTypeRand < 0.7) newTrashType = CONFIG.CELL_TYPES.WOOD;
                        else newTrashType = CONFIG.CELL_TYPES.STONE;

                        this.gameState.setCellType(x, y, newTrashType);
                        visualUpdateNeeded = true;
                    }
                }

                // Update visuals immediately if state changed
                // (updateGrownPlantVisuals is implicitly handled by calling updateCellVisuals on growth)
                if (visualUpdateNeeded) {
                    this.sceneManager.updateCellVisuals(cell);
                }
            }
        }
    }

    // Explicitly update visuals for plants that just became fully grown
    updateGrownPlantVisuals() {
         for (let y = 0; y < this.gameState.gridSize; y++) {
            for (let x = 0; x < this.gameState.gridSize; x++) {
                 const cell = this.gameState.getCell(x, y);
                 if (this.gameState.isPlotFullyGrown(x, y)) {
                     // Re-run update visuals which includes the glow effect check
                     this.sceneManager.updateCellVisuals(cell);
                 }
            }
         }
    }


    // --- Upgrades ---
    handleBuyUpgrade(upgradeId) {
        const upgrade = CONFIG.UPGRADES[upgradeId];
        if (!upgrade) {
            this.uiManager.displayMessage("Unknown upgrade selected.", 3000);
            return;
        }

        if (upgrade.isPurchased(this.gameState)) {
             this.uiManager.displayMessage("Upgrade already purchased.", 3000);
             return;
        }

        if (this.gameState.spendCost(upgrade.cost)) {
            upgrade.effect(this.gameState); // Apply the upgrade effect
            this.uiManager.displayMessage(`Purchased ${upgrade.name}!`, 4000);
            this.uiManager.updateAll(this.gameState); // Update UI (inventory, button states)
        } else {
            this.uiManager.displayMessage("Not enough resources to buy this upgrade.", 3000);
        }
    }
}
