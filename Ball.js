export default class Ball {
    constructor(scene, color, game) {
        this.game = game;
        const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const ballMaterial = new THREE.MeshLambertMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.2
        });
        this.mesh = new THREE.Mesh(ballGeometry, ballMaterial);
        this.mesh.position.set(0, 0, 0);
        this.mesh.castShadow = true;
        scene.add(this.mesh);
    }

    get position() {
        return this.mesh.position;
    }

    get visible() {
        return this.mesh.visible;
    }

    set visible(value) {
        this.mesh.visible = value;
    }

    get color() {
        return this.mesh.material.color.getHex();
    }

    set color(color) {
        this.mesh.material.color.setHex(color);
        this.mesh.material.emissive.setHex(color);
    }
    destroy() {
        // Hide the ball
        this.visible = false;

        // Use the game's particle system to create an explosion
        if (this.game && this.game.particleSystem) {
            this.game.particleSystem.createExplosion(this.position, 0xffffff, 50);
        }

        // End the game after a short delay to let the explosion play out
        setTimeout(() => {
            if (this.game) {
                this.game.endGame();
            }
        }, 1000);
    }
}