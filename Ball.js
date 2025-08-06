class Ball {
    constructor(scene, color) {
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
}