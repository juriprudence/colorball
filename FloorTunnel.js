class FloorTunnel {
    constructor(scene, zPosition, colors) {
        this.mesh = new THREE.Group();
        const tunnelLength = 10;
        const tunnelWidth = 5;
        const tunnelHeight = 3;
        const wallThickness = 0.5;

        const wallGeometry = new THREE.BoxGeometry(wallThickness, tunnelHeight, tunnelLength);
        const roofGeometry = new THREE.BoxGeometry(tunnelWidth, wallThickness, tunnelLength);

        const tunnelColorIndex = Math.floor(Math.random() * 4);
        const tunnelMaterial = new THREE.MeshLambertMaterial({
            color: colors[tunnelColorIndex],
            emissive: colors[tunnelColorIndex],
            emissiveIntensity: 0.1
        });

        // Left wall
        const leftWall = new THREE.Mesh(wallGeometry, tunnelMaterial);
        leftWall.position.set(-tunnelWidth / 2 + wallThickness / 2, tunnelHeight / 2 - 0.5, 0);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        this.mesh.add(leftWall);

        // Right wall
        const rightWall = new THREE.Mesh(wallGeometry, tunnelMaterial);
        rightWall.position.set(tunnelWidth / 2 - wallThickness / 2, tunnelHeight / 2 - 0.5, 0);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        this.mesh.add(rightWall);

        // Roof
        const roof = new THREE.Mesh(roofGeometry, tunnelMaterial);
        roof.position.set(0, tunnelHeight - wallThickness / 2 - 0.5, 0);
        roof.castShadow = true;
        roof.receiveShadow = true;
        this.mesh.add(roof);

        this.mesh.position.set(0, 0, zPosition);
        this.mesh.colorIndex = tunnelColorIndex;
        this.mesh.hasPassed = false;

        scene.add(this.mesh);
    }

    get position() {
        return this.mesh.position;
    }

    get colorIndex() {
        return this.mesh.colorIndex;
    }

    get hasPassed() {
        return this.mesh.hasPassed;
    }

    set hasPassed(value) {
        this.mesh.hasPassed = value;
    }
}