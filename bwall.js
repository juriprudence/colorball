

class BWall {
    constructor(scene) {
        this.scene = scene;
        this.walls = [];
        this.loader = new THREE.GLTFLoader();
        this.loadWallModel();
    }

    loadWallModel() {
        this.loader.load('models/wall.glb', (gltf) => {
            this.wallModel = gltf.scene;
            this.createInitialWalls();
        }, undefined, (error) => {
            console.error('An error happened while loading the wall model:', error);
        });
    }

    createInitialWalls() {
        for (let i = 0; i < 10; i++) {
            const z = -i * 20; // Increased spacing
            // Left wall
            const leftWall = this.wallModel.clone();
            leftWall.position.set(-10, 5, z);
            this.scene.add(leftWall);
            this.walls.push(leftWall);

            // Right wall
            const rightWall = this.wallModel.clone();
            rightWall.position.set(10, 5, z);
            this.scene.add(rightWall);
            this.walls.push(rightWall);
        }
    }

    update(cameraPosition) {
        if (!this.wallModel || this.walls.length === 0) {
            return; // Don't update if the model isn't loaded yet or no walls exist
        }

        const lastWallZ = this.walls[this.walls.length - 1].position.z;
        if (cameraPosition.z < lastWallZ + 100) { // Check if camera is getting close to the end
            const newZ = lastWallZ - 20;
            // Add a pair of walls
            const leftWall = this.wallModel.clone();
            leftWall.position.set(-10, 5, newZ);
            this.scene.add(leftWall);
            this.walls.push(leftWall);

            const rightWall = this.wallModel.clone();
            rightWall.position.set(10, 5, newZ);
            this.scene.add(rightWall);
            this.walls.push(rightWall);

            // Optional: remove walls that are far behind the camera to save memory
            if (this.walls.length > 40) {
                const wallToRemove1 = this.walls.shift();
                const wallToRemove2 = this.walls.shift();
                this.scene.remove(wallToRemove1);
                this.scene.remove(wallToRemove2);
            }
        }
    }
}

export { BWall };