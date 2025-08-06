class Ball {
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
        // Create particle explosion effect
        const particleCount = 50;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleColors = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);

        // Initialize particle positions and colors
        for (let i = 0; i < particleCount; i++) {
            // Position particles at the ball's location with some random spread
            particlePositions[i * 3] = this.position.x + (Math.random() - 0.5) * 2;
            particlePositions[i * 3 + 1] = this.position.y + (Math.random() - 0.5) * 2;
            particlePositions[i * 3 + 2] = this.position.z + (Math.random() - 0.5) * 2;

            // Set particle colors to match the ball's color with some variation
            const colorVariation = 0.2;
            const r = ((this.color >> 16) & 0xff) / 255 + (Math.random() - 0.5) * colorVariation;
            const g = ((this.color >> 8) & 0xff) / 255 + (Math.random() - 0.5) * colorVariation;
            const b = (this.color & 0xff) / 255 + (Math.random() - 0.5) * colorVariation;

            particleColors[i * 3] = Math.min(1, Math.max(0, r));
            particleColors[i * 3 + 1] = Math.min(1, Math.max(0, g));
            particleColors[i * 3 + 2] = Math.min(1, Math.max(0, b));

            // Random particle sizes
            particleSizes[i] = Math.random() * 0.5 + 0.1;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
            sizeAttenuation: true
        });

        const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        this.game.scene.add(particleSystem);

        // Hide the ball
        this.visible = false;

        // Animate particles
        const startTime = Date.now();
        const duration = 1000; // 1 second

        const animateParticles = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Update particle positions to move outward
            const positions = particleGeometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                // Move particles outward from center
                const directionX = positions[i * 3] - this.position.x;
                const directionY = positions[i * 3 + 1] - this.position.y;
                const directionZ = positions[i * 3 + 2] - this.position.z;

                // Normalize and scale by progress
                const length = Math.sqrt(directionX * directionX + directionY * directionY + directionZ * directionZ);
                if (length > 0) {
                    positions[i * 3] += (directionX / length) * progress * 2;
                    positions[i * 3 + 1] += (directionY / length) * progress * 2;
                    positions[i * 3 + 2] += (directionZ / length) * progress * 2;
                }
            }
            particleGeometry.attributes.position.needsUpdate = true;

            // Fade out particles
            particleMaterial.opacity = 1 - progress;

            // Continue animation or clean up
            if (progress < 1) {
                requestAnimationFrame(animateParticles);
            } else {
                // Remove particles and end game
                this.game.scene.remove(particleSystem);
                this.game.endGame();
            }
        }

        // Start animation
        animateParticles();
    }
}