// interactionManager.js - Handles user input and raycasting

import * as THREE from 'three';

export class InteractionManager {
    constructor(camera, domElement, gameLogic, uiManager, gameState) {
        this.camera = camera;
        this.domElement = domElement;
        this.gameLogic = gameLogic; // Reference to game logic for handling actions
        this.uiManager = uiManager; // Store uiManager reference
        this.gameState = gameState; // Store gameState reference

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.boundOnClick = this.onClick.bind(this); // Bind context once
        this.boundOnMouseMove = this.onMouseMove.bind(this); // Bind mouse move
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

    onMouseMove(event) {
        this.mouse.x = (event.clientX / this.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / this.domElement.clientHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        const intersectedGridCell = intersects.find(intersect => intersect.object.userData.isBaseGrid);

        if (intersectedGridCell) {
            const { gridX, gridY } = intersectedGridCell.object.userData;
            // Pass event for positioning, and gameState for getting cell info
            this.uiManager.handleHover(gridX, gridY, event, this.gameState);
        } else {
            // Mouse is not over any grid cell
            this.uiManager.handleHoverEnd();
        }
    }

    dispose() {
        this.domElement.removeEventListener('click', this.boundOnClick);
        this.domElement.removeEventListener('mousemove', this.boundOnMouseMove); // Remove mouse move listener
        this.domElement.removeEventListener('mouseleave', this.uiManager.handleHoverEnd); // Might need bound version if not arrow func
        this.uiManager.clearHoverTimeout(); // Ensure timer is cleared on dispose
    }
}
