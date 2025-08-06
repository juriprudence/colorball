class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
    }

    createExplosion(position, color, count) {
        for (let i = 0; i < count; i++) {
            const geometry = new THREE.SphereGeometry(0.1, 8, 8);
            const material = new THREE.MeshBasicMaterial({ color: color });
            const particle = new THREE.Mesh(geometry, material);

            particle.position.copy(position);

            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );
            particle.velocity = velocity;
            particle.lifetime = Math.random() * 1 + 0.5;

            this.particles.push(particle);
            this.scene.add(particle);
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.position.add(particle.velocity);
            particle.lifetime -= 0.05;

            if (particle.lifetime <= 0) {
                this.scene.remove(particle);
                this.particles.splice(i, 1);
            }
        }
    }
}