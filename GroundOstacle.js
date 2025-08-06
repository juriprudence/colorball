export default class GroundOstacle {
    constructor(scene, zPosition, colors, game) {
        this.game = game;
        // Create a rectangle obstacle on the ground
        const obstacleWidth = 12;
        const obstacleHeight = 0.15;
        const obstacleDepth = 8;

        // Create a group for the obstacle
        this.mesh = new THREE.Group();

        // Create the base rectangle
        const geometry = new THREE.BoxGeometry(obstacleWidth, obstacleHeight, obstacleDepth);
        const material = new THREE.MeshLambertMaterial({
            color: colors[0], // Start with the first color
            emissive: colors[0],
            emissiveIntensity: 0.2
        });
        const obstacle = new THREE.Mesh(geometry, material);

        // Position the obstacle on the ground (y = -0.5 to sit on the ground plane)
        obstacle.position.set(0, -0.53, 0);
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;

        // Add the obstacle to the group
        this.mesh.add(obstacle);

        // Add properties to track the obstacle state
        this.mesh.position.z = zPosition;
        this.mesh.currentColorIndex = 0; // Track current color index
        this.mesh.hasPassed = false; // Track if player has passed this obstacle
        this.mesh.isChangingColor = false; // Track if color is currently changing
        this.mesh.rotationSpeed = 0.005;

        // Add the group to the scene
        scene.add(this.mesh);
    }

    get position() {
        return this.mesh.position;
    }

    get currentColorIndex() {
        return this.mesh.currentColorIndex;
    }

    set currentColorIndex(value) {
        this.mesh.currentColorIndex = value;
    }

    get hasPassed() {
        return this.mesh.hasPassed;
    }

    set hasPassed(value) {
        this.mesh.hasPassed = value;
    }

    get children() {
        return this.mesh.children;
    }
    destroy() {
        // Hide the obstacle
        this.mesh.visible = false;

        // Use the game's particle system to create an explosion
        if (this.game && this.game.particleSystem) {
            this.game.particleSystem.createExplosion(this.position, this.mesh.children[0].material.color, 40);
        }

        // Remove the obstacle from the scene after a short delay
        setTimeout(() => {
            if (this.game && this.game.scene) {
                this.game.scene.remove(this.mesh);
            }
        }, 1000);
    }

    checkCollision(ball) {
        const ballPosition = ball.position;
        const obstaclePosition = this.position;

        if (Math.abs(ballPosition.z - obstaclePosition.z) < 2) {
            if (Math.abs(ballPosition.x - obstaclePosition.x) < 6 && Math.abs(ballPosition.y - 0.5) < 1.5) {
                if (this.game.ballColor === this.game.colors[this.currentColorIndex]) {
                    if (!this.hasPassed) {
                        this.hasPassed = true;
                        this.destroy();
                        this.game.score += 20;
                        this.game.updateScore();
                        this.game.obstaclesPassed++;
                        this.game.updateAvailableColors();
                        this.game.changeBallColor();
                    }
                } else {
                    if (!this.hasPassed) {
                        this.hasPassed = true;
                        this.game.particleSystem.createExplosion(this.game.ball.position, 0xffffff, 50);
                        this.game.ball.destroy();
                    }
                }
            }
        }
    }
}