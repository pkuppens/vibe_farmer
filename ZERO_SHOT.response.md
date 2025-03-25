Okay, let's build this 2.5D farming simulator using pure Three.js, focusing on clean code principles.

**Project Structure:**

We'll create a few files to keep things organized:

1.  `index.html`: The main HTML file to host the canvas and UI elements.
2.  `style.css`: Basic styling for the UI.
3.  `main.js`: The entry point, sets up the main components.
4.  `config.js`: Stores game constants and configuration (seeds, upgrades, etc.).
5.  `gameState.js`: Manages the core game data (grid, inventory, day, etc.).
6.  `sceneManager.js`: Handles Three.js scene setup, rendering, and object creation/updates.
7.  `uiManager.js`: Manages interaction with the HTML UI elements.
8.  `gameLogic.js`: Contains the rules and actions of the game (clicking, day/night cycle, growth).
9.  `interactionManager.js`: Handles user input (mouse clicks) and raycasting.

**1. `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>2.5D Farming Sim</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="game-container">
        <canvas id="game-canvas"></canvas>
        <div id="ui-overlay">
            <div id="info-panel">
                <h2>Day: <span id="day-counter">1</span></h2>
                <h3>Actions Left: <span id="actions-left">10</span></h3>
            </div>
            <div id="inventory-panel">
                <h4>Inventory</h4>
                <div>Coins: <span id="coins-count">0</span></div>
                <div>Wood: <span id="wood-count">0</span></div>
                <div>Stone: <span id="stone-count">0</span></div>
                <div id="seeds-inventory">
                    <!-- Seed counts will be added here by JS -->
                </div>
            </div>
             <div id="selected-seed-panel">
                Selected Seed: <span id="selected-seed-name">None</span>
                <button id="deselect-seed-button">Deselect</button>
            </div>
            <div id="message-log">
                <p id="message-text">Welcome! Click on the grid to interact.</p>
            </div>
            <div id="upgrades-panel">
                <h4>Upgrades</h4>
                <div id="upgrades-list">
                     <!-- Upgrades will be added here by JS -->
                </div>
            </div>
        </div>
    </div>

    <!-- Import Three.js -->
    <script type="importmap">
        {
            "imports": {
                "three": "https://unpkg.com/three@0.157.0/build/three.module.js"
            }
        }
    </script>

    <!-- Import Game Modules -->
    <script type="module" src="main.js"></script>
</body>
</html>
```

**2. `style.css`**

```css
body {
    margin: 0;
    overflow: hidden; /* Prevent scrollbars */
    font-family: sans-serif;
    background-color: #333;
    color: #eee;
}

#game-container {
    position: relative;
    width: 100vw;
    height: 100vh;
}

#game-canvas {
    display: block;
    width: 100%;
    height: 100%;
}

#ui-overlay {
    position: absolute;
    top: 10px;
    left: 10px;
    right: 10px;
    bottom: 10px;
    display: flex;
    justify-content: space-between;
    pointer-events: none; /* Allow clicks to pass through to canvas */
    color: white;
    text-shadow: 1px 1px 2px black;
}

#ui-overlay > div {
    background-color: rgba(0, 0, 0, 0.6);
    padding: 10px;
    border-radius: 5px;
    margin: 5px;
    pointer-events: auto; /* Enable interaction for UI elements */
    align-self: flex-start; /* Align panels to the top */
    max-height: 90vh; /* Prevent panels from becoming too tall */
    overflow-y: auto; /* Add scroll if content overflows */
}

#info-panel, #inventory-panel, #selected-seed-panel {
    min-width: 150px;
}

#message-log {
    position: absolute;
    bottom: 10px;
    left: 10px;
    right: 10px;
    text-align: center;
    background-color: rgba(0, 0, 0, 0.7);
    padding: 5px;
    border-radius: 3px;
    pointer-events: auto;
}

#upgrades-panel {
    min-width: 200px;
}

#upgrades-list button {
    display: block;
    margin-top: 5px;
    pointer-events: auto; /* Ensure buttons are clickable */
    cursor: pointer;
}

#upgrades-list button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

#seeds-inventory button {
     margin-left: 10px;
     pointer-events: auto;
     cursor: pointer;
}

#selected-seed-panel button {
    margin-left: 10px;
    pointer-events: auto;
    cursor: pointer;
}

h2, h3, h4 {
    margin-top: 0;
    margin-bottom: 8px;
}

#inventory-panel div {
    margin-bottom: 4px;
}
```

