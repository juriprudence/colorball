export default class FloorTunnel {
    constructor(scene, zPosition, colors) {
        this.scene = scene;
        this.mesh = new THREE.Group();
        this.colors = colors;
        this.currentColorIndex = Math.floor(Math.random() * 4);
        
        const tunnelLength = 10;
        const tunnelWidth = 5;
        const tunnelHeight = 3;
        const wallThickness = 0.5;

        const wallGeometry = new THREE.BoxGeometry(wallThickness, tunnelHeight, tunnelLength);
        const roofGeometry = new THREE.BoxGeometry(tunnelWidth, wallThickness, tunnelLength);

        // Create material that we can update
        this.tunnelMaterial = new THREE.MeshLambertMaterial({
            color: colors[this.currentColorIndex],
            emissive: colors[this.currentColorIndex],
            emissiveIntensity: 0.1
        });

        // Left wall
        const leftWall = new THREE.Mesh(wallGeometry, this.tunnelMaterial);
        leftWall.position.set(-tunnelWidth / 2 + wallThickness / 2, tunnelHeight / 2 - 0.5, 0);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        this.mesh.add(leftWall);

        // Right wall
        const rightWall = new THREE.Mesh(wallGeometry, this.tunnelMaterial);
        rightWall.position.set(tunnelWidth / 2 - wallThickness / 2, tunnelHeight / 2 - 0.5, 0);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        this.mesh.add(rightWall);

        // Roof
        const roof = new THREE.Mesh(roofGeometry, this.tunnelMaterial);
        roof.position.set(0, tunnelHeight - wallThickness / 2 - 0.5, 0);
        roof.castShadow = true;
        roof.receiveShadow = true;
        this.mesh.add(roof);

        this.mesh.position.set(0, 0, zPosition);
        this.mesh.hasPassed = false;

        scene.add(this.mesh);
    }

    get position() {
        return this.mesh.position;
    }

    get colorIndex() {
        return this.currentColorIndex;
    }

    get hasPassed() {
        return this.mesh.hasPassed;
    }

    set hasPassed(value) {
        this.mesh.hasPassed = value;
    }

    destroy() {
        // Hide the tunnel
        this.mesh.visible = false;

        // Use the game's particle system to create an explosion
        if (this.game && this.game.particleSystem) {
            this.game.particleSystem.createExplosion(this.position, this.tunnelMaterial.color, 30);
        }

        // Remove the tunnel from the scene after a short delay
        setTimeout(() => {
            if (this.scene) {
                this.scene.remove(this.mesh);
            }
        }, 1000);
    }

    // Method to update the tunnel's color
    updateColor() {
        // Change color periodically based on time
        const time = Date.now() * 0.001;
        // Change color every 2.5 seconds (slightly different timing than ground obstacles)
        const newColorIndex = Math.floor(time * 0.4) % 4;
        
        if (newColorIndex !== this.currentColorIndex) {
            this.currentColorIndex = newColorIndex;
            
            // Update the material color
            if (this.tunnelMaterial) {
                this.tunnelMaterial.color.setHex(this.colors[this.currentColorIndex]);
                this.tunnelMaterial.emissive.setHex(this.colors[this.currentColorIndex]);
            }
        }
    }

    // Optional: Method to set a specific color
    setColor(colorIndex) {
        if (colorIndex >= 0 && colorIndex < this.colors.length) {
            this.currentColorIndex = colorIndex;
            if (this.tunnelMaterial) {
                this.tunnelMaterial.color.setHex(this.colors[this.currentColorIndex]);
                this.tunnelMaterial.emissive.setHex(this.colors[this.currentColorIndex]);
            }
        }
    }

    // Method to get the current color name (for debugging)
    getCurrentColorName() {
        const colorNames = ['red', 'green', 'yellow', 'blue'];
        return colorNames[this.currentColorIndex] || 'unknown';
    }
}