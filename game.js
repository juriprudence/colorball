// Game variables
let scene, camera, renderer, ball, backgroundSphere, groundPlanes = [], rings = [], walls = [], pickups = [], groundObstacles = [], gameStarted = false, gameOver = false;
let ballColor = 0xff0000, score = 0, ballSpeed = 0, maxSpeed = 0.3;
let cameraOffset = new THREE.Vector3(0, 5, 10);
let stars = [];
let hasColorPickup = false; // Track if player has collected a color pickup
let selectedColorIndex = 0; // Track the currently selected color

// Color palette
const colors = [0xff0000, 0x00ff00, 0xffff00, 0x0000FF]; // red, green, yellow, dark red
const colorNames = ['red', 'green', 'yellow', 'bleu'];

// Initialize the game
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000011, 50, 200);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000011); // Dark space color
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Create starfield
    createStarfield();
    
    // Create infinite table (ground)
    createGroundPlanes();

    // Create ball
    createBall();

    // Create initial rings
    createRings();
    
    // Event listeners for drag controls
    const canvas = document.getElementById('canvas');
    canvas.addEventListener('mousedown', onDragStart);
    canvas.addEventListener('mousemove', onDragMove);
    canvas.addEventListener('mouseup', onDragEnd);
    canvas.addEventListener('mouseleave', onDragEnd);
    canvas.addEventListener('touchstart', onDragStart);
    canvas.addEventListener('touchmove', onDragMove);
    canvas.addEventListener('touchend', onDragEnd);
    window.addEventListener('resize', onWindowResize);
    
    // Create background sphere
    createBackgroundSphere();
    
    // Initialize drag indicators
    dragUpIndicator = document.getElementById('dragUpIndicator');
    dragLeftIndicator = document.getElementById('dragLeftIndicator');
    dragRightIndicator = document.getElementById('dragRightIndicator');
    
    // Start render loop
    animate();
}

function checkCollisions() {
    const ballPosition = ball.position;
    
    rings.forEach((ring, ringIndex) => {
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
            const segmentColor = colors[segmentIndex];

            if (ballColor === segmentColor) {
                ring.hasPassed = true;
                scene.remove(ring);
                rings.splice(ringIndex, 1);
                const furthestZ = Math.min(...rings.map(r => r.position.z)) - 20;
                createRing(furthestZ);
                score += 10;
                // Only change ball color automatically if player doesn't have a pickup
                if (!hasColorPickup) {
                    changeBallColor();
                }
                updateScore();
                maxSpeed = Math.min(maxSpeed + 0.02, 1.2);
            } else {
                ring.hasPassed = true;
                destroyBall();
            }
        } else if (distance >= 5 || Math.abs(ballPosition.z - ringPosition.z) >= 1) {
            ring.hasPassed = false;
        }
    });
}

function checkWallCollisions() {
    const ballPosition = ball.position;
    
    walls.forEach((wall, wallIndex) => {
        const wallPosition = wall.position;
        // Check if ball is at the same z-position as the wall
        if (Math.abs(ballPosition.z - wallPosition.z) < 1) {
            // Check if ball is passing through the wall horizontally (now wider)
            if (Math.abs(ballPosition.x - wallPosition.x) < 6) {
                // Always require the ball color to match the bottom segment (lowest y)
                const bottomSegment = wall.children[0];
                const segmentColorIndex = bottomSegment.currentColorIndex !== undefined ?
                    bottomSegment.currentColorIndex : bottomSegment.originalColorIndex;
                const segmentColor = colors[segmentColorIndex];
                // Check if colors match
                if (ballColor === segmentColor) {
                    if (!wall.hasPassed) {
                        wall.hasPassed = true;
                        score += 15;
                        updateScore();
                        // Only change ball color automatically if player doesn't have a pickup
                        if (!hasColorPickup) {
                            changeBallColor();
                        }
                        // Hide the wall after passing
                        scene.remove(wall);
                        walls.splice(wallIndex, 1);
                    }
                } else {
                    if (!wall.hasPassed) {
                        wall.hasPassed = true;
                        destroyBall();
                    }
                }
            }
        }
        
        // Remove walls that are too far behind and add new ones
        if (wall.position.z > ball.position.z + 20) {
            scene.remove(wall);
            walls.splice(wallIndex, 1);
            
            // Add new wall ahead
            const furthestZ = Math.min(
                ...rings.map(r => r.position.z),
                ...walls.map(w => w.position.z)
            ) - 20;
            if (isFinite(furthestZ) && furthestZ < ball.position.z - 40) {
                createWall(furthestZ);
            } else if (!isFinite(furthestZ)) {
                // If there are no rings or walls, create one relative to the ball
                createWall(ball.position.z - 40);
            }
        }
    });
}

