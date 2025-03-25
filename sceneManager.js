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
                case CONFIG.CELL_TYPES.COIN_SPAWN: // Handle coin spawn visual
                const coinGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16); // Flat cylinder
                const coinMat = new THREE.MeshStandardMaterial({ color: CONFIG.COLORS.COIN_SPAWN, metalness: 0.5, roughness: 0.3 });
                newMesh = new THREE.Mesh(coinGeom, coinMat);
                newMesh.position.copy(baseMesh.position).y += 0.025 + meshOffset; // Sit flat on ground
                newMesh.rotation.x = Math.PI / 2; // Lay flat
                newMesh.castShadow = true;
                newMesh.receiveShadow = false;
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

        // Clamp visual growth stage to maxGrowth for scaling purposes
        const visualGrowthStage = Math.min(growthStage, maxGrowth);
        const growthFactor = visualGrowthStage / maxGrowth;
        const isReady = growthStage >= maxGrowth; // Check if ready/overdue

        const plantHeight = 0.1 + growthFactor * 0.5; // Max height based on maxGrowth
        const plantRadius = 0.05 + growthFactor * 0.25; // Max radius based on maxGrowth

        const geometry = new THREE.ConeGeometry(plantRadius, plantHeight, 8);
        const material = new THREE.MeshStandardMaterial({ color: seedConfig.color });
        const mesh = new THREE.Mesh(geometry, material);

        mesh.position.copy(basePosition);
        mesh.position.y += plantHeight / 2 + yOffset;
        mesh.castShadow = true;
        mesh.receiveShadow = false;

        // Add glow if ready or overdue
        if (isReady) {
             mesh.material.emissive.setHex(seedConfig.color);
             mesh.material.emissiveIntensity = 0.4; // Slightly brighter glow
        } else {
             mesh.material.emissive.setHex(0x000000); // Ensure no glow if not ready
             mesh.material.emissiveIntensity = 0;
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
