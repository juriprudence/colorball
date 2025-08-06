class FloorTunnel {
    constructor(scene, zPosition, colors) {
        this.scene = scene;
        this.mesh = new THREE.Group();
        this.colors = colors;
        this.currentColorIndex = Math.floor(Math.random() * 4);
        
        const tunnelLength = 10;
        const tunnelWidth = 5;
        const tunnelHeight = 3;
        const wallThickness = 0.5;

        const wallGeometry = new THREE.BoxGeometry(wallThickness, tunnelHeight, tunnelLength);
        const roofGeometry = new THREE.BoxGeometry(tunnelWidth, wallThickness, tunnelLength);

        // Create material that we can update
        this.tunnelMaterial = new THREE.MeshLambertMaterial({
            color: colors[this.currentColorIndex],
            emissive: colors[this.currentColorIndex],
            emissiveIntensity: 0.1
        });

        // Left wall
        const leftWall = new THREE.Mesh(wallGeometry, this.tunnelMaterial);
        leftWall.position.set(-tunnelWidth / 2 + wallThickness / 2, tunnelHeight / 2 - 0.5, 0);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        this.mesh.add(leftWall);

        // Right wall
        const rightWall = new THREE.Mesh(wallGeometry, this.tunnelMaterial);
        rightWall.position.set(tunnelWidth / 2 - wallThickness / 2, tunnelHeight / 2 - 0.5, 0);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        this.mesh.add(rightWall);

        // Roof
        const roof = new THREE.Mesh(roofGeometry, this.tunnelMaterial);
        roof.position.set(0, tunnelHeight - wallThickness / 2 - 0.5, 0);
        roof.castShadow = true;
        roof.receiveShadow = true;
        this.mesh.add(roof);

        this.mesh.position.set(0, 0, zPosition);
        this.mesh.hasPassed = false;

        scene.add(this.mesh);
    }

    get position() {
        return this.mesh.position;
    }

    get colorIndex() {
        return this.currentColorIndex;
    }

    get hasPassed() {
        return this.mesh.hasPassed;
    }

    set hasPassed(value) {
        this.mesh.hasPassed = value;
    }

    destroy() {
        // Create particle explosion effect
        const particleCount = 100;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleColors = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);

        // Get tunnel position and dimensions
        const tunnelPosition = this.position.clone();
        const tunnelLength = 10;
        const tunnelWidth = 5;
        const tunnelHeight = 3;

        // Initialize particle positions and colors
        for (let i = 0; i < particleCount; i++) {
            // Position particles along the tunnel's surfaces
            const side = Math.floor(Math.random() * 3); // 0: left, 1: right, 2: roof
            let x, y, z;
            z = tunnelPosition.z + (Math.random() - 0.5) * tunnelLength;

            if (side === 0) { // Left wall
                x = tunnelPosition.x - tunnelWidth / 2;
                y = tunnelPosition.y + (Math.random() - 0.5) * tunnelHeight;
            } else if (side === 1) { // Right wall
                x = tunnelPosition.x + tunnelWidth / 2;
                y = tunnelPosition.y + (Math.random() - 0.5) * tunnelHeight;
            } else { // Roof
                x = tunnelPosition.x + (Math.random() - 0.5) * tunnelWidth;
                y = tunnelPosition.y + tunnelHeight / 2;
            }

            particlePositions[i * 3] = x;
            particlePositions[i * 3 + 1] = y;
            particlePositions[i * 3 + 2] = z;

            // Set particle colors to match the tunnel's color
            const tunnelColor = this.tunnelMaterial.color.getHex();
            const r = ((tunnelColor >> 16) & 0xff) / 255;
            const g = ((tunnelColor >> 8) & 0xff) / 255;
            const b = (tunnelColor & 0xff) / 255;

            particleColors[i * 3] = r;
            particleColors[i * 3 + 1] = g;
            particleColors[i * 3 + 2] = b;

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
        this.scene.add(particleSystem);

        // Hide the tunnel
        this.mesh.visible = false;

        // Animate particles
        const startTime = Date.now();
        const duration = 1200; // 1.2 seconds
        const scene = this.scene;

        const animateTunnelParticles = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Update particle positions to move outward
            const positions = particleGeometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                // Move particles outward from the center of the tunnel
                const directionX = positions[i * 3] - tunnelPosition.x;
                const directionY = positions[i * 3 + 1] - tunnelPosition.y;
                const directionZ = positions[i * 3 + 2] - tunnelPosition.z;

                const length = Math.sqrt(directionX * directionX + directionY * directionY + directionZ * directionZ);
                if (length > 0) {
                    positions[i * 3] += (directionX / length) * progress * 1.5;
                    positions[i * 3 + 1] += (directionY / length) * progress * 1.5;
                }
            }
            particleGeometry.attributes.position.needsUpdate = true;

            // Fade out particles
            particleMaterial.opacity = 1 - progress;

            // Continue animation or clean up
            if (progress < 1) {
                requestAnimationFrame(animateTunnelParticles);
            } else {
                // Remove particles and the original tunnel mesh
                scene.remove(particleSystem);
                scene.remove(this.mesh);
            }
        }

        // Start animation
        animateTunnelParticles();
    }

    // Method to update the tunnel's color
    updateColor() {
        // Change color periodically based on time
        const time = Date.now() * 0.001;
        // Change color every 2.5 seconds (slightly different timing than ground obstacles)
        const newColorIndex = Math.floor(time * 0.4) % 4;
        
        if (newColorIndex !== this.currentColorIndex) {
            this.currentColorIndex = newColorIndex;
            
            // Update the material color
            if (this.tunnelMaterial) {
                this.tunnelMaterial.color.setHex(this.colors[this.currentColorIndex]);
                this.tunnelMaterial.emissive.setHex(this.colors[this.currentColorIndex]);
            }
        }
    }

    // Optional: Method to set a specific color
    setColor(colorIndex) {
        if (colorIndex >= 0 && colorIndex < this.colors.length) {
            this.currentColorIndex = colorIndex;
            if (this.tunnelMaterial) {
                this.tunnelMaterial.color.setHex(this.colors[this.currentColorIndex]);
                this.tunnelMaterial.emissive.setHex(this.colors[this.currentColorIndex]);
            }
        }
    }

    // Method to get the current color name (for debugging)
    getCurrentColorName() {
        const colorNames = ['red', 'green', 'yellow', 'blue'];
        return colorNames[this.currentColorIndex] || 'unknown';
    }
}