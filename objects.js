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

function createRings() {
    // Clear existing rings, walls, pickups, and ground obstacles
    rings.forEach(ring => scene.remove(ring));
    walls.forEach(wall => scene.remove(wall));
    pickups.forEach(pickup => scene.remove(pickup));
    groundObstacles.forEach(obstacle => scene.remove(obstacle));
    rings = [];
    walls = [];
    pickups = [];
    groundObstacles = [];
    
    // Always create a pickup at the start (z=0.5)
    createPickup(0.5);
    // Mark that colors are not available until pickup is collected
    if (typeof window.colorsAvailable === 'undefined') window.colorsAvailable = false;
    // Create obstacles further ahead of the ball's starting position
    for (let i = 0; i < 10; i++) {
        createRing(i * 20 + 30); // Start rings further ahead (z = 30, 50, 70, ...)
        // Create walls at alternating positions
        if (i % 2 === 1) {
            createWall(i * 20 + 40); // Start walls further ahead (z = 60, 100, ...)
        }
        // Create ground obstacles at regular intervals
        if (i % 4 === 0) {
            const obstacle = createGroundObstacle(i * 20 + 32); // Position obstacles between rings and walls
            groundObstacles.push(obstacle);
        }
        // Create pickups at regular intervals
        if (i % 3 === 0) {
            createPickup(i * 20 + 35); // Position pickups between rings and walls
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

function createPickup(zPosition) {
    const pickupGeometry = new THREE.SphereGeometry(0.8, 32, 32); // Made larger for visibility
    
    // Fixed material - use proper color for emissive
    const colorIndex = Math.floor(Math.random() * colors.length);
    const pickupMaterial = new THREE.MeshLambertMaterial({
        color: colors[colorIndex],
        emissive: colors[colorIndex], // Use the same color as emissive instead of white
        emissiveIntensity: 0.3 // Reduced intensity so color is visible
    });
    const pickup = new THREE.Mesh(pickupGeometry, pickupMaterial);
    
    // Position the pickup higher so it's more visible
    pickup.position.set(0, 1, zPosition); // Raised from y=0 to y=1
    pickup.castShadow = true;
    pickup.receiveShadow = true;
    
    // Add animation data
    pickup.userData = {
        originalScale: 1,
        pulseSpeed: 0.05,
        rotationSpeed: 0.02
    };
    
    scene.add(pickup);
    pickups.push(pickup);
    
    return pickup;
}

function createGroundObstacle(zPosition) {
    // Create a rectangle obstacle on the ground
    const obstacleWidth = 8;
    const obstacleHeight = 0.5;
    const obstacleDepth = 8;
    
    // Create a group for the obstacle
    const obstacleGroup = new THREE.Group();
    
    // Create the base rectangle
    const geometry = new THREE.BoxGeometry(obstacleWidth, obstacleHeight, obstacleDepth);
    const material = new THREE.MeshLambertMaterial({
        color: colors[0], // Start with the first color
        emissive: colors[0],
        emissiveIntensity: 0.2
    });
    const obstacle = new THREE.Mesh(geometry, material);
    
    // Position the obstacle on the ground (y = -0.5 to sit on the ground plane)
    obstacle.position.set(0, -0.25, zPosition);
    obstacle.castShadow = true;
    obstacle.receiveShadow = true;
    
    // Add the obstacle to the group
    obstacleGroup.add(obstacle);
    
    // Add properties to track the obstacle state
    obstacleGroup.position.z = zPosition;
    obstacleGroup.currentColorIndex = 0; // Track current color index
    obstacleGroup.hasPassed = false; // Track if player has passed this obstacle
    obstacleGroup.isChangingColor = false; // Track if color is currently changing
    
    // Add the group to the scene
    scene.add(obstacleGroup);
    
    return obstacleGroup;
}

// Animation function for pickups to make them more visible
function animatePickups() {
    pickups.forEach(pickup => {
        if (pickup.userData) {
            // Pulse the pickup size
            const time = Date.now() * pickup.userData.pulseSpeed;
            const scale = pickup.userData.originalScale + Math.sin(time) * 0.2;
            pickup.scale.set(scale, scale, scale);
            
            // Rotate the pickup for extra visibility
            pickup.rotation.y += pickup.userData.rotationSpeed;
            pickup.rotation.x += pickup.userData.rotationSpeed * 0.5;
        }
    });
}

// Make functions globally accessible
window.createGroundObstacle = createGroundObstacle;
// Ball destruction effect function
function destroyBall() {
    // Create particle explosion effect
    const particleCount = 50;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    
    // Initialize particle positions and colors
    for (let i = 0; i < particleCount; i++) {
        // Position particles at the ball's location with some random spread
        particlePositions[i * 3] = ball.position.x + (Math.random() - 0.5) * 2;
        particlePositions[i * 3 + 1] = ball.position.y + (Math.random() - 0.5) * 2;
        particlePositions[i * 3 + 2] = ball.position.z + (Math.random() - 0.5) * 2;
        
        // Set particle colors to match the ball's color with some variation
        const colorVariation = 0.2;
        const r = ((ballColor >> 16) & 0xff) / 255 + (Math.random() - 0.5) * colorVariation;
        const g = ((ballColor >> 8) & 0xff) / 255 + (Math.random() - 0.5) * colorVariation;
        const b = (ballColor & 0xff) / 255 + (Math.random() - 0.5) * colorVariation;
        
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
    scene.add(particleSystem);
    
    // Hide the ball
    ball.visible = false;
    
    // Animate particles
    const startTime = Date.now();
    const duration = 1000; // 1 second
    
    function animateParticles() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Update particle positions to move outward
        const positions = particleGeometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
            // Move particles outward from center
            const directionX = positions[i * 3] - ball.position.x;
            const directionY = positions[i * 3 + 1] - ball.position.y;
            const directionZ = positions[i * 3 + 2] - ball.position.z;
            
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
            scene.remove(particleSystem);
            endGame();
        }
    }
    
    // Start animation
    animateParticles();
}

// Make function globally accessible
window.destroyBall = destroyBall;
window.animatePickups = animatePickups;