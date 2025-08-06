class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.ball = null;
        this.backgroundSphere = null;
        this.groundPlanes = [];
        this.rings = [];
        this.walls = [];
        this.groundObstacles = [];
        this.floorTunnels = [];
        this.chaser = null;
        this.gameStarted = false;
        this.gameOver = false;
        this.ballColor = 0xff0000;
        this.score = 0;
        this.ballSpeed = 0;
        this.maxSpeed = 0.3;
        this.obstaclesPassed = 0;
        this.cameraOffset = new THREE.Vector3(0, 5, 10);
        this.stars = [];
        this.selectedColorIndex = 0;
        this.lastChaserTime = 0;
        this.colors = [0xff0000, 0x00ff00, 0xffff00, 0x0000FF]; // red, green, yellow, dark red
        this.availableColors = [this.colors[0]];
        this.colorNames = ['red', 'green', 'yellow', 'bleu'];

        this.init();
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000011, 50, 200);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000011); // Dark space color
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Create infinite table (ground)
        this.createGroundPlanes();

        // Create ball
        this.createBall();

        // Create initial rings
        this.createRings();

        // Event listeners for drag controls
        const canvas = document.getElementById('canvas');
        canvas.addEventListener('mousedown', this.onDragStart.bind(this));
        canvas.addEventListener('mousemove', this.onDragMove.bind(this));
        canvas.addEventListener('mouseup', this.onDragEnd.bind(this));
        canvas.addEventListener('mouseleave', this.onDragEnd.bind(this));
        canvas.addEventListener('touchstart', this.onDragStart.bind(this));
        canvas.addEventListener('touchmove', this.onDragMove.bind(this));
        canvas.addEventListener('touchend', this.onDragEnd.bind(this));
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Create background sphere
        this.createBackgroundSphere();

        // Initialize drag indicators
        this.dragUpIndicator = document.getElementById('dragUpIndicator');
        this.dragLeftIndicator = document.getElementById('dragLeftIndicator');
        this.dragRightIndicator = document.getElementById('dragRightIndicator');

        // Start render loop
        this.animate();
    }

    createBall() {
        this.ball = new Ball(this.scene, this.ballColor);
    }

    createBackgroundSphere() {
        const sphereGeometry = new THREE.SphereGeometry(50, 32, 32);
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x000022,
            transparent: true,
            opacity: 0.05,
            side: THREE.BackSide
        });
        this.backgroundSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.scene.add(this.backgroundSphere);
    }

    createGroundPlanes() {
        // Remove old planes if any
        this.groundPlanes.forEach(plane => this.scene.remove(plane));
        this.groundPlanes = [];
        // Create several large planes tiled along z to simulate infinity
        const planeWidth = 30;
        const planeHeight = 60;
        const numPlanes = 5;
        // Glass-like shader material
        const glassVertexShader = `
            varying vec2 vUv;
            varying vec3 vWorldPosition;
            void main() {
                vUv = uv;
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        const glassFragmentShader = `
            varying vec2 vUv;
            varying vec3 vWorldPosition;
            void main() {
                // Simulate fresnel effect
                float fresnel = pow(1.0 - abs(dot(normalize(vec3(0.0, 1.0, 0.0)), normalize(vec3(0.0, 1.0, 0.0)))), 2.0);
                // Blue glass tint
                vec3 glassColor = vec3(0.2, 0.4, 0.8);
                // Simulate a moving highlight
                float highlight = smoothstep(0.0, 0.15, abs(vUv.x - 0.5) + abs(vUv.y - 0.5) - 0.2 * sin(vWorldPosition.z * 0.05 + vWorldPosition.x * 0.05));
                // Add a subtle reflection (white)
                float reflection = 0.5 * fresnel + 0.2 * highlight;
                // Add a subtle refraction tint
                vec3 color = mix(glassColor, vec3(1.0), reflection);
                float glassAlpha = 0.13 + 0.18 * fresnel + 0.1 * highlight;
                gl_FragColor = vec4(color, glassAlpha);
            }
        `;
        const glassMaterial = new THREE.ShaderMaterial({
            vertexShader: glassVertexShader,
            fragmentShader: glassFragmentShader,
            transparent: true,
            side: THREE.DoubleSide
        });
        for (let i = 0; i < numPlanes; i++) {
            const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
            const plane = new THREE.Mesh(geometry, glassMaterial);
            plane.rotation.x = -Math.PI / 2;
            plane.position.set(0, -0.5, -i * planeHeight);
            plane.receiveShadow = true;
            this.scene.add(plane);
            this.groundPlanes.push(plane);
        }
    }

    createRings() {
        // Clear existing rings, walls, and ground obstacles
        this.rings.forEach(ring => this.scene.remove(ring.mesh));
        this.walls.forEach(wall => this.scene.remove(wall.mesh));
        this.groundObstacles.forEach(obstacle => this.scene.remove(obstacle.mesh));
        if (typeof this.floorTunnels !== 'undefined') {
            this.floorTunnels.forEach(tunnel => this.scene.remove(tunnel.mesh));
        }
        this.rings = [];
        this.walls = [];
        this.groundObstacles = [];
        this.floorTunnels = [];

        // Create obstacles further ahead of the ball's starting position
        for (let i = 0; i < 10; i++) {
            this.rings.push(new Ring(this.scene, i * 20 + 30, this.colors));
            // Create walls at alternating positions
            if (i % 2 === 1) {
                this.walls.push(new Wall(this.scene, i * 20 + 40, this.colors));
            }
            // Create ground obstacles at regular intervals
            if (i % 4 === 0) {
                this.groundObstacles.push(new GroundObstacle(this.scene, i * 20 + 32, this.colors));
            }
            // Create floor tunnels
            if (i > 0 && i % 3 === 0) {
                this.floorTunnels.push(new FloorTunnel(this.scene, i * 20 + 50, this.colors));
            }
        }
    }

    createChaser() {
        const chaserGeometry = new THREE.SphereGeometry(1, 32, 32);
        const chaserColor = this.availableColors[Math.floor(Math.random() * this.availableColors.length)];
        const chaserMaterial = new THREE.MeshLambertMaterial({
            color: chaserColor,
            emissive: chaserColor,
            emissiveIntensity: 0.5
        });
        const chaser = new THREE.Mesh(chaserGeometry, chaserMaterial);
        chaser.position.set(this.ball.position.x, this.ball.position.y, this.ball.position.z + 20);
        chaser.color = chaserColor;
        this.scene.add(chaser);
        return chaser;
    }

    destroyBall() {
        // Create particle explosion effect
        const particleCount = 50;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleColors = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);

        // Initialize particle positions and colors
        for (let i = 0; i < particleCount; i++) {
            // Position particles at the ball's location with some random spread
            particlePositions[i * 3] = this.ball.position.x + (Math.random() - 0.5) * 2;
            particlePositions[i * 3 + 1] = this.ball.position.y + (Math.random() - 0.5) * 2;
            particlePositions[i * 3 + 2] = this.ball.position.z + (Math.random() - 0.5) * 2;

            // Set particle colors to match the ball's color with some variation
            const colorVariation = 0.2;
            const r = ((this.ballColor >> 16) & 0xff) / 255 + (Math.random() - 0.5) * colorVariation;
            const g = ((this.ballColor >> 8) & 0xff) / 255 + (Math.random() - 0.5) * colorVariation;
            const b = (this.ballColor & 0xff) / 255 + (Math.random() - 0.5) * colorVariation;

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
        this.scene.add(particleSystem);

        // Hide the ball
        this.ball.visible = false;

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
                const directionX = positions[i * 3] - this.ball.position.x;
                const directionY = positions[i * 3 + 1] - this.ball.position.y;
                const directionZ = positions[i * 3 + 2] - this.ball.position.z;

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
                this.scene.remove(particleSystem);
                this.endGame();
            }
        }

        // Start animation
        animateParticles();
    }

    destroyRing(ring) {
        // Create particle explosion effect
        const particleCount = 30;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleColors = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);

        // Get ring position
        const ringPosition = ring.position.clone();

        // Initialize particle positions and colors
        for (let i = 0; i < particleCount; i++) {
            // Position particles at the ring's location with some random spread
            particlePositions[i * 3] = ringPosition.x + (Math.random() - 0.5) * 4;
            particlePositions[i * 3 + 1] = ringPosition.y + (Math.random() - 0.5) * 4;
            particlePositions[i * 3 + 2] = ringPosition.z + (Math.random() - 0.5) * 4;

            // Set particle colors to match the ring's colors with some variation
            // Get a random segment color from the ring
            const segments = ring.children;
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
        this.scene.add(particleSystem);

        // Hide the ring
        ring.visible = false;

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
                this.scene.remove(particleSystem);
            }
        }

        // Start animation
        animateRingParticles();
    }

    destroyWall(wall) {
        // Create particle explosion effect
        const particleCount = 40;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleColors = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);

        // Get wall position
        const wallPosition = wall.position.clone();

        // Initialize particle positions and colors
        for (let i = 0; i < particleCount; i++) {
            // Position particles at the wall's location with some random spread
            particlePositions[i * 3] = wallPosition.x + (Math.random() - 0.5) * 6;
            particlePositions[i * 3 + 1] = wallPosition.y + (Math.random() - 0.5) * 6;
            particlePositions[i * 3 + 2] = wallPosition.z + (Math.random() - 0.5) * 2;

            // Set particle colors to match the wall's colors with some variation
            // Get a random segment color from the wall
            const segments = wall.children;
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
        wall.visible = false;

        // Animate particles
        const startTime = Date.now();
        const duration = 900; // 0.9 second

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
                this.scene.remove(particleSystem);
            }
        }

        // Start animation
        animateWallParticles();
    }

    checkCollisions() {
        const ballPosition = this.ball.position;

        this.rings.forEach((ring, ringIndex) => {
            const ringPosition = ring.position;
            const distance = ballPosition.distanceTo(ringPosition);

            // Check if ball is passing through ring
            if (distance < 5 && Math.abs(ballPosition.z - ringPosition.z) < 1) {
                if (ring.hasPassed) return;

                // Calculate angle from ring center to ball in X/Y plane
                const dx = ballPosition.x - ringPosition.x;
                const dy = ballPosition.y - ringPosition.y;
                let angle = Math.atan2(dy, dx);
                // Adjust for ring rotation
                angle -= ring.rotation.z;
                if (angle < 0) angle += Math.PI * 2;
                // Map angle to segment
                let segmentIndex = Math.floor((angle / (Math.PI * 2)) * 4) % 4;
                if (segmentIndex < 0) segmentIndex += 4;
                const segmentColor = this.colors[segmentIndex];

                if (this.ballColor === segmentColor) {
                    ring.hasPassed = true;
                    // Use destruction effect instead of directly removing
                    this.destroyRing(ring.mesh);
                    // Remove ring after a short delay to allow animation to play
                    setTimeout(() => {
                        this.scene.remove(ring.mesh);
                        const ringIndex = this.rings.indexOf(ring);
                        if (ringIndex !== -1) {
                            this.rings.splice(ringIndex, 1);
                            const furthestZ = Math.min(...this.rings.map(r => r.position.z)) - 20;
                            this.rings.push(new Ring(this.scene, furthestZ, this.colors));
                        }
                    }, 500); // Delay matches animation duration
                    this.score += 10;
                    this.obstaclesPassed++;
                    this.updateAvailableColors();
                    this.changeBallColor();
                    this.updateScore();
                    this.maxSpeed = Math.min(this.maxSpeed + 0.02, 1.2);
                } else {
                    ring.hasPassed = true;
                    this.destroyBall();
                }
            } else if (distance >= 5 || Math.abs(ballPosition.z - ringPosition.z) >= 1) {
                ring.hasPassed = false;
            }
        });
    }

    checkWallCollisions() {
        const ballPosition = this.ball.position;

        this.walls.forEach((wall, wallIndex) => {
            const wallPosition = wall.position;
            // Check if ball is at the same z-position as the wall
            if (Math.abs(ballPosition.z - wallPosition.z) < 1) {
                // Check if ball is passing through the wall horizontally (now wider)
                if (Math.abs(ballPosition.x - wallPosition.x) < 6) {
                    // Always require the ball color to match the bottom segment (lowest y)
                    const bottomSegment = wall.children[0];
                    const segmentColorIndex = bottomSegment.currentColorIndex !== undefined ?
                        bottomSegment.currentColorIndex : bottomSegment.originalColorIndex;
                    const segmentColor = this.colors[segmentColorIndex];
                    // Check if colors match
                    if (this.ballColor === segmentColor) {
                        if (!wall.hasPassed) {
                            wall.hasPassed = true;
                            // Use destruction effect instead of directly removing
                            this.destroyWall(wall.mesh);
                            // Remove wall after a short delay to allow animation to play
                            setTimeout(() => {
                                const wallIndex = this.walls.indexOf(wall);
                                if (wallIndex !== -1) {
                                    this.scene.remove(wall.mesh);
                                    this.walls.splice(wallIndex, 1);
                                }
                            }, 600); // Delay matches animation duration
                            this.score += 15;
                            this.updateScore();
                            this.obstaclesPassed++;
                            this.updateAvailableColors();
                            this.changeBallColor();
                        }
                    } else {
                        if (!wall.hasPassed) {
                            wall.hasPassed = true;
                            this.destroyBall();
                        }
                    }
                }
            }

            // Remove walls that are too far behind and add new ones
            if (wall.position.z > this.ball.position.z + 20) {
                this.scene.remove(wall.mesh);
                this.walls.splice(wallIndex, 1);

                // Add new wall ahead
                const furthestZ = Math.min(
                    ...this.rings.map(r => r.position.z),
                    ...this.walls.map(w => w.position.z)
                ) - 20;
                if (isFinite(furthestZ) && furthestZ < this.ball.position.z - 40) {
                    this.walls.push(new Wall(this.scene, furthestZ, this.colors));
                } else if (!isFinite(furthestZ)) {
                    // If there are no rings or walls, create one relative to the ball
                    this.walls.push(new Wall(this.scene, this.ball.position.z - 40, this.colors));
                }
            }
        });
    }

    checkGroundObstacleCollisions() {
        const ballPosition = this.ball.position;

        this.groundObstacles.forEach((obstacle, obstacleIndex) => {
            const obstaclePosition = obstacle.position;
            // Check if ball is at the same z-position as the obstacle
            if (Math.abs(ballPosition.z - obstaclePosition.z) < 1) {
                // Check if ball is within the obstacle's boundaries (8x8 square)
                if (Math.abs(ballPosition.x - obstaclePosition.x) < 4 && Math.abs(ballPosition.y - obstaclePosition.y) < 4) {
                    // Check if colors match
                    if (this.ballColor === this.colors[obstacle.currentColorIndex]) {
                        if (!obstacle.hasPassed) {
                            obstacle.hasPassed = true;
                            this.score += 20; // More points for ground obstacles
                            this.updateScore();
                            this.obstaclesPassed++;
                            this.updateAvailableColors();
                            this.changeBallColor();
                        }
                    } else {
                        // If colors don't match, end the game
                        if (!obstacle.hasPassed) {
                            obstacle.hasPassed = true;
                            this.destroyBall();
                        }
                    }
                }
            }

            // Remove obstacles that are too far behind and add new ones
            if (obstacle.position.z > this.ball.position.z + 20) {
                this.scene.remove(obstacle.mesh);
                this.groundObstacles.splice(obstacleIndex, 1);

                // Add new obstacle ahead
                const allZPositions = [
                    ...this.rings.map(r => r.position.z),
                    ...this.walls.map(w => w.position.z),
                    ...this.groundObstacles.map(o => o.position.z)
                ];
                const furthestZ = allZPositions.length > 0 ? Math.min(...allZPositions) - 20 : this.ball.position.z - 40;
                if (isFinite(furthestZ) && furthestZ < this.ball.position.z - 40) {
                    this.groundObstacles.push(new GroundObstacle(this.scene, furthestZ, this.colors));
                } else if (!isFinite(furthestZ)) {
                    // If there are no rings, walls, or obstacles, create one relative to the ball
                    this.groundObstacles.push(new GroundObstacle(this.scene, this.ball.position.z - 40, this.colors));
                }
            }
        });
    }

    checkFloorTunnelCollisions() {
        const ballPosition = this.ball.position;
        this.floorTunnels.forEach((tunnel, index) => {
            const tunnelPosition = tunnel.position;
            const tunnelLength = 10;
            const tunnelWidth = 5;
            const tunnelHeight = 3;

            if (ballPosition.z > tunnelPosition.z - tunnelLength / 2 && ballPosition.z < tunnelPosition.z + tunnelLength / 2) {
                if (
                    ballPosition.x > tunnelPosition.x - tunnelWidth / 2 &&
                    ballPosition.x < tunnelPosition.x + tunnelWidth / 2 &&
                    ballPosition.y > tunnelPosition.y - 0.5 &&
                    ballPosition.y < tunnelPosition.y + tunnelHeight - 0.5
                ) {
                    if (this.ballColor === this.colors[tunnel.colorIndex]) {
                        if (!tunnel.hasPassed) {
                            tunnel.hasPassed = true;
                            this.score += 25;
                            this.updateScore();
                            this.obstaclesPassed++;
                            this.updateAvailableColors();
                            this.changeBallColor();
                        }
                    } else {
                        if (!tunnel.hasPassed) {
                            tunnel.hasPassed = true;
                            this.destroyBall();
                        }
                    }
                } else {
                    if (!tunnel.hasPassed) {
                        tunnel.hasPassed = true;
                        this.destroyBall();
                    }
                }
            }

            if (tunnel.position.z > this.ball.position.z + 20) {
                this.scene.remove(tunnel.mesh);
                this.floorTunnels.splice(index, 1);
            }
        });
    }

    checkChaserCollision() {
        if (!this.chaser) return;

        const distance = this.ball.position.distanceTo(this.chaser.position);
        if (distance < 2.5) {
            const chaserColorIndex = this.availableColors.indexOf(this.chaser.color);

            // If the player has the chaser's color in their palette
            if (chaserColorIndex !== -1) {
                // If it's not the last color, remove it
                if (this.availableColors.length > 1) {
                    const removedColor = this.availableColors.splice(chaserColorIndex, 1)[0];

                    // If the ball's current color was the one that was removed,
                    // we must change the ball's color to a new one.
                    if (this.ballColor === removedColor) {
                        // Reset selected index to a valid one before changing color
                        if (this.selectedColorIndex >= this.availableColors.length) {
                            this.selectedColorIndex = 0; // default to the first color
                        }
                        this.ball.color = this.availableColors[this.selectedColorIndex];
                    }
                }

                // Player survives
                this.scene.remove(this.chaser);
                this.chaser = null;
                this.score += 50;
                this.updateScore();
                this.updateAvailableColorsUI();

            } else {
                // Player does not have the color, game over
                this.destroyBall();
            }
        }
    }

    updateAvailableColors() {
        const newColorIndex = Math.floor(this.obstaclesPassed / 2);
        if (newColorIndex < this.colors.length && !this.availableColors.includes(this.colors[newColorIndex])) {
            this.availableColors.push(this.colors[newColorIndex]);
            this.updateAvailableColorsUI();
        }
    }

    updateAvailableColorsUI() {
        const uiElement = document.getElementById('ui');
        let colorElements = '';
        if (this.availableColors.length > 1) {
            colorElements = '<div>Available Colors:</div>';
            this.availableColors.forEach((color, index) => {
                const isSelected = index === this.selectedColorIndex;
                const borderStyle = isSelected ? 'border: 2px solid yellow;' : 'border: 2px solid white;';
                colorElements += `<div class="color-option" style="background-color: #${color.toString(16).padStart(6, '0')}; ${borderStyle}"></div>`;
            });
        }
        uiElement.innerHTML = `<div>Score: <span id="score">${this.score}</span></div>${colorElements}`;
    }

    changeBallColor() {
        if (this.availableColors.length > 0) {
            this.selectedColorIndex = (this.selectedColorIndex + 1) % this.availableColors.length;
            this.ballColor = this.availableColors[this.selectedColorIndex];
            this.ball.color = this.ballColor;
            this.updateAvailableColorsUI();
        }
    }

    updateScore() {
        document.getElementById('score').textContent = this.score;
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        if (this.gameStarted && !this.gameOver) {
            // Move ball forward only when there's input
            if (this.ballSpeed > 0) {
                this.ball.position.z -= this.ballSpeed;
                this.ballSpeed *= 0.92; // Increased friction for faster stop
                if (this.ballSpeed < 0.01) this.ballSpeed = 0; // Stop completely when very slow
            }

            // Move ground planes to simulate infinite table
            const planeHeight = 60;
            this.groundPlanes.forEach(plane => {
                // If plane is too far behind the ball, move it ahead
                if (plane.position.z - this.ball.position.z > planeHeight * 2) {
                    plane.position.z -= planeHeight * this.groundPlanes.length;
                }
                // If plane is too far ahead, move it behind
                if (this.ball.position.z - plane.position.z > planeHeight * 2) {
                    plane.position.z += planeHeight * this.groundPlanes.length;
                }
            });

            // Rotate rings
            this.rings.forEach(ring => {
                ring.rotation.z += ring.mesh.rotationSpeed;
            });

            // Rotate wall colors (slower)
            this.walls.forEach(wall => {
                wall.children.forEach((segment, index) => {
                    // Calculate new color index based on rotation
                    const time = Date.now() * 0.001;
                    const colorOffset = Math.floor(time * 1.2) % 4; // Adjusted speed
                    const newColorIndex = (segment.originalColorIndex + colorOffset) % 4;
                    segment.material.color.setHex(this.colors[newColorIndex]);
                    segment.material.emissive.setHex(this.colors[newColorIndex]);
                    segment.currentColorIndex = newColorIndex;
                });
            });

            if (this.chaser) {
                this.chaser.position.z -= 0.1;
            }

            // Animate ground obstacles color changes
            this.groundObstacles.forEach(obstacle => {
                // Change color periodically
                const time = Date.now() * 0.001;
                // Change color every 2 seconds
                if (Math.floor(time * 0.5) % 4 !== obstacle.currentColorIndex) {
                    obstacle.currentColorIndex = Math.floor(time * 0.5) % 4;
                    obstacle.children[0].material.color.setHex(this.colors[obstacle.currentColorIndex]);
                    obstacle.children[0].material.emissive.setHex(this.colors[obstacle.currentColorIndex]);
                }
            });

            // Update camera to follow ball
            const targetCameraPosition = this.ball.position.clone().add(this.cameraOffset);
            this.camera.position.lerp(targetCameraPosition, 0.1);
            this.camera.lookAt(this.ball.position);

            // Update background sphere to follow ball
            if (this.backgroundSphere) {
                this.backgroundSphere.position.copy(this.ball.position);
            }

            // Animate starfield
            this.stars.forEach(starField => {
                starField.position.z = this.ball.position.z;
            });

            // Check collisions
            this.checkCollisions();
            this.checkWallCollisions();
            this.checkGroundObstacleCollisions();
            this.checkFloorTunnelCollisions();
            this.checkChaserCollision();

            // Remove rings that are too far behind
            this.rings.forEach((ring, index) => {
                if (ring.position.z > this.ball.position.z + 20) {
                    this.scene.remove(ring.mesh);
                    this.rings.splice(index, 1);

                    // Add new ring ahead
                    const allZPositions = [
                        ...this.rings.map(r => r.position.z),
                        ...this.walls.map(w => w.position.z)
                    ];
                    const furthestZ = allZPositions.length > 0 ? Math.min(...allZPositions) - 20 : this.ball.position.z - 40;
                    this.rings.push(new Ring(this.scene, furthestZ, this.colors));
                }
            });

            const currentTime = Date.now();
            if (this.gameStarted && !this.gameOver && this.availableColors.length > 1 && !this.chaser && (currentTime - this.lastChaserTime) > 10000) {
                this.chaser = this.createChaser();
                this.lastChaserTime = currentTime;
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    startGame() {
        // Hide instructions and game over screens
        document.getElementById('instructions').style.display = 'none';
        document.getElementById('gameOver').style.display = 'none';

        // Reset game state
        this.gameStarted = true;
        this.gameOver = false;
        this.score = 0;
        this.ballSpeed = 0;
        this.selectedColorIndex = 0; // Reset selected color
        this.obstaclesPassed = 0;
        this.availableColors = [this.colors[0]];
        if (this.chaser) {
            this.scene.remove(this.chaser);
            this.chaser = null;
        }

        // Reset ball position and color
        this.ball.position.set(0, 0, 0);
        this.changeBallColor();
        this.ball.visible = true; // Make ball visible again after destruction effect

        // Reset camera
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(this.ball.position);

        // Create fresh rings and walls
        this.createRings();

        // Update UI
        this.updateAvailableColorsUI();
    }

    restartGame() {
        this.startGame();
    }

    endGame() {
        this.gameOver = true;
        this.ballSpeed = 0;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').style.display = 'block';
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onDragStart(event) {
        this.dragStartX = event.clientX || event.touches[0].clientX;
        this.dragStartY = event.clientY || event.touches[0].clientY;
    }

    onDragMove(event) {
        if (this.dragStartX === null) return;

        const currentX = event.clientX || event.touches[0].clientX;
        const currentY = event.clientY || event.touches[0].clientY;

        const deltaX = currentX - this.dragStartX;
        const deltaY = currentY - this.dragStartY;

        if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY < -20) { // Upward drag
            this.ballSpeed = Math.min(this.ballSpeed + 0.05, this.maxSpeed);
            this.dragUpIndicator.style.opacity = 1;
        } else {
            this.dragUpIndicator.style.opacity = 0;
        }

        if (Math.abs(deltaX) > Math.abs(deltaY)) { // Horizontal drag
            if (deltaX < -20) { // Left drag
                this.dragLeftIndicator.style.opacity = 1;
            } else if (deltaX > 20) { // Right drag
                this.dragRightIndicator.style.opacity = 1;
            }
        } else {
            this.dragLeftIndicator.style.opacity = 0;
            this.dragRightIndicator.style.opacity = 0;
        }
    }

    onDragEnd(event) {
        const deltaX = (event.clientX || event.changedTouches[0].clientX) - this.dragStartX;
        const deltaY = (event.clientY || event.changedTouches[0].clientY) - this.dragStartY;

        if (Math.abs(deltaX) > Math.abs(deltaY)) { // Horizontal drag
            if (deltaX < -20) { // Left drag
                this.changeBallColor();
            } else if (deltaX > 20) { // Right drag
                this.changeBallColor();
            }
        }

        this.dragStartX = null;
        this.dragStartY = null;
        this.dragUpIndicator.style.opacity = 0;
        this.dragLeftIndicator.style.opacity = 0;
        this.dragRightIndicator.style.opacity = 0;
    }
}