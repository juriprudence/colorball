class Ring {
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
        // Create particle explosion effect
        const particleCount = 30;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleColors = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);

        // Get ring position
        const ringPosition = this.position.clone();

        // Initialize particle positions and colors
        for (let i = 0; i < particleCount; i++) {
            // Position particles at the ring's location with some random spread
            particlePositions[i * 3] = ringPosition.x + (Math.random() - 0.5) * 4;
            particlePositions[i * 3 + 1] = ringPosition.y + (Math.random() - 0.5) * 4;
            particlePositions[i * 3 + 2] = ringPosition.z + (Math.random() - 0.5) * 4;

            // Set particle colors to match the ring's colors with some variation
            // Get a random segment color from the ring
            const segments = this.mesh.children;
            const randomSegment = segments[Math.floor(Math.random() * segments.length)];
            const segmentColor = randomSegment.material.color.getHex();

            const r = ((segmentColor >> 16) & 0xff) / 255 + (Math.random() - 0.5) * 0.2;
            const g = ((segmentColor >> 8) & 0xff) / 255 + (Math.random() - 0.5) * 0.2;
            const b = (segmentColor & 0xff) / 255 + (Math.random() - 0.5) * 0.2;

            particleColors[i * 3] = Math.min(1, Math.max(0, r));
            particleColors[i * 3 + 1] = Math.min(1, Math.max(0, g));
            particleColors[i * 3 + 2] = Math.min(1, Math.max(0, b));

            // Random particle sizes
            particleSizes[i] = Math.random() * 0.3 + 0.1;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.3,
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
            sizeAttenuation: true
        });

        const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        this.game.scene.add(particleSystem);

        // Hide the ring
        this.visible = false;

        // Animate particles
        const startTime = Date.now();
        const duration = 800; // 0.8 second

        const animateRingParticles = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Update particle positions to move outward
            const positions = particleGeometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                // Move particles outward from center
                const directionX = positions[i * 3] - ringPosition.x;
                const directionY = positions[i * 3 + 1] - ringPosition.y;
                const directionZ = positions[i * 3 + 2] - ringPosition.z;

                // Normalize and scale by progress
                const length = Math.sqrt(directionX * directionX + directionY * directionY + directionZ * directionZ);
                if (length > 0) {
                    positions[i * 3] += (directionX / length) * progress * 1.5;
                    positions[i * 3 + 1] += (directionY / length) * progress * 1.5;
                    positions[i * 3 + 2] += (directionZ / length) * progress * 1.5;
                }
            }
            particleGeometry.attributes.position.needsUpdate = true;

            // Fade out particles
            particleMaterial.opacity = 1 - progress;

            // Continue animation or clean up
            if (progress < 1) {
                requestAnimationFrame(animateRingParticles);
            } else {
                // Remove particles
                this.game.scene.remove(particleSystem);

                // Remove ring from scene and game array, then add a new one
                this.game.scene.remove(this.mesh);
                const ringIndex = this.game.rings.indexOf(this);
                if (ringIndex !== -1) {
                    this.game.rings.splice(ringIndex, 1);
                    const furthestZ = this.game.rings.length > 0 ? Math.min(...this.game.rings.map(r => r.position.z)) - 20 : this.game.ball.position.z - 40;
                    this.game.rings.push(new Ring(this.game.scene, furthestZ, this.game.colors, this.game));
                }
            }
        }

        // Start animation
        animateRingParticles();
    }
}