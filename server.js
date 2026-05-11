require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const expect = require('chai');
const socket = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');

const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');

const app = express();

// Security middleware
app.use(helmet.noSniff());
app.use(helmet.xssFilter());
app.use(helmet.noCache());
app.use(helmet.hidePoweredBy({ setTo: 'PHP 7.4.3' }));

app.use('/public', express.static(process.cwd() + '/public'));
app.use('/assets', express.static(process.cwd() + '/assets'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//For FCC testing purposes and enables user to connect from outside the hosting platform
app.use(cors({origin: '*'})); 

// Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  }); 

//For FCC testing purposes
fccTestingRoutes(app);
    
// 404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

const portNum = process.env.PORT || 3000;

// Set up server and tests
const server = app.listen(portNum, () => {
  console.log(`Listening on port ${portNum}`);
  if (process.env.NODE_ENV==='test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch (error) {
        console.log('Tests are not valid:');
        console.error(error);
      }
    }, 1500);
  }
});

// Socket.io setup
const io = socket(server);

const players = {};
const collectibles = {};

// Create initial collectible
function generateCollectible() {
  return {
    id: Date.now().toString() + Math.random().toString(),
    x: Math.floor(Math.random() * 600) + 20,
    y: Math.floor(Math.random() * 400) + 20,
    value: Math.floor(Math.random() * 3) + 1
  };
}

let currentCollectible = generateCollectible();

io.on('connection', socket => {
  console.log('A user connected:', socket.id);

  // Create new player
  players[socket.id] = {
    id: socket.id,
    x: Math.floor(Math.random() * 600) + 20,
    y: Math.floor(Math.random() * 400) + 20,
    score: 0
  };

  // Send current state to new player
  socket.emit('init', {
    players,
    collectible: currentCollectible,
    id: socket.id
  });

  // Broadcast new player to others
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // Handle movement
  socket.on('move', data => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  // Handle collectible pickup
  socket.on('collect', data => {
    if (players[socket.id] && data.collectibleId === currentCollectible.id) {
      players[socket.id].score += currentCollectible.value;
      currentCollectible = generateCollectible();
      io.emit('updateScore', { 
        players, 
        collectible: currentCollectible 
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnect', socket.id);
  });
});

module.exports = app; // For testing