// Game variables
let scene, camera, renderer, ball, backgroundSphere, groundPlanes = [], rings = [], walls = [], gameStarted = false, gameOver = false;
let ballColor = 0xff0000, score = 0, ballSpeed = 0, maxSpeed = 0.3;
let cameraOffset = new THREE.Vector3(0, 5, 10);
let stars = [];

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
function createGroundPlanes() {
    // Remove old planes if any
    groundPlanes.forEach(plane => scene.remove(plane));
    groundPlanes = [];
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
        scene.add(plane);
        groundPlanes.push(plane);
    }
}
    
    // Event listeners
    document.addEventListener('click', onInteraction);
    document.addEventListener('touchstart', onInteraction);
    window.addEventListener('resize', onWindowResize);
    
    // Create background sphere
    createBackgroundSphere();
    
    // Start render loop
    animate();
}

function createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 2,
        sizeAttenuation: false
    });
    
    const starVertices = [];
    for (let i = 0; i < 1000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starVertices.push(x, y, z);
    }
    
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);
    stars.push(starField);
}

function createBall() {
    const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const ballMaterial = new THREE.MeshLambertMaterial({ 
        color: ballColor,
        emissive: ballColor,
        emissiveIntensity: 0.2
    });
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.set(0, 0, 0);
    ball.castShadow = true;
    scene.add(ball);
}

function createBackgroundSphere() {
    const sphereGeometry = new THREE.SphereGeometry(50, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x000022,
        transparent: true,
        opacity: 0.05,
        side: THREE.BackSide
    });
    backgroundSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(backgroundSphere);
}

function createRings() {
    // Clear existing rings and walls
    rings.forEach(ring => scene.remove(ring));
    walls.forEach(wall => scene.remove(wall));
    rings = [];
    walls = [];
    
    for (let i = 0; i < 10; i++) {
        createRing(i * 20 - 40);
        // Create walls at alternating positions
        if (i % 2 === 1) {
            createWall(i * 20 - 30);
        }
    }
}

function createRing(zPosition) {
    const ringGroup = new THREE.Group();
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
        
        ringGroup.add(segment);
    }
    
    ringGroup.position.set(2, 3, zPosition); // Move right by 2 units, up by 3 units, and keep z position
    ringGroup.rotationSpeed = (Math.random() - 0.5) * 0.08; // Increased speed
    ringGroup.hasPassed = false; // Initialize hasPassed property
    
    scene.add(ringGroup);
    rings.push(ringGroup);
}

function createWall(zPosition) {
    const wallGroup = new THREE.Group();
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
        wallGroup.add(segment);
    }
    
    wallGroup.position.z = zPosition;
    wallGroup.position.x = 0; // Centered in the ball's path
    wallGroup.rotationSpeed = 0.01; // Slower rotation speed for color movement (was 0.03)
    wallGroup.hasPassed = false; // Track if player has passed this wall
    
    scene.add(wallGroup);
    walls.push(wallGroup);
}

function onInteraction(event) {
    event.preventDefault();
    
    if (!gameStarted) return;
    if (gameOver) return;
    
    // Accelerate ball forward (faster)
    ballSpeed = Math.min(ballSpeed + 0.12, maxSpeed);
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
    
    // Reset ball position and color
    ball.position.set(0, 0, 0);
    changeBallColor();
    
    // Reset camera
    camera.position.set(0, 5, 10);
    camera.lookAt(ball.position);
    
    // Create fresh rings and walls
    createRings();
    
    updateScore();
}

function restartGame() {
    startGame();
}

function changeBallColor() {
    const randomIndex = Math.floor(Math.random() * colors.length);
    ballColor = colors[randomIndex];
    ball.material.color.setHex(ballColor);
    ball.material.emissive.setHex(ballColor);
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
                changeBallColor();
                updateScore();
                maxSpeed = Math.min(maxSpeed + 0.02, 1.2);
            } else {
                ring.hasPassed = true;
                endGame();
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
                        changeBallColor();
                        // Hide the wall after passing
                        scene.remove(wall);
                        walls.splice(wallIndex, 1);
                    }
                } else {
                    if (!wall.hasPassed) {
                        wall.hasPassed = true;
                        endGame();
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

function endGame() {
    gameOver = true;
    ballSpeed = 0;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').style.display = 'block';
}

function updateScore() {
    document.getElementById('score').textContent = score;
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
    }
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Make functions globally accessible
window.startGame = startGame;
window.restartGame = restartGame;

// Initialize the game
init();