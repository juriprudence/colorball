

export default class Ball {
    constructor(scene, color, game) {
        this.game = game;
        this.scene = scene;
        this._color = color;
        this.mesh = null;

        const loader = new THREE.GLTFLoader();
        loader.load(
            'models/player.glb',
            (gltf) => {
                this.mesh = gltf.scene;
                this.mesh.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        if (child.material) {
                            child.material.color.set(this._color);
                            if (child.material.emissive) {
                                child.material.emissive.set(this._color);
                                child.material.emissiveIntensity = 0.2;
                            }
                        }
                    }
                });
                this.mesh.position.set(0, 0, 0);
                this.scene.add(this.mesh);
            },
            undefined,
            (error) => {
                console.error('An error happened while loading the model:', error);
            }
        );
    }

    get position() {
        return this.mesh ? this.mesh.position : new THREE.Vector3();
    }

    get visible() {
        return this.mesh ? this.mesh.visible : false;
    }

    set visible(value) {
        if (this.mesh) {
            this.mesh.visible = value;
        }
    }

    get color() {
        if (this.mesh) {
            // Assuming the first material is the one we want to get the color from
            let material = null;
            this.mesh.traverse((child) => {
                if (child.isMesh && !material) {
                    material = child.material;
                }
            });
            return material ? material.color.getHex() : 0x000000;
        }
        return 0x000000;
    }

    set color(color) {
        this._color = color;
        if (this.mesh) {
            this.mesh.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.material.color.setHex(color);
                    if (child.material.emissive) {
                        child.material.emissive.setHex(color);
                    }
                }
            });
        }
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