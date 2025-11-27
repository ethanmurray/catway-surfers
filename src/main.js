import { Game } from './game/Game.js';

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.init();
});