function checkPickupCollisions() {
    const ballPosition = ball.position;
    
    pickups.forEach((pickup, pickupIndex) => {
        const pickupPosition = pickup.position;
        const distance = ballPosition.distanceTo(pickupPosition);
        
        // Check if ball collides with pickup
        if (distance < 1.5) {
            // Remove pickup
            scene.remove(pickup);
            pickups.splice(pickupIndex, 1);
            
            // Player now has a color pickup
            hasColorPickup = true;
            
            // Update UI to show available colors
            updateColorPickupUI();
            
            // Add score for collecting pickup
            score += 5;
            updateScore();
        }
    });
}

function checkGroundObstacleCollisions() {
    const ballPosition = ball.position;
    
    groundObstacles.forEach((obstacle, obstacleIndex) => {
        const obstaclePosition = obstacle.position;
        // Check if ball is at the same z-position as the obstacle
        if (Math.abs(ballPosition.z - obstaclePosition.z) < 1) {
            // Check if ball is within the obstacle's boundaries (8x8 square)
            if (Math.abs(ballPosition.x - obstaclePosition.x) < 4 && Math.abs(ballPosition.y - obstaclePosition.y) < 4) {
                // Check if colors match
                if (ballColor === colors[obstacle.currentColorIndex]) {
                    if (!obstacle.hasPassed) {
                        obstacle.hasPassed = true;
                        score += 20; // More points for ground obstacles
                        updateScore();
                        // Only change ball color automatically if player doesn't have a pickup
                        if (!hasColorPickup) {
                            changeBallColor();
                        }
                    }
                } else {
                    // If colors don't match, end the game
                    if (!obstacle.hasPassed) {
                        obstacle.hasPassed = true;
                        destroyBall();
                    }
                }
            }
        }
        
        // Remove obstacles that are too far behind and add new ones
        if (obstacle.position.z > ball.position.z + 20) {
            scene.remove(obstacle);
            groundObstacles.splice(obstacleIndex, 1);
            
            // Add new obstacle ahead
            const allZPositions = [
                ...rings.map(r => r.position.z),
                ...walls.map(w => w.position.z),
                ...groundObstacles.map(o => o.position.z)
            ];
            const furthestZ = allZPositions.length > 0 ? Math.min(...allZPositions) - 20 : ball.position.z - 40;
            if (isFinite(furthestZ) && furthestZ < ball.position.z - 40) {
                const newObstacle = createGroundObstacle(furthestZ);
                groundObstacles.push(newObstacle);
            } else if (!isFinite(furthestZ)) {
                // If there are no rings, walls, or obstacles, create one relative to the ball
                const newObstacle = createGroundObstacle(ball.position.z - 40);
                groundObstacles.push(newObstacle);
            }
        }
    });
}

