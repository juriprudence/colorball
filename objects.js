// Object creation functions

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
    // Clear existing rings and walls
    rings.forEach(ring => scene.remove(ring));
    walls.forEach(wall => scene.remove(wall));
    rings = [];
    walls = [];
    
    // Create obstacles further ahead of the ball's starting position
    for (let i = 0; i < 10; i++) {
        createRing(i * 20 + 30); // Start rings further ahead (z = 30, 50, 70, ...)
        // Create walls at alternating positions
        if (i % 2 === 1) {
            createWall(i * 20 + 40); // Start walls further ahead (z = 60, 100, ...)
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