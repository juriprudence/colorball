import Game from './game.js';

window.addEventListener('load', () => {
    const game = new Game();
    document.getElementById('startButton').addEventListener('click', () => game.startGame());
    document.getElementById('restartButton').addEventListener('click', () => game.restartGame());
});