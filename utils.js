// Utility functions

// Drag control variables
let isDragging = false;
let dragStartY = 0;
let dragDistance = 0;
let dragSpeed = 0;

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
    
    // Get the starting Y position of the drag
    if (event.touches) {
        dragStartY = event.touches[0].clientY;
    } else {
        dragStartY = event.clientY;
    }
    
    // Reset drag distance
    dragDistance = 0;
}

function onDragMove(event) {
    if (!isDragging || !gameStarted || gameOver) return;
    
    event.preventDefault();
    
    // Calculate the drag distance
    let currentY;
    if (event.touches) {
        currentY = event.touches[0].clientY;
    } else {
        currentY = event.clientY;
    }
    
    // Calculate drag distance (negative because dragging up should increase speed)
    dragDistance = dragStartY - currentY;
    
    // Update drag speed based on drag distance
    // Scale the drag distance to a reasonable speed value
    dragSpeed = Math.min(Math.max(dragDistance * 0.01, 0), maxSpeed);
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