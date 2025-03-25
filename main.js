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