function updateColorPickupUI() {
    const uiElement = document.getElementById('ui');
    if (hasColorPickup) {
        // Show available colors with selected color highlighted
        let colorElements = '<div>Available Colors:</div>';
        colors.forEach((color, index) => {
            const isSelected = index === selectedColorIndex;
            const borderStyle = isSelected ? 'border: 2px solid yellow;' : 'border: 2px solid white;';
            colorElements += `<div class="color-option" style="background-color: #${color.toString(16).padStart(6, '0')}; ${borderStyle}"></div>`;
        });
        uiElement.innerHTML = `<div>Score: <span id="score">${score}</span></div>${colorElements}`;
    } else {
        // Show just the score
        uiElement.innerHTML = `<div>Score: <span id="score">${score}</span></div>`;
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    if (gameStarted && !gameOver) {
        // Move ball forward only when there's input
        if (ballSpeed > 0) {
            ball.position.z -= ballSpeed;
            ballSpeed *= 0.92; // Increased friction for faster stop
            if (ballSpeed < 0.01) ballSpeed = 0; // Stop completely when very slow
        }

        // Move ground planes to simulate infinite table
        const planeHeight = 60;
        groundPlanes.forEach(plane => {
            // If plane is too far behind the ball, move it ahead
            if (plane.position.z - ball.position.z > planeHeight * 2) {
                plane.position.z -= planeHeight * groundPlanes.length;
            }
            // If plane is too far ahead, move it behind
            if (ball.position.z - plane.position.z > planeHeight * 2) {
                plane.position.z += planeHeight * groundPlanes.length;
            }
        });

        // Rotate rings
        rings.forEach(ring => {
            ring.rotation.z += ring.rotationSpeed;
        });

        // Rotate wall colors (slower)
        walls.forEach(wall => {
            wall.children.forEach((segment, index) => {
                // Calculate new color index based on rotation
                const time = Date.now() * 0.001;
                const colorOffset = Math.floor(time * 0.3) % 4; // Much slower color change
                const newColorIndex = (segment.originalColorIndex + colorOffset) % 4;
                segment.material.color.setHex(colors[newColorIndex]);
                segment.material.emissive.setHex(colors[newColorIndex]);
                segment.currentColorIndex = newColorIndex;
            });
        });

        // Rotate pickups
        pickups.forEach(pickup => {
            pickup.rotation.y += 0.05;
            
            // Add pulsing effect
            const scale = 1 + 0.1 * Math.sin(Date.now() * 0.005);
            pickup.scale.set(scale, scale, scale);
        });
        
        // Animate ground obstacles color changes
        groundObstacles.forEach(obstacle => {
            // Change color periodically
            const time = Date.now() * 0.001;
            // Change color every 2 seconds
            if (Math.floor(time * 0.5) % 4 !== obstacle.currentColorIndex) {
                obstacle.currentColorIndex = Math.floor(time * 0.5) % 4;
                obstacle.children[0].material.color.setHex(colors[obstacle.currentColorIndex]);
                obstacle.children[0].material.emissive.setHex(colors[obstacle.currentColorIndex]);
            }
        });
        
        // Update camera to follow ball
        const targetCameraPosition = ball.position.clone().add(cameraOffset);
        camera.position.lerp(targetCameraPosition, 0.1);
        camera.lookAt(ball.position);

        // Update background sphere to follow ball
        if (backgroundSphere) {
            backgroundSphere.position.copy(ball.position);
        }

        // Animate starfield
        stars.forEach(starField => {
            starField.position.z = ball.position.z;
        });

        // Check collisions
        checkCollisions();
        checkWallCollisions();
        checkPickupCollisions();
        checkGroundObstacleCollisions();

        // Remove rings that are too far behind
        rings.forEach((ring, index) => {
            if (ring.position.z > ball.position.z + 20) {
                scene.remove(ring);
                rings.splice(index, 1);

                // Add new ring ahead
                const allZPositions = [
                    ...rings.map(r => r.position.z),
                    ...walls.map(w => w.position.z)
                ];
                const furthestZ = allZPositions.length > 0 ? Math.min(...allZPositions) - 20 : ball.position.z - 40;
                createRing(furthestZ);
            }
        });
        
        // Remove pickups that are too far behind
        pickups.forEach((pickup, index) => {
            if (pickup.position.z > ball.position.z + 20) {
                scene.remove(pickup);
                pickups.splice(index, 1);
            }
        });
    }
    
    renderer.render(scene, camera);
}

function startGame() {
    // Hide instructions and game over screens
    document.getElementById('instructions').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    
    // Reset game state
    gameStarted = true;
    gameOver = false;
    score = 0;
    ballSpeed = 0;
    hasColorPickup = false; // Reset color pickup
    selectedColorIndex = 0; // Reset selected color
    
    // Reset ball position and color
    ball.position.set(0, 0, 0);
    changeBallColor();
    ball.visible = true; // Make ball visible again after destruction effect
    
    // Reset camera
    camera.position.set(0, 5, 10);
    camera.lookAt(ball.position);
    
    // Create fresh rings and walls
    createRings();
    
    // Update UI
    updateColorPickupUI();
    updateScore();
}

function restartGame() {
    startGame();
}

function endGame() {
    gameOver = true;
    ballSpeed = 0;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').style.display = 'block';
}

// Add event listeners for buttons
document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    
    if (startButton) {
        startButton.addEventListener('click', startGame);
    }
    
    if (restartButton) {
        restartButton.addEventListener('click', restartGame);
    }
});

// Make functions globally accessible
window.startGame = startGame;
window.restartGame = restartGame;

// Initialize the game
init();