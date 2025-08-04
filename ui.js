// UI-related functions

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

function updateScore() {
    document.getElementById('score').textContent = score;
}

function endGame() {
    gameOver = true;
    ballSpeed = 0;
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').style.display = 'block';
}