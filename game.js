// Game variables
let scene, camera, renderer, ball, backgroundSphere, groundPlanes = [], rings = [], walls = [], groundObstacles = [], chaser = null, gameStarted = false, gameOver = false;
let ballColor = 0xff0000, score = 0, ballSpeed = 0, maxSpeed = 0.3, obstaclesPassed = 0;
let cameraOffset = new THREE.Vector3(0, 5, 10);
let stars = [];
let selectedColorIndex = 0; // Track the currently selected color
let lastChaserTime = 0;

// Color palette
const colors = [0xff0000, 0x00ff00, 0xffff00, 0x0000FF]; // red, green, yellow, dark red
let availableColors = [colors[0]];
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
                // Use destruction effect instead of directly removing
                destroyRing(ring);
                // Remove ring after a short delay to allow animation to play
                setTimeout(() => {
                    scene.remove(ring);
                    const ringIndex = rings.indexOf(ring);
                    if (ringIndex !== -1) {
                        rings.splice(ringIndex, 1);
                        const furthestZ = Math.min(...rings.map(r => r.position.z)) - 20;
                        createRing(furthestZ);
                    }
                }, 500); // Delay matches animation duration
                score += 10;
                obstaclesPassed++;
                updateAvailableColors();
                changeBallColor();
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
                        // Use destruction effect instead of directly removing
                        destroyWall(wall);
                        // Remove wall after a short delay to allow animation to play
                        setTimeout(() => {
                            const wallIndex = walls.indexOf(wall);
                            if (wallIndex !== -1) {
                                scene.remove(wall);
                                walls.splice(wallIndex, 1);
                            }
                        }, 600); // Delay matches animation duration
                        score += 15;
                        updateScore();
                        obstaclesPassed++;
                        updateAvailableColors();
                        changeBallColor();
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
                        obstaclesPassed++;
                        updateAvailableColors();
                        changeBallColor();
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

function updateAvailableColors() {
    const newColorIndex = Math.floor(obstaclesPassed / 2);
    if (newColorIndex < colors.length && !availableColors.includes(colors[newColorIndex])) {
        availableColors.push(colors[newColorIndex]);
        updateAvailableColorsUI();
    }
}

function updateAvailableColorsUI() {
    const uiElement = document.getElementById('ui');
    let colorElements = '';
    if (availableColors.length > 1) {
        colorElements = '<div>Available Colors:</div>';
        availableColors.forEach((color, index) => {
            const isSelected = index === selectedColorIndex;
            const borderStyle = isSelected ? 'border: 2px solid yellow;' : 'border: 2px solid white;';
            colorElements += `<div class="color-option" style="background-color: #${color.toString(16).padStart(6, '0')}; ${borderStyle}"></div>`;
        });
    }
    uiElement.innerHTML = `<div>Score: <span id="score">${score}</span></div>${colorElements}`;
}

function checkChaserCollision() {
    if (!chaser) return;

    const distance = ball.position.distanceTo(chaser.position);
    if (distance < 2.5) {
        const chaserColorIndex = availableColors.indexOf(chaser.color);

        // If the player has the chaser's color in their palette
        if (chaserColorIndex !== -1) {
            // If it's not the last color, remove it
            if (availableColors.length > 1) {
                const removedColor = availableColors.splice(chaserColorIndex, 1)[0];
                
                // If the ball's current color was the one that was removed,
                // we must change the ball's color to a new one.
                if (ballColor === removedColor) {
                    // Reset selected index to a valid one before changing color
                    if (selectedColorIndex >= availableColors.length) {
                        selectedColorIndex = 0; // default to the first color
                    }
                    ballColor = availableColors[selectedColorIndex];
                    ball.material.color.setHex(ballColor);
                    ball.material.emissive.setHex(ballColor);
                }
            }
            
            // Player survives
            scene.remove(chaser);
            chaser = null;
            score += 50;
            updateScore();
            updateAvailableColorsUI();

        } else {
            // Player does not have the color, game over
            destroyBall();
        }
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

        if (chaser) {
            chaser.position.z -= 0.1;
        }
        
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
        checkGroundObstacleCollisions();
        checkChaserCollision();

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

        const currentTime = Date.now();
        if (gameStarted && !gameOver && availableColors.length > 1 && !chaser && (currentTime - lastChaserTime) > 10000) {
            chaser = createChaser();
            lastChaserTime = currentTime;
        }
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
    selectedColorIndex = 0; // Reset selected color
    obstaclesPassed = 0;
    availableColors = [colors[0]];
    if (chaser) {
        scene.remove(chaser);
        chaser = null;
    }
    
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
    updateAvailableColorsUI();
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
window.updateAvailableColorsUI = updateAvailableColorsUI;

// Initialize the game
init();