import Player from './Player.mjs';
import Collectible from './Collectible.mjs';

const socket = io();
const canvas = document.getElementById('game-window');
const context = canvas.getContext('2d');

let players = {};
let collectible = null;
let myId = null;
const speed = 5;

// Receive initial state
socket.on('init', data => {
  myId = data.id;
  players = {};
  for (const id in data.players) {
    players[id] = new Player(data.players[id]);
  }
  collectible = new Collectible(data.collectible);
});

socket.on('newPlayer', playerData => {
  players[playerData.id] = new Player(playerData);
});

socket.on('playerMoved', playerData => {
  if (players[playerData.id]) {
    players[playerData.id].x = playerData.x;
    players[playerData.id].y = playerData.y;
  }
});

socket.on('updateScore', data => {
  for (const id in data.players) {
    if (players[id]) {
      players[id].score = data.players[id].score;
    } else {
      players[id] = new Player(data.players[id]);
    }
  }
  collectible = new Collectible(data.collectible);
});

socket.on('playerDisconnect', id => {
  delete players[id];
});

// Keyboard input
const keys = {};
document.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function handleInput() {
  if (!players[myId]) return;
  const me = players[myId];
  let moved = false;

  if (keys['w'] || keys['arrowup']) { me.movePlayer('up', speed); moved = true; }
  if (keys['s'] || keys['arrowdown']) { me.movePlayer('down', speed); moved = true; }
  if (keys['a'] || keys['arrowleft']) { me.movePlayer('left', speed); moved = true; }
  if (keys['d'] || keys['arrowright']) { me.movePlayer('right', speed); moved = true; }

  // Keep inside canvas
  me.x = Math.max(0, Math.min(canvas.width - 30, me.x));
  me.y = Math.max(0, Math.min(canvas.height - 30, me.y));

  if (moved) {
    socket.emit('move', { x: me.x, y: me.y });
  }

  // Check collision
  if (collectible && me.collision(collectible)) {
    socket.emit('collect', { collectibleId: collectible.id });
  }
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  context.fillStyle = '#2c2c54';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  context.fillStyle = 'white';
  context.font = '20px Arial';
  context.textAlign = 'center';
  context.fillText('Coin Race', canvas.width / 2, 30);

  // Controls hint
  context.font = '14px Arial';
  context.fillText('Controls: WASD', 80, 30);

  // Rank
  if (players[myId]) {
    const rank = players[myId].calculateRank(Object.values(players));
    context.fillText(rank, canvas.width - 80, 30);
  }

  // Draw collectible
  if (collectible) {
    context.fillStyle = 'gold';
    context.beginPath();
    context.arc(collectible.x + 10, collectible.y + 10, 10, 0, Math.PI * 2);
    context.fill();
  }

  // Draw players
  for (const id in players) {
    const p = players[id];
    context.fillStyle = id === myId ? '#00ff00' : '#ff4757';
    context.fillRect(p.x, p.y, 30, 30);
  }
}

function gameLoop() {
  handleInput();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();