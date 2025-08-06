class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.ball = null;
        this.backgroundSphere = null;
        this.groundPlanes = null;
        this.rings = [];
        this.walls = [];
        this.groundObstacles = [];
        this.floorTunnels = [];
        this.chaser = null;
        this.particleSystem = null;
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
        this.colors = [0xff0000, 0x00ff00, 0xffff00, 0x0000ff]; // red, green, yellow, blue
        this.availableColors = [this.colors[0]];
        this.colorNames = ['red', 'green', 'yellow', 'blue'];
        
        // Fixed spawning system with proper level organization
        this.levelSpacing = 40; // Distance between levels
        this.nextLevelZ = -50; // Start spawning ahead of ball
        this.spawnDistance = 120; // How far ahead to maintain obstacles
        this.despawnDistance = 30; // How far behind to remove obstacles
        this.levelCounter = 0; // Track which level type to spawn

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
        this.groundPlanes = new GroundPlanes(this.scene);

        // Create ball
        this.createBall();

        // Create particle system
        this.particleSystem = new ParticleSystem(this.scene);

        // Create initial obstacles
        this.spawnInitialObstacles();

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
        this.ball = new Ball(this.scene, this.ballColor, this);
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

    spawnInitialObstacles() {
        // Clear existing obstacles
        this.clearAllObstacles();
        
        // Reset spawn positions
        this.nextLevelZ = -50;
        this.levelCounter = 0;
        
        // Spawn initial set of levels
        for (let i = 0; i < 8; i++) {
            this.spawnNextLevel();
        }
    }

    clearAllObstacles() {
        // Remove all existing obstacles from scene and arrays
        this.rings.forEach(ring => {
            if (ring.mesh) this.scene.remove(ring.mesh);
        });
        this.walls.forEach(wall => {
            if (wall.mesh) this.scene.remove(wall.mesh);
        });
        this.groundObstacles.forEach(obstacle => {
            if (obstacle.mesh) this.scene.remove(obstacle.mesh);
        });
        this.floorTunnels.forEach(tunnel => {
            if (tunnel.mesh) this.scene.remove(tunnel.mesh);
        });
        
        this.rings = [];
        this.walls = [];
        this.groundObstacles = [];
        this.floorTunnels = [];
    }

    spawnNextLevel() {
        const levelType = this.levelCounter % 2; // Alternate between 0 and 1
        
        if (levelType === 0) {
            // Level 1: Ring + Wall (aerial obstacles)
            this.spawnRingAndWall(this.nextLevelZ);
        } else {
            // Level 2: Ground Obstacle + Floor Tunnel (ground obstacles)
            this.spawnGroundAndTunnel(this.nextLevelZ);
        }
        
        this.nextLevelZ -= this.levelSpacing;
        this.levelCounter++;
    }

    spawnRingAndWall(zPosition) {
        // Spawn ring at exact position
        const ring = new Ring(this.scene, zPosition, this.colors, this);
        this.rings.push(ring);
        
        // Spawn wall slightly ahead (closer to player)
        const wallZ = zPosition + 15;
        const wall = new Wall(this.scene, wallZ, this.colors);
        this.walls.push(wall);
    }

    spawnGroundAndTunnel(zPosition) {
        // Spawn ground obstacle at exact position
        const groundObstacle = new GroundObstacle(this.scene, zPosition, this.colors);
        this.groundObstacles.push(groundObstacle);
        
        // Spawn floor tunnel slightly behind
        const tunnelZ = zPosition - 15;
        const floorTunnel = new FloorTunnel(this.scene, tunnelZ, this.colors);
        this.floorTunnels.push(floorTunnel);
    }

    updateObstacles() {
        const ballZ = this.ball.position.z;
        
        // Spawn new levels ahead
        while (this.nextLevelZ > ballZ - this.spawnDistance) {
            this.spawnNextLevel();
        }
        
        // Remove obstacles that are too far behind
        this.rings = this.rings.filter(ring => {
            if (ring.position.z > ballZ + this.despawnDistance) {
                if (ring.mesh) this.scene.remove(ring.mesh);
                return false;
            }
            return true;
        });

        this.walls = this.walls.filter(wall => {
            if (wall.position.z > ballZ + this.despawnDistance) {
                if (wall.mesh) this.scene.remove(wall.mesh);
                return false;
            }
            return true;
        });

        this.groundObstacles = this.groundObstacles.filter(obstacle => {
            if (obstacle.position.z > ballZ + this.despawnDistance) {
                if (obstacle.mesh) this.scene.remove(obstacle.mesh);
                return false;
            }
            return true;
        });

        this.floorTunnels = this.floorTunnels.filter(tunnel => {
            if (tunnel.position.z > ballZ + this.despawnDistance) {
                if (tunnel.mesh) this.scene.remove(tunnel.mesh);
                return false;
            }
            return true;
        });
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

    checkCollisions() {
        const ballPosition = this.ball.position;

        // Check ring collisions
        this.rings.forEach((ring, ringIndex) => {
            if (!ring.game) {
                ring.game = this;
            }
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
                    ring.destroy();
                    this.particleSystem.createExplosion(ring.position, this.ballColor, 20);
                    this.score += 10;
                    this.obstaclesPassed++;
                    this.updateAvailableColors();
                    this.changeBallColor();
                    this.updateScore();
                    this.maxSpeed = Math.min(this.maxSpeed + 0.02, 1.2);
                } else {
                    ring.hasPassed = true;
                    this.particleSystem.createExplosion(this.ball.position, 0xffffff, 50);
                    this.ball.destroy();
                }
            } else if (distance >= 5 || Math.abs(ballPosition.z - ringPosition.z) >= 1) {
                ring.hasPassed = false;
            }
        });
    }

    checkGroundObstacleCollisions() {
        const ballPosition = this.ball.position;

        this.groundObstacles.forEach((obstacle, obstacleIndex) => {
            const obstaclePosition = obstacle.position;
            // Check if ball is at the same z-position as the obstacle
            if (Math.abs(ballPosition.z - obstaclePosition.z) < 2) {
                // Check if ball is within the obstacle's boundaries (12x8 rectangle)
                if (Math.abs(ballPosition.x - obstaclePosition.x) < 6 && Math.abs(ballPosition.y - 0.5) < 1.5) {
                    // Check if colors match
                    if (this.ballColor === this.colors[obstacle.currentColorIndex]) {
                        if (!obstacle.hasPassed) {
                            obstacle.hasPassed = true;
                            obstacle.destroy();
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
                            this.particleSystem.createExplosion(this.ball.position, 0xffffff, 50);
                            this.ball.destroy();
                        }
                    }
                }
            }
        });
    }

    checkFloorTunnelCollisions() {
        const ballPosition = this.ball.position;
        this.floorTunnels.forEach((tunnel, index) => {
            const tunnelPosition = tunnel.position;
            const tunnelLength = 12;
            const tunnelWidth = 6;
            const tunnelHeight = 4;

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
                            tunnel.destroy();
                            this.particleSystem.createExplosion(tunnel.position, this.ballColor, 30);
                            this.score += 25;
                            this.updateScore();
                            this.obstaclesPassed++;
                            this.updateAvailableColors();
                            this.changeBallColor();
                        }
                    } else {
                        if (!tunnel.hasPassed) {
                            tunnel.hasPassed = true;
                            this.particleSystem.createExplosion(this.ball.position, 0xffffff, 50);
                            this.ball.destroy();
                        }
                    }
                } else {
                    // Ball is in the tunnel zone but not in the safe area
                    if (!tunnel.hasPassed && 
                        ballPosition.x > tunnelPosition.x - tunnelWidth / 2 - 2 &&
                        ballPosition.x < tunnelPosition.x + tunnelWidth / 2 + 2) {
                        tunnel.hasPassed = true;
                        this.particleSystem.createExplosion(this.ball.position, 0xffffff, 50);
                        this.ball.destroy();
                    }
                }
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
                        this.ballColor = this.availableColors[this.selectedColorIndex];
                        this.ball.color = this.ballColor;
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
                this.particleSystem.createExplosion(this.ball.position, 0xffffff, 50);
                this.ball.destroy();
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
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = this.score;
        }
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

            // Update obstacle spawning and removal
            this.updateObstacles();

            // Update particle system
            if (this.particleSystem) {
                this.particleSystem.update();
            }
 
             // Update ground planes
            if (this.groundPlanes && this.groundPlanes.update) {
                this.groundPlanes.update(this.ball.position);
            }

            // Rotate rings
            this.rings.forEach(ring => {
                if (ring.mesh && ring.mesh.rotationSpeed) {
                    ring.rotation.z += ring.mesh.rotationSpeed;
                }
            });

            // Rotate wall colors (slower)
            this.walls.forEach(wall => {
                if (wall.children) {
                    wall.children.forEach((segment, index) => {
                        // Calculate new color index based on rotation
                        const time = Date.now() * 0.001;
                        const colorOffset = Math.floor(time * 1.2) % 4; // Adjusted speed
                        const newColorIndex = (segment.originalColorIndex + colorOffset) % 4;
                        if (segment.material && segment.material.color) {
                            segment.material.color.setHex(this.colors[newColorIndex]);
                            segment.material.emissive.setHex(this.colors[newColorIndex]);
                            segment.currentColorIndex = newColorIndex;
                        }
                    });
                }
            });

            if (this.chaser) {
                this.chaser.position.z -= 0.1;
            }

            // Animate ground obstacles color changes
            this.groundObstacles.forEach(obstacle => {
                // Change color periodically
                const time = Date.now() * 0.001;
                // Change color every 2 seconds
                const newColorIndex = Math.floor(time * 0.5) % 4;
                if (newColorIndex !== obstacle.currentColorIndex) {
                    obstacle.currentColorIndex = newColorIndex;
                    if (obstacle.children && obstacle.children[0] && obstacle.children[0].material) {
                        obstacle.children[0].material.color.setHex(this.colors[obstacle.currentColorIndex]);
                        obstacle.children[0].material.emissive.setHex(this.colors[obstacle.currentColorIndex]);
                    }
                }
            });

            // Animate floor tunnel color changes
            this.floorTunnels.forEach(tunnel => {
                tunnel.updateColor();
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
            if (Wall && Wall.checkCollisions) {
                Wall.checkCollisions(this);
            }
            this.checkGroundObstacleCollisions();
            this.checkFloorTunnelCollisions();
            this.checkChaserCollision();

            // Spawn chaser periodically
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
        const instructionsEl = document.getElementById('instructions');
        const gameOverEl = document.getElementById('gameOver');
        if (instructionsEl) instructionsEl.style.display = 'none';
        if (gameOverEl) gameOverEl.style.display = 'none';

        // Reset game state
        this.gameStarted = true;
        this.gameOver = false;
        this.score = 0;
        this.ballSpeed = 0;
        this.selectedColorIndex = 0; // Reset selected color
        this.obstaclesPassed = 0;
        this.availableColors = [this.colors[0]];
        this.lastChaserTime = 0;
        
        if (this.chaser) {
            this.scene.remove(this.chaser);
            this.chaser = null;
        }

        // Reset ball position and color
        this.ball.position.set(0, 0, 0);
        this.ballColor = this.availableColors[this.selectedColorIndex];
        this.ball.color = this.ballColor;
        this.ball.visible = true; // Make ball visible again after destruction effect

        // Reset camera
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(this.ball.position);

        // Create fresh obstacles
        this.spawnInitialObstacles();

        // Update UI
        this.updateAvailableColorsUI();
    }

    restartGame() {
        // Hide game over screen
        const gameOverEl = document.getElementById('gameOver');
        if (gameOverEl) gameOverEl.style.display = 'none';

        // Reset game state
        this.score = 0;
        this.ballSpeed = 0;
        this.maxSpeed = 0.3;
        this.obstaclesPassed = 0;
        this.gameOver = false;
        this.gameStarted = true;
        this.availableColors = [this.colors[0]];
        this.selectedColorIndex = 0;
        this.lastChaserTime = 0;

        // Remove old chaser if any
        if (this.chaser) {
            this.scene.remove(this.chaser);
            this.chaser = null;
        }

        // Reset ball
        if (this.ball && this.ball.mesh) {
            this.scene.remove(this.ball.mesh);
        }
        this.createBall();

        // Reset obstacles
        this.spawnInitialObstacles();

        // Reset ground planes
        if (this.groundPlanes && this.groundPlanes.create) {
            this.groundPlanes.create();
        }

        // Update UI
        this.updateScore();
        this.updateAvailableColorsUI();
    }

    endGame() {
        this.gameOver = true;
        this.ballSpeed = 0;
        const finalScoreEl = document.getElementById('finalScore');
        const gameOverEl = document.getElementById('gameOver');
        if (finalScoreEl) finalScoreEl.textContent = this.score;
        if (gameOverEl) gameOverEl.style.display = 'block';
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onDragStart(event) {
        this.dragStartX = event.clientX || (event.touches && event.touches[0].clientX);
        this.dragStartY = event.clientY || (event.touches && event.touches[0].clientY);
    }

    onDragMove(event) {
        if (this.dragStartX === null || this.dragStartX === undefined) return;

        const currentX = event.clientX || (event.touches && event.touches[0].clientX);
        const currentY = event.clientY || (event.touches && event.touches[0].clientY);

        const deltaX = currentX - this.dragStartX;
        const deltaY = currentY - this.dragStartY;

        if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY < -20) { // Upward drag
            this.ballSpeed = Math.min(this.ballSpeed + 0.05, this.maxSpeed);
            if (this.dragUpIndicator) this.dragUpIndicator.style.opacity = 1;
        } else {
            if (this.dragUpIndicator) this.dragUpIndicator.style.opacity = 0;
        }

        if (Math.abs(deltaX) > Math.abs(deltaY)) { // Horizontal drag
            if (deltaX < -20) { // Left drag
                if (this.dragLeftIndicator) this.dragLeftIndicator.style.opacity = 1;
            } else if (deltaX > 20) { // Right drag
                if (this.dragRightIndicator) this.dragRightIndicator.style.opacity = 1;
            }
        } else {
            if (this.dragLeftIndicator) this.dragLeftIndicator.style.opacity = 0;
            if (this.dragRightIndicator) this.dragRightIndicator.style.opacity = 0;
        }
    }

    onDragEnd(event) {
        if (this.dragStartX === null || this.dragStartX === undefined) return;

        const currentX = event.clientX || (event.changedTouches && event.changedTouches[0].clientX);
        const currentY = event.clientY || (event.changedTouches && event.changedTouches[0].clientY);
        
        const deltaX = currentX - this.dragStartX;
        const deltaY = currentY - this.dragStartY;

        if (Math.abs(deltaX) > Math.abs(deltaY)) { // Horizontal drag
            if (Math.abs(deltaX) > 20) { // Minimum drag distance
                this.changeBallColor();
            }
        }

        this.dragStartX = null;
        this.dragStartY = null;
        if (this.dragUpIndicator) this.dragUpIndicator.style.opacity = 0;
        if (this.dragLeftIndicator) this.dragLeftIndicator.style.opacity = 0;
        if (this.dragRightIndicator) this.dragRightIndicator.style.opacity = 0;
    }
}