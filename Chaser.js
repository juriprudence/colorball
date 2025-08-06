export default class Chaser {
    constructor(scene, game) {
        this.scene = scene;
        this.game = game;
        this.mesh = null;
        this.create();
    }

    create() {
        if (this.game.availableColors.length === 0) {
            this.game.endGame();
            return;
        }

        const chaserGeometry = new THREE.SphereGeometry(1, 32, 32);
        const chaserColor = this.game.availableColors[Math.floor(Math.random() * this.game.availableColors.length)];
        const chaserMaterial = new THREE.MeshLambertMaterial({
            color: chaserColor,
            emissive: chaserColor,
            emissiveIntensity: 0.5
        });
        this.mesh = new THREE.Mesh(chaserGeometry, chaserMaterial);
        this.mesh.position.set(this.game.ball.position.x, this.game.ball.position.y, this.game.ball.position.z + 20);
        this.mesh.color = chaserColor;
        this.scene.add(this.mesh);
    }

    get position() {
        return this.mesh.position;
    }

    checkCollision() {
        if (!this.mesh) return;

        const distance = this.game.ball.position.distanceTo(this.mesh.position);
        if (distance < 2.5) {
            const chaserColorIndex = this.game.availableColors.indexOf(this.mesh.color);

            if (chaserColorIndex !== -1) {
                if (this.game.availableColors.length > 1) {
                    const removedColor = this.game.availableColors.splice(chaserColorIndex, 1)[0];

                    if (this.game.ballColor === removedColor) {
                        if (this.game.selectedColorIndex >= this.game.availableColors.length) {
                            this.game.selectedColorIndex = 0;
                        }
                        this.game.ballColor = this.game.availableColors[this.game.selectedColorIndex];
                        this.game.ball.color = this.game.ballColor;
                    }
                }

                this.scene.remove(this.mesh);
                this.mesh = null;
                this.game.score += 50;
                this.game.updateScore();
                this.game.updateAvailableColorsUI();

            } else {
                this.game.particleSystem.createExplosion(this.game.ball.position, 0xffffff, 50);
                this.game.ball.destroy();
            }
        }
    }

    update() {
        if (this.mesh) {
            this.mesh.position.z -= 0.1;
        }
    }
}