// uiManager.js - Manages interaction with HTML UI elements

import { CONFIG, getRandomSeedType } from './config.js'; // Import necessary config

export class UIManager {
    constructor() {
        // Cache DOM elements
        this.dayCounter = document.getElementById('day-counter');
        this.actionsLeft = document.getElementById('actions-left');
        this.coinsCount = document.getElementById('coins-count');
        this.woodCount = document.getElementById('wood-count');
        this.stoneCount = document.getElementById('stone-count');
        this.seedsInventoryDiv = document.getElementById('seeds-inventory');
        this.selectedSeedName = document.getElementById('selected-seed-name');
        this.deselectSeedButton = document.getElementById('deselect-seed-button');
        this.messageText = document.getElementById('message-text');
        this.upgradesListDiv = document.getElementById('upgrades-list');

        this.messageTimeout = null;
    }

    initialize(gameState, gameLogic) {
        this.updateAll(gameState); // Initial UI update

        // Add event listener for deselect button
        this.deselectSeedButton.addEventListener('click', () => {
            gameLogic.handleDeselectSeed();
        });

        // Create upgrade buttons
        this.createUpgradeButtons(gameState, gameLogic);
    }

    updateAll(gameState) {
        this.updateInfoPanel(gameState.day, gameState.actionsLeft);
        this.updateInventory(gameState.inventory);
        this.updateSelectedSeed(gameState.selectedSeed);
        this.updateSeedButtons(gameState); // Update seed selection buttons based on inventory
        this.updateUpgradeButtons(gameState); // Update upgrade button states
    }

    updateInfoPanel(day, actions) {
        this.dayCounter.textContent = day;
        this.actionsLeft.textContent = actions;
    }

    updateInventory(inventory) {
        this.coinsCount.textContent = inventory.coins;
        this.woodCount.textContent = inventory.wood;
        this.stoneCount.textContent = inventory.stone;
        this.updateSeedsInventory(inventory.seeds);
    }

    updateSeedsInventory(seeds) {
        this.seedsInventoryDiv.innerHTML = ''; // Clear previous seeds

        // Add header if there are any seeds
        if (Object.keys(seeds).length > 0 || Object.keys(CONFIG.SEEDS).length > 0) {
             const header = document.createElement('h5');
             header.textContent = 'Seeds:';
             header.style.marginTop = '10px';
             header.style.marginBottom = '5px';
             this.seedsInventoryDiv.appendChild(header);
        }


        // Display all known seed types, even if count is 0
        for (const seedType in CONFIG.SEEDS) {
            const count = seeds[seedType] || 0;
            const seedConfig = CONFIG.SEEDS[seedType];
            const seedDiv = document.createElement('div');
            seedDiv.innerHTML = `${seedConfig.name}: ${count}`;

            // Add a "Select" button for each seed type if available
            if (count > 0) {
                const selectButton = document.createElement('button');
                selectButton.textContent = 'Select';
                selectButton.dataset.seedType = seedType; // Store seed type on the button
                selectButton.onclick = (event) => {
                    // Find gameLogic instance - needs to be passed or accessed globally/via context
                    // Assuming gameLogic is accessible via a global or passed reference
                    window.gameApp.gameLogic.handleSelectSeed(event.target.dataset.seedType);
                };
                seedDiv.appendChild(selectButton);
            }

            this.seedsInventoryDiv.appendChild(seedDiv);
        }
    }

     updateSelectedSeed(selectedSeedType) {
        if (selectedSeedType) {
            const seedConfig = CONFIG.SEEDS[selectedSeedType];
            this.selectedSeedName.textContent = seedConfig ? seedConfig.name : 'Unknown';
            this.deselectSeedButton.style.display = 'inline-block';
        } else {
            this.selectedSeedName.textContent = 'None';
            this.deselectSeedButton.style.display = 'none';
        }
    }

     // Separate function to update seed selection buttons (called by updateAll)
    updateSeedButtons(gameState) {
        const buttons = this.seedsInventoryDiv.querySelectorAll('button[data-seed-type]');
        buttons.forEach(button => {
            const seedType = button.dataset.seedType;
            const hasSeed = gameState.inventory.seeds[seedType] && gameState.inventory.seeds[seedType] > 0;
            // The button might already be removed if count hit 0, so check existence
            if (button.parentElement) {
                 if (!hasSeed) {
                      // If no seeds left, remove the button or disable it
                      button.remove(); // Or button.disabled = true;
                 } else {
                     // Ensure button is enabled if seeds are available (in case it was previously disabled)
                     button.disabled = false;
                 }
            }

        });
         // We might need to re-add buttons if the player gains seeds again
         // Re-rendering the whole seed list in updateSeedsInventory handles this.
    }


    displayMessage(message, duration = 3000) {
        this.messageText.textContent = message;
        clearTimeout(this.messageTimeout); // Clear previous timeout if any
        if (duration > 0) {
            this.messageTimeout = setTimeout(() => {
                if (this.messageText.textContent === message) { // Only clear if it's the same message
                    this.messageText.textContent = '';
                }
            }, duration);
        }
    }

    createUpgradeButtons(gameState, gameLogic) {
        this.upgradesListDiv.innerHTML = ''; // Clear existing
        for (const upgradeId in CONFIG.UPGRADES) {
            const upgrade = CONFIG.UPGRADES[upgradeId];
            const button = document.createElement('button');
            button.id = `upgrade-${upgradeId}`;
            button.dataset.upgradeId = upgradeId;

            const costString = Object.entries(upgrade.cost)
                .map(([resource, amount]) => `${amount} ${resource}`)
                .join(', ');

            button.innerHTML = `${upgrade.name} <small>(${upgrade.description})</small><br/><small>Cost: ${costString}</small>`;

            button.onclick = () => {
                gameLogic.handleBuyUpgrade(upgradeId);
            };

            this.upgradesListDiv.appendChild(button);
        }
        this.updateUpgradeButtons(gameState); // Set initial state
    }

    updateUpgradeButtons(gameState) {
        for (const upgradeId in CONFIG.UPGRADES) {
            const upgrade = CONFIG.UPGRADES[upgradeId];
            const button = document.getElementById(`upgrade-${upgradeId}`);
            if (button) {
                const canAfford = gameState.canAfford(upgrade.cost);
                const isPurchased = upgrade.isPurchased(gameState);

                button.disabled = isPurchased || !canAfford;

                if (isPurchased) {
                    button.innerHTML = `${upgrade.name} <small>(Purchased)</small>`;
                } else {
                     const costString = Object.entries(upgrade.cost)
                        .map(([resource, amount]) => `${amount} ${resource}`)
                        .join(', ');
                     button.innerHTML = `${upgrade.name} <small>(${upgrade.description})</small><br/><small>Cost: ${costString}</small>`;
                     // Optionally add a class if unaffordable
                     button.style.opacity = canAfford ? '1' : '0.6';
                }
            }
        }
    }
}
