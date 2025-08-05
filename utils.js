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

// Drag indicator elements
let dragUpIndicator, dragLeftIndicator, dragRightIndicator;

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Functions to show/hide drag indicators
function showDragIndicator(direction) {
    // Hide all indicators first
    hideAllDragIndicators();
    
    // Show the appropriate indicator
    switch(direction) {
        case 'up':
            if (dragUpIndicator) dragUpIndicator.classList.add('active');
            break;
        case 'left':
            if (dragLeftIndicator) dragLeftIndicator.classList.add('active');
            break;
        case 'right':
            if (dragRightIndicator) dragRightIndicator.classList.add('active');
            break;
    }
}

function hideAllDragIndicators() {
    if (dragUpIndicator) dragUpIndicator.classList.remove('active');
    if (dragLeftIndicator) dragLeftIndicator.classList.remove('active');
    if (dragRightIndicator) dragRightIndicator.classList.remove('active');
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
    
    // Show drag indicator based on primary drag direction
    if (Math.abs(dragDistanceX) > Math.abs(dragDistanceY)) {
        // Horizontal drag is dominant
        if (dragDistanceX > 20) {
            showDragIndicator('right');
        } else if (dragDistanceX < -20) {
            showDragIndicator('left');
        } else {
            hideAllDragIndicators();
        }
    } else {
        // Vertical drag is dominant
        if (dragDistanceY > 10) {
            showDragIndicator('up');
        } else {
            hideAllDragIndicators();
        }
    }
    
    // Allow color changing through horizontal drag
    if (availableColors.length > 1) {
        const currentTime = Date.now();
        // Change selected color when dragging horizontally more than 20 pixels
        // and more horizontally than vertically
        if (Math.abs(dragDistanceX) > 20 && Math.abs(dragDistanceX) > Math.abs(dragDistanceY) &&
            (currentTime - lastColorChangeTime) > colorChangeCooldown) {
            // Determine direction of drag
            if (dragDistanceX > 0) {
                // Dragging right - cycle to next color
                selectedColorIndex = (selectedColorIndex + 1) % availableColors.length;
            } else {
                // Dragging left - cycle to previous color
                selectedColorIndex = (selectedColorIndex - 1 + availableColors.length) % availableColors.length;
            }
            
            // Update the ball color immediately
            ballColor = availableColors[selectedColorIndex];
            ball.material.color.setHex(ballColor);
            ball.material.emissive.setHex(ballColor);
            
            // Update UI to show selected color
            updateAvailableColorsUI();
            
            lastColorChangeTime = currentTime;
        }
    }
    
    // Update drag speed based on vertical drag distance
    // Make vertical drag more sensitive and distinct
    if (dragDistanceY > 10) { // Only apply speed when dragging up significantly
        dragSpeed = Math.min(Math.max(dragDistanceY * 0.02, 0), maxSpeed * 1.5); // Increased sensitivity
    } else {
        dragSpeed = 0; // No speed when not dragging up significantly
    }
}

function onDragEnd(event) {
    if (!isDragging) return;
    
    event.preventDefault();
    isDragging = false;
    
    // Hide all drag indicators
    hideAllDragIndicators();
    
    // Set the ball speed based on the drag
    if (gameStarted && !gameOver) {
        ballSpeed = dragSpeed;
    }
    
    // Reset drag speed
    dragSpeed = 0;
}

function changeBallColor() {
    const randomIndex = Math.floor(Math.random() * availableColors.length);
    ballColor = availableColors[randomIndex];
    ball.material.color.setHex(ballColor);
    ball.material.emissive.setHex(ballColor);
}