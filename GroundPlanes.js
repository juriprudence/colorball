export default class GroundPlanes {
    constructor(scene) {
        this.scene = scene;
        this.planes = [];
        this.create();
    }

    create() {
        // Remove old planes if any
        this.planes.forEach(plane => this.scene.remove(plane));
        this.planes = [];
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
            this.planes.push(plane);
        }
    }

    update(ballPosition) {
        this.planes.forEach(plane => {
            const planeZ = plane.position.z;
            const ballZ = ballPosition.z;
            const planeHeight = 60;
            const numPlanes = 5;

            // If plane is too far behind the ball, move it to the front
            if (ballZ < planeZ - planeHeight / 2) {
                plane.position.z -= numPlanes * planeHeight;
            }
        });
    }
}