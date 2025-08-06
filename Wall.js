export default class Wall {
    constructor(scene, zPosition, colors) {
        this.scene = scene;
        this.mesh = new THREE.Group();
        const wallWidth = 12; // Increased width
        const wallHeight = 12; // Increased height
        const segmentHeight = wallHeight / 4;

        // Create 4 colored segments (vertical arrangement)
        for (let i = 0; i < 4; i++) {
            const segmentGeometry = new THREE.BoxGeometry(wallWidth, segmentHeight, 0.5);
            const segmentMaterial = new THREE.MeshLambertMaterial({
                color: colors[i],
                emissive: colors[i],
                emissiveIntensity: 0.1
            });
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
            // Position segments vertically (raise wall higher)
            segment.position.y = (i - 1.5) * segmentHeight + 6; // Shifted up by 6 units
            segment.castShadow = true;
            segment.receiveShadow = true;
            segment.originalColorIndex = i;
            this.mesh.add(segment);
        }

        this.mesh.position.z = zPosition;
        this.mesh.position.x = 0; // Centered in the ball's path
        this.mesh.rotationSpeed = 0.01; // Slower rotation speed for color movement (was 0.03)
        this.mesh.hasPassed = false; // Track if player has passed this wall

        scene.add(this.mesh);
    }

    get position() {
        return this.mesh.position;
    }

    get children() {
        return this.mesh.children;
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
        const particleCount = 40;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleColors = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);

        // Get wall position
        const wallPosition = this.position.clone();

        // Initialize particle positions and colors
        for (let i = 0; i < particleCount; i++) {
            // Position particles at the wall's location with some random spread
            particlePositions[i * 3] = wallPosition.x + (Math.random() - 0.5) * 6;
            particlePositions[i * 3 + 1] = wallPosition.y + (Math.random() - 0.5) * 6;
            particlePositions[i * 3 + 2] = wallPosition.z + (Math.random() - 0.5) * 2;

            // Set particle colors to match the wall's colors with some variation
            // Get a random segment color from the wall
            const segments = this.children;
            const randomSegment = segments[Math.floor(Math.random() * segments.length)];
            const segmentColor = randomSegment.material.color.getHex();

            const r = ((segmentColor >> 16) & 0xff) / 255 + (Math.random() - 0.5) * 0.2;
            const g = ((segmentColor >> 8) & 0xff) / 255 + (Math.random() - 0.5) * 0.2;
            const b = (segmentColor & 0xff) / 255 + (Math.random() - 0.5) * 0.2;

            particleColors[i * 3] = Math.min(1, Math.max(0, r));
            particleColors[i * 3 + 1] = Math.min(1, Math.max(0, g));
            particleColors[i * 3 + 2] = Math.min(1, Math.max(0, b));

            // Random particle sizes
            particleSizes[i] = Math.random() * 0.4 + 0.1;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.4,
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
            sizeAttenuation: true
        });

        const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(particleSystem);

        // Hide the wall
        this.visible = false;

        // Animate particles
        const startTime = Date.now();
        const duration = 900; // 0.9 second
        const scene = this.scene;

        const animateWallParticles = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Update particle positions to move outward
            const positions = particleGeometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                // Move particles outward from center
                const directionX = positions[i * 3] - wallPosition.x;
                const directionY = positions[i * 3 + 1] - wallPosition.y;
                const directionZ = positions[i * 3 + 2] - wallPosition.z;

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
                requestAnimationFrame(animateWallParticles);
            } else {
                // Remove particles
                scene.remove(particleSystem);
            }
        }

        // Start animation
        animateWallParticles();
    }

    static checkCollisions(game) {
        const ballPosition = game.ball.position;

        for (let i = game.walls.length - 1; i >= 0; i--) {
            const wall = game.walls[i];
            const wallPosition = wall.position;
            // Check if ball is at the same z-position as the wall
            if (Math.abs(ballPosition.z - wallPosition.z) < 1) {
                // Check if ball is passing through the wall horizontally (now wider)
                if (Math.abs(ballPosition.x - wallPosition.x) < 6) {
                    // Always require the ball color to match the bottom segment (lowest y)
                    const bottomSegment = wall.children[0];
                    const segmentColorIndex = bottomSegment.currentColorIndex !== undefined ?
                        bottomSegment.currentColorIndex : bottomSegment.originalColorIndex;
                    const segmentColor = game.colors[segmentColorIndex];
                    // Check if colors match
                    if (game.ballColor === segmentColor) {
                        if (!wall.hasPassed) {
                            wall.hasPassed = true;
                            // Use destruction effect instead of directly removing
                            wall.destroy();
                            // Remove wall after a short delay to allow animation to play
                            setTimeout(() => {
                                game.scene.remove(wall.mesh);
                                game.walls = game.walls.filter(w => w !== wall);
                            }, 600); // Delay matches animation duration
                            game.score += 15;
                            game.updateScore();
                            game.obstaclesPassed++;
                            game.updateAvailableColors();
                            game.changeBallColor();
                        }
                    } else {
                        if (!wall.hasPassed) {
                            wall.hasPassed = true;
                            game.ball.destroy();
                        }
                    }
                }
            }

            // Remove walls that are too far behind and add new ones
            if (wall.position.z > game.ball.position.z + 20) {
                game.scene.remove(wall.mesh);
                game.walls.splice(i, 1);

                // Add new wall ahead
                const furthestZ = Math.min(
                    ...game.rings.map(r => r.position.z),
                    ...game.walls.map(w => w.position.z)
                ) - 20;
                if (isFinite(furthestZ) && furthestZ < game.ball.position.z - 40) {
                    game.walls.push(new Wall(game.scene, furthestZ, game.colors));
                } else if (!isFinite(furthestZ)) {
                    // If there are no rings or walls, create one relative to the ball
                    game.walls.push(new Wall(game.scene, game.ball.position.z - 40, game.colors));
                }
            }
        }
    }
}