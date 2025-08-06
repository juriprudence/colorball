const THREE = window.THREE;

import Ball from './Ball.js';
import Ring from './Ring.js';
import Wall from './Wall.js';
import GroundObstacle from './GroundObstacle.js';

export default class GameController {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
        
        // Initialize colors array first
        this.colors = [0xff0000, 0x00ff00, 0xffff00, 0x0000FF];
        this.colorNames = ['red', 'green', 'yellow', 'blue'];
        
        this.availableColors = [this.colors[0]];
        this.selectedColorIndex = 0;
        
        this.ball = null;
        this.rings = [];
        this.walls = [];
        this.groundObstacles = [];
        this.floorTunnels = [];
        this.chaser = null;
        this.groundPlanes = [];
        this.stars = [];
        
        this.gameStarted = false;
        this.gameOver = false;
        this.score = 0;
        this.ballSpeed = 0;
        this.maxSpeed = 0.3;
        this.obstaclesPassed = 0;
        this.lastChaserTime = 0;
        
        this.cameraOffset = new THREE.Vector3(0, 5, 10);
        this.backgroundSphere = null;
        
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.isDragging = false;
        
        this.init();
    }
    
    init() {
        this.scene.fog = new THREE.Fog(0x000011, 50, 200);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000011);
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
        
        this.createStarfield();
        this.createGroundPlanes();
        this.ball = new Ball(this.scene);
        this.createRings();
        this.createBackgroundSphere();
        
        // Event listeners
        const canvas = document.getElementById('canvas');
        canvas.addEventListener('mousedown', this.onDragStart.bind(this));
        canvas.addEventListener('mousemove', this.onDragMove.bind(this));
        canvas.addEventListener('mouseup', this.onDragEnd.bind(this));
        canvas.addEventListener('mouseleave', this.onDragEnd.bind(this));
        canvas.addEventListener('touchstart', this.onDragStart.bind(this));
        canvas.addEventListener('touchmove', this.onDragMove.bind(this));
        canvas.addEventListener('touchend', this.onDragEnd.bind(this));
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        this.animate();
    }

    startGame() {
        console.log("Start game initiated");
        
        // Hide UI elements
        const instructions = document.getElementById('instructions');
        const gameOver = document.getElementById('gameOver');
        if (instructions) instructions.style.display = 'none';
        if (gameOver) gameOver.style.display = 'none';
        
        // Reset game state
        this.gameStarted = true;
        this.gameOver = false;
        this.score = 0;
        this.ballSpeed = 0;
        this.selectedColorIndex = 0;
        this.obstaclesPassed = 0;
        this.availableColors = [this.colors[0]];
        
        // Reset ball
        this.ball.reset();
        this.ball.changeColor(this.colors[0]);
        
        // Reset camera
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(this.ball.mesh.position);
        
        // Clear existing obstacles
        this.clearAllObstacles();
        
        // Create new obstacles
        this.createRings();
        
        // Update UI
        this.updateAvailableColorsUI();
        
        console.log("Game started successfully");
    }
    
    clearAllObstacles() {
        this.rings.forEach(ring => ring.removeFromScene());
        this.walls.forEach(wall => wall.removeFromScene());
        this.groundObstacles.forEach(obs => obs.removeFromScene());
        
        this.rings = [];
        this.walls = [];
        this.groundObstacles = [];
    }

    // ... (rest of class remains unchanged)
}