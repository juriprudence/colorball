class Wall {
    constructor(scene, zPosition, colors) {
        this.mesh = new THREE.Group();
        const wallWidth = 12; // Increased width
        const wallHeight = 12; // Increased height
        const segmentHeight = wallHeight / 4;

        // Create 4 colored segments (vertical arrangement)
        for (let i = 0; i < 4; i++) {
            const segmentGeometry = new THREE.BoxGeometry(wallWidth, segmentHeight, 0.5);
            const segmentMaterial = new THREE.MeshLambertMaterial({
                color: colors[i],
                emissive: colors[i],
                emissiveIntensity: 0.1
            });
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
            // Position segments vertically (raise wall higher)
            segment.position.y = (i - 1.5) * segmentHeight + 6; // Shifted up by 6 units
            segment.castShadow = true;
            segment.receiveShadow = true;
            segment.originalColorIndex = i;
            this.mesh.add(segment);
        }

        this.mesh.position.z = zPosition;
        this.mesh.position.x = 0; // Centered in the ball's path
        this.mesh.rotationSpeed = 0.01; // Slower rotation speed for color movement (was 0.03)
        this.mesh.hasPassed = false; // Track if player has passed this wall

        scene.add(this.mesh);
    }

    get position() {
        return this.mesh.position;
    }

    get children() {
        return this.mesh.children;
    }

    get hasPassed() {
        return this.mesh.hasPassed;
    }

    set hasPassed(value) {
        this.mesh.hasPassed = value;
    }

    get visible() {
        return this.mesh.visible;
    }

    set visible(value) {
        this.mesh.visible = value;
    }
}