// Utility functions

// Drag control variables
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragDistanceX = 0;
let dragDistanceY = 0;
let dragSpeed = 0;
let lastColorChangeTime = 0;
const colorChangeCooldown = 300; // 300ms cooldown between color changes

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Drag event handlers
function onDragStart(event) {
    if (!gameStarted || gameOver) return;
    
    event.preventDefault();
    isDragging = true;
    
    // Get the starting positions of the drag
    if (event.touches) {
        dragStartX = event.touches[0].clientX;
        dragStartY = event.touches[0].clientY;
    } else {
        dragStartX = event.clientX;
        dragStartY = event.clientY;
    }
    
    // Reset drag distances
    dragDistanceX = 0;
    dragDistanceY = 0;
}

function onDragMove(event) {
    if (!isDragging || !gameStarted || gameOver) return;
    
    event.preventDefault();
    
    // Get current positions
    let currentX, currentY;
    if (event.touches) {
        currentX = event.touches[0].clientX;
        currentY = event.touches[0].clientY;
    } else {
        currentX = event.clientX;
        currentY = event.clientY;
    }
    
    // Calculate drag distances
    dragDistanceX = currentX - dragStartX;
    dragDistanceY = dragStartY - currentY; // Negative because dragging up should increase speed
    
    // Change ball color if dragging left (more than 30 pixels)
    const currentTime = Date.now();
    if (dragDistanceX < -30 && (currentTime - lastColorChangeTime) > colorChangeCooldown) {
        changeBallColor();
        lastColorChangeTime = currentTime;
    }
    
    // Update drag speed based on vertical drag distance
    // Scale the drag distance to a reasonable speed value
    dragSpeed = Math.min(Math.max(dragDistanceY * 0.01, 0), maxSpeed);
}

function onDragEnd(event) {
    if (!isDragging) return;
    
    event.preventDefault();
    isDragging = false;
    
    // Set the ball speed based on the drag
    if (gameStarted && !gameOver) {
        ballSpeed = dragSpeed;
    }
    
    // Reset drag speed
    dragSpeed = 0;
}

function changeBallColor() {
    const randomIndex = Math.floor(Math.random() * colors.length);
    ballColor = colors[randomIndex];
    ball.material.color.setHex(ballColor);
    ball.material.emissive.setHex(ballColor);
}