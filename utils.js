// Utility functions

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onInteraction(event) {
    event.preventDefault();
    
    if (!gameStarted) return;
    if (gameOver) return;
    
    // Accelerate ball forward (faster)
    ballSpeed = Math.min(ballSpeed + 0.12, maxSpeed);
}

function changeBallColor() {
    const randomIndex = Math.floor(Math.random() * colors.length);
    ballColor = colors[randomIndex];
    ball.material.color.setHex(ballColor);
    ball.material.emissive.setHex(ballColor);
}