**3. `config.js`**

```javascript
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
```

**4. `gameState.js`**

```javascript
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
```

**5. `sceneManager.js`**

```javascript
// sceneManager.js - Handles Three.js setup and rendering

import * as THREE from 'three';
import { CONFIG } from './config.js';

export class SceneManager {
    constructor(gridSize, cellSize) {
        this.gridSize = gridSize;
        this.cellSize = cellSize;
        this.totalSize = gridSize * cellSize + (gridSize - 1) * CONFIG.CELL_SPACING;
        this.halfTotalSize = this.totalSize / 2;

        this.scene = new THREE.Scene();
        this.camera = this.createCamera();
        this.renderer = this.createRenderer();
        this.lights = this.createLights();
        this.scene.add(...this.lights);

        this.cellMeshes = new Map(); // Map cell coordinates (e.g., "x,y") to content meshes
        this.baseGridMeshes = []; // Store base plane meshes for raycasting

        this.setupScene();
    }

    setupScene() {
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background
        this.scene.fog = new THREE.Fog(0x87ceeb, this.totalSize * 0.8, this.totalSize * 2);

        // Optional: Add a ground plane beneath the grid
        const groundGeometry = new THREE.PlaneGeometry(this.totalSize * 1.5, this.totalSize * 1.5);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22, side: THREE.DoubleSide }); // Forest green
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.position.y = -0.1; // Slightly below the grid
        groundMesh.receiveShadow = true;
        this.scene.add(groundMesh);
    }

    createCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        const viewSize = this.totalSize * 0.7; // Adjust this to control zoom
        const camera = new THREE.OrthographicCamera(
            -viewSize * aspect, viewSize * aspect,
            viewSize, -viewSize,
            0.1, this.totalSize * 3 // Increased far plane
        );

        // Position for 2.5D view
        camera.position.set(0, this.totalSize * 0.8, this.totalSize * 0.8);
        camera.lookAt(0, 0, 0); // Look at the center of the grid

        // Optional slight rotation for a better 2.5D feel (adjust as needed)
        // camera.rotation.x = -Math.PI / 6;
        // camera.updateProjectionMatrix(); // Important after changing rotation directly

        return camera;
    }

    createRenderer() {
        const canvas = document.getElementById('game-canvas');
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
        return renderer;
    }

    createLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Softer ambient light

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Brighter directional
        directionalLight.position.set(this.halfTotalSize, this.totalSize, this.halfTotalSize); // Position light source
        directionalLight.castShadow = true;
        // Configure shadow properties for better quality/performance
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = this.totalSize * 3;
        // Adjust shadow camera bounds to tightly fit the scene
        const shadowCamSize = this.totalSize * 0.7;
        directionalLight.shadow.camera.left = -shadowCamSize;
        directionalLight.shadow.camera.right = shadowCamSize;
        directionalLight.shadow.camera.top = shadowCamSize;
        directionalLight.shadow.camera.bottom = -shadowCamSize;


        return [ambientLight, directionalLight];
    }

    // --- Grid and Object Creation ---

    createGridBase(gameState) {
        const baseGeometry = new THREE.PlaneGeometry(this.cellSize, this.cellSize);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: CONFIG.COLORS.GRID,
            side: THREE.DoubleSide, // Render both sides
        });

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cellState = gameState.getCell(x, y);
                const mesh = new THREE.Mesh(baseGeometry, baseMaterial.clone()); // Clone material for color changes

                mesh.position.set(
                    (x * (this.cellSize + CONFIG.CELL_SPACING)) - this.halfTotalSize + this.cellSize / 2,
                    0, // Position grid on the XZ plane
                    (y * (this.cellSize + CONFIG.CELL_SPACING)) - this.halfTotalSize + this.cellSize / 2
                );
                mesh.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
                mesh.castShadow = false; // Base grid doesn't need to cast shadows
                mesh.receiveShadow = true;

                // Store grid coordinates in userData for easy lookup during raycasting
                mesh.userData = { gridX: x, gridY: y, isBaseGrid: true };

                this.scene.add(mesh);
                this.baseGridMeshes.push(mesh);
                cellState.baseMesh = mesh; // Link mesh to state

                // Initialize visual state based on initial game state
                this.updateCellVisuals(cellState);
            }
        }
    }

    // Updates the visual representation of a single cell based on its state
    updateCellVisuals(cellState) {
        const { x, y, type, content, baseMesh } = cellState;
        const coordKey = `${x},${y}`;

        // 1. Remove existing content mesh if any
        const existingMesh = this.cellMeshes.get(coordKey);
        if (existingMesh) {
            this.scene.remove(existingMesh);
            existingMesh.geometry.dispose(); // Clean up geometry
            if (Array.isArray(existingMesh.material)) { // Handle multi-material meshes if needed later
                 existingMesh.material.forEach(m => m.dispose());
            } else {
                 existingMesh.material.dispose(); // Clean up material
            }
            this.cellMeshes.delete(coordKey);
            cellState.mesh = null;
        }

        // 2. Update base mesh color
        let baseColor = CONFIG.COLORS.EMPTY;
        if (type === CONFIG.CELL_TYPES.PLOT) {
            baseColor = CONFIG.COLORS.PLOT;
        }
        baseMesh.material.color.setHex(baseColor);

        // 3. Create new content mesh based on type
        let newMesh = null;
        const meshOffset = 0.1; // How high above the base grid items sit

        switch (type) {
            case CONFIG.CELL_TYPES.WEED:
                newMesh = this.createSimpleMesh(CONFIG.COLORS.WEED, 0.3, baseMesh.position, meshOffset);
                break;
            case CONFIG.CELL_TYPES.WOOD:
                // Simple cylinder for wood
                const woodGeom = new THREE.CylinderGeometry(0.15, 0.2, 0.5, 8);
                const woodMat = new THREE.MeshStandardMaterial({ color: CONFIG.COLORS.WOOD });
                newMesh = new THREE.Mesh(woodGeom, woodMat);
                newMesh.position.copy(baseMesh.position).y += 0.25 + meshOffset; // Adjust Y based on geometry height
                newMesh.castShadow = true;
                newMesh.receiveShadow = true;
                break;
            case CONFIG.CELL_TYPES.STONE:
                 // Simple Icosahedron for stone
                const stoneGeom = new THREE.IcosahedronGeometry(0.25, 0);
                const stoneMat = new THREE.MeshStandardMaterial({ color: CONFIG.COLORS.STONE });
                newMesh = new THREE.Mesh(stoneGeom, stoneMat);
                newMesh.position.copy(baseMesh.position).y += 0.25 + meshOffset;
                newMesh.castShadow = true;
                newMesh.receiveShadow = true;
                break;
            case CONFIG.CELL_TYPES.PLOT:
                if (content && content.seedType) {
                    newMesh = this.createPlantMesh(content, baseMesh.position, meshOffset);
                }
                break;
            case CONFIG.CELL_TYPES.EMPTY:
            default:
                // No content mesh needed
                break;
        }

        if (newMesh) {
            // Store grid coordinates for potential interaction with content mesh itself
            newMesh.userData = { gridX: x, gridY: y, isContent: true };
            this.scene.add(newMesh);
            this.cellMeshes.set(coordKey, newMesh);
            cellState.mesh = newMesh; // Link mesh to state
        }
    }

    // Helper to create simple sphere meshes
    createSimpleMesh(color, size, basePosition, yOffset) {
        const geometry = new THREE.SphereGeometry(size, 8, 6);
        const material = new THREE.MeshStandardMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(basePosition);
        mesh.position.y += size + yOffset; // Position above the base grid
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        return mesh;
    }

     // Helper to create plant meshes based on growth stage
    createPlantMesh(plotContent, basePosition, yOffset) {
        const { seedType, growthStage, maxGrowth } = plotContent;
        const seedConfig = CONFIG.SEEDS[seedType];
        if (!seedConfig) return null;

        const growthFactor = growthStage / maxGrowth;
        const isGrown = growthStage >= maxGrowth;

        // Simple representation: growing sphere/cone
        const plantHeight = isGrown ? 0.6 : 0.1 + growthFactor * 0.5;
        const plantRadius = isGrown ? 0.3 : 0.05 + growthFactor * 0.25;

        // Use a cone for visual variety
        const geometry = new THREE.ConeGeometry(plantRadius, plantHeight, 8);
        const material = new THREE.MeshStandardMaterial({ color: seedConfig.color });
        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.copy(basePosition);
        mesh.position.y += plantHeight / 2 + yOffset; // Position base of cone slightly above ground
        mesh.castShadow = true;
        mesh.receiveShadow = false;

        // Maybe add a highlight or different shape when fully grown?
        if (isGrown) {
            // Example: Make it pulse slightly or add an outline? (More complex)
            // For now, just ensure it's at max size/height.
             mesh.material.emissive.setHex(seedConfig.color); // Make it glow slightly when ready
             mesh.material.emissiveIntensity = 0.3;
        }


        return mesh;
    }


    // --- Rendering and Updates ---

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    // Handle window resize
    onWindowResize() {
        const aspect = window.innerWidth / window.innerHeight;
        const viewSize = this.totalSize * 0.7; // Keep consistent with camera creation

        this.camera.left = -viewSize * aspect;
        this.camera.right = viewSize * aspect;
        this.camera.top = viewSize;
        this.camera.bottom = -viewSize;

        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
```

**6. `uiManager.js`**

```javascript
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
```

**7. `gameLogic.js`**

```javascript
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
        if (!cell) return; // Should not happen if click is valid

        let actionTaken = false;
        let message = "";

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
                break;
            case CONFIG.CELL_TYPES.EMPTY:
                actionTaken = this.handleEmptyClick(cell);
                message = actionTaken ? `Planted ${CONFIG.SEEDS[this.gameState.selectedSeed]?.name}!` : (this.gameState.selectedSeed ? "No seeds selected or cell occupied." : "Select a seed from the inventory to plant.");
                break;
            case CONFIG.CELL_TYPES.PLOT:
                actionTaken = this.handlePlotClick(cell);
                 if (actionTaken) {
                     const harvestedSeed = cell.content?.seedType; // Get type before clearing
                     const yieldAmount = cell.content?.yieldAmount || 0; // Get yield stored during harvest
                     message = `Harvested ${CONFIG.SEEDS[harvestedSeed]?.name}! +${yieldAmount} Coins.`;
                 } else {
                     message = "This plot isn't ready for harvest yet.";
                 }
                break;
            default:
                console.warn(`Unhandled cell type clicked: ${cell.type}`);
                message = "Nothing to do here.";
        }

        if (actionTaken) {
            this.gameState.spendAction();
            this.sceneManager.updateCellVisuals(cell); // Update visuals AFTER state change
            this.uiManager.updateAll(this.gameState); // Update entire UI
            this.uiManager.displayMessage(message);

            if (this.gameState.actionsLeft <= 0) {
                this.endDay();
            }
        } else {
             this.uiManager.displayMessage(message, 4000); // Display failure/info message longer
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
        if (this.gameState.isPlotFullyGrown(cell.x, cell.y)) {
            // Harvest
            const plotContent = cell.content;
            const growTime = plotContent.maxGrowth; // Use the actual time it took
            const yieldAmount = calculateYield(plotContent.seedType, growTime, this.gameState);

            this.gameState.addResource(CONFIG.RESOURCES.COIN, yieldAmount);

             // Store yield temporarily for the message log, before clearing content
            cell.content.yieldAmount = yieldAmount;

            // Reset the cell to empty after harvest
            this.gameState.setCellType(cell.x, cell.y, CONFIG.CELL_TYPES.EMPTY);
            // Content is cleared automatically by setCellType

            return true; // Harvest successful
        }
        return false; // Not ready for harvest
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

        for (let y = 0; y < this.gameState.gridSize; y++) {
            for (let x = 0; x < this.gameState.gridSize; x++) {
                const cell = this.gameState.getCell(x, y);
                let visualUpdateNeeded = false;

                // 1. Grow plots
                if (cell.type === CONFIG.CELL_TYPES.PLOT && cell.content) {
                    if (this.gameState.incrementPlotGrowth(x, y)) {
                         visualUpdateNeeded = true; // Growth happened
                    }
                }
                // 2. Spawn trash on empty cells
                else if (cell.type === CONFIG.CELL_TYPES.EMPTY) {
                    if (Math.random() < trashSpawnChance) {
                        const trashTypeRand = Math.random();
                        let newTrashType;
                        if (trashTypeRand < 0.4) newTrashType = CONFIG.CELL_TYPES.WEED;
                        else if (trashTypeRand < 0.7) newTrashType = CONFIG.CELL_TYPES.WOOD;
                        else newTrashType = CONFIG.CELL_TYPES.STONE;

                        this.gameState.setCellType(x, y, newTrashType);
                        visualUpdateNeeded = true;
                    }
                }

                // Update visuals if state changed
                if (visualUpdateNeeded) {
                    this.sceneManager.updateCellVisuals(cell);
                }
            }
        }
         // Special case: Ensure fully grown plants glow after night processing
         this.updateGrownPlantVisuals();
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
```

**8. `interactionManager.js`**

```javascript
// interactionManager.js - Handles user input and raycasting

import * as THREE from 'three';

export class InteractionManager {
    constructor(camera, domElement, gameLogic) {
        this.camera = camera;
        this.domElement = domElement;
        this.gameLogic = gameLogic; // Reference to game logic for handling actions

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.boundOnClick = this.onClick.bind(this); // Bind context once
    }

    setupRaycasting(scene) {
        this.scene = scene; // Need scene reference to know what objects to intersect
        this.domElement.addEventListener('click', this.boundOnClick);
    }

    onClick(event) {
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        this.mouse.x = (event.clientX / this.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / this.domElement.clientHeight) * 2 + 1;

        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Calculate objects intersecting the picking ray
        // Intersect only the base grid meshes for simplicity and performance
        const intersects = this.raycaster.intersectObjects(this.scene.children, true); // Check children recursively

        // Find the first intersected object that is part of our grid base
        const intersectedGridCell = intersects.find(intersect => intersect.object.userData.isBaseGrid);

        if (intersectedGridCell) {
            const { gridX, gridY } = intersectedGridCell.object.userData;
            // console.log(`Clicked on grid cell: X=${gridX}, Y=${gridY}`); // Debug log

            // Call the game logic handler
            this.gameLogic.handleCellClick(gridX, gridY);
        } else {
            // Optional: Handle clicks outside the grid if needed
            // console.log("Clicked outside grid");
        }
    }

    dispose() {
        // Clean up event listeners
        this.domElement.removeEventListener('click', this.boundOnClick);
    }
}
```

**9. `main.js`** (Entry Point)

```javascript
// main.js - Entry point for the game

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { GameState } from './gameState.js';
import { SceneManager } from './sceneManager.js';
import { UIManager } from './uiManager.js';
import { GameLogic } from './gameLogic.js';
import { InteractionManager } from './interactionManager.js';

class GameApp {
    constructor() {
        this.gameState = new GameState(CONFIG.GRID_SIZE);
        this.sceneManager = new SceneManager(CONFIG.GRID_SIZE, CONFIG.CELL_SIZE);
        this.uiManager = new UIManager();
        this.gameLogic = new GameLogic(this.gameState, this.sceneManager, this.uiManager);
        this.interactionManager = new InteractionManager(
            this.sceneManager.camera,
            this.sceneManager.renderer.domElement,
            this.gameLogic // Pass gameLogic instance here
        );

        // Make instances accessible globally for easier debugging/UI interaction if needed
        // In a larger app, consider dependency injection or event bus instead.
        window.gameApp = this;
    }

    init() {
        console.log("Initializing Game...");
        this.gameLogic.initializeGame(); // Creates grid visuals via sceneManager
        this.interactionManager.setupRaycasting(this.sceneManager.scene); // Pass scene for raycasting targets
        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.animate();
        console.log("Game Initialized.");
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        // Add any continuous animations or updates here if needed
        // e.g., subtle plant sway, particle effects
        this.sceneManager.render();
    }

    onWindowResize() {
        this.sceneManager.onWindowResize();
    }
}

// --- Start the game ---
const app = new GameApp();
app.init();
```

**To Run This:**

1.  Save each code block into its respective file (`index.html`, `style.css`, `main.js`, `config.js`, etc.).
2.  You need a simple local web server to serve these files because browsers restrict loading modules (`type="module"`) directly from the filesystem (`file:///`).
    *   If you have Node.js installed, navigate to the project directory in your terminal and run `npx serve`.
    *   Alternatively, use Python's built-in server: `python -m http.server` (Python 3) or `python -m SimpleHTTPServer` (Python 2).
    *   Or use a VS Code extension like "Live Server".
3.  Open your browser and navigate to the local server address (e.g., `http://localhost:8080` or `http://localhost:3000`).

This setup provides a solid foundation following clean code principles. You can now easily extend it by:

*   Adding more seed types in `config.js`.
*   Adding more complex trash or resources.
*   Implementing more upgrades in `config.js` and `gameLogic.js`.
*   Improving the visuals in `sceneManager.js` (e.g., using textured models instead of simple shapes).
*   Adding sound effects.
*   Implementing saving/loading using `localStorage`.
