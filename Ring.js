export default class Ring {
    constructor(scene, zPosition, colors, game) {
        this.game = game;
        this.mesh = new THREE.Group();
        const radius = 4;
        const tube = 0.8;

        // Create 4 colored segments
        for (let i = 0; i < 4; i++) {
            const segmentGeometry = new THREE.TorusGeometry(radius, tube, 16, 16, Math.PI / 2);
            const segmentMaterial = new THREE.MeshLambertMaterial({
                color: colors[i],
                emissive: colors[i],
                emissiveIntensity: 0.1
            });
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);

            // Rotate each segment to create quarters
            segment.rotation.z = (Math.PI / 2) * i;
            segment.receiveShadow = true;
            segment.colorIndex = i;

            this.mesh.add(segment);
        }

        this.mesh.position.set(2, 3, zPosition); // Move right by 2 units, up by 3 units, and keep z position
        this.mesh.rotationSpeed = (Math.random() * 0.04 + 0.01) * (Math.random() < 0.5 ? 1 : -1); // Adjusted speed
        this.mesh.hasPassed = false; // Initialize hasPassed property

        scene.add(this.mesh);
    }

    get position() {
        return this.mesh.position;
    }

    get rotation() {
        return this.mesh.rotation;
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
    destroy() {
        // Hide the ring
        this.visible = false;

        // Use the game's particle system to create an explosion
        if (this.game && this.game.particleSystem) {
            this.game.particleSystem.createExplosion(this.position, this.game.ballColor, 20);
        }

        // Remove the ring from the scene after a short delay
        setTimeout(() => {
            if (this.game && this.game.scene) {
                this.game.scene.remove(this.mesh);
            }
        }, 1000);
    }
}