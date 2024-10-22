const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Redis = require('redis');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Connect to Redis
const redisClient = Redis.createClient();

redisClient.on('error', (err) => {
  console.log('Redis error:', err);
});

redisClient.connect().catch(console.error);

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle seat selection (temporary lock)
  socket.on('select seat', async (seatId) => {
    const isLocked = await redisClient.get(`seat:${seatId}`);

    if (isLocked === 'locked' || isLocked === 'booked') {
      // Notify the user that the seat is unavailable
      socket.emit('seat unavailable', seatId);
    } else {
      // Temporarily lock the seat for 5 minutes
      await redisClient.set(`seat:${seatId}`, 'locked', { EX: 300 });
      // Notify all users that the seat is locked
      io.emit('seat locked', seatId);
    }
  });

  // Handle seat booking confirmation (permanent lock)
  socket.on('confirm booking', async (seatId) => {
    const isLocked = await redisClient.get(`seat:${seatId}`);

    if (isLocked === 'locked') {
      // Permanently book the seat by setting a new value
      await redisClient.set(`seat:${seatId}`, 'booked');
      // Notify all users that the seat has been booked
      io.emit('seat booked', seatId);
    } else {
      // Notify the user that the seat is unavailable (e.g., already booked by someone else)
      socket.emit('seat unavailable', seatId);
    }
  });

  // Handle reset request
  socket.on('reset seats', async () => {
    // Clear all seat data from Redis
    const keys = await redisClient.keys('seat:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    // Notify all users that seats have been reset
    io.emit('seats reset');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});


/*const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Redis = require('redis');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Connect to Redis
const redisClient = Redis.createClient();

redisClient.on('error', (err) => {
  console.log('Redis error:', err);
});

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle seat selection (temporary lock)
  socket.on('select seat', async (seatId) => {
    const seatStatus = await redisClient.get(`seat:${seatId}`);

    if (seatStatus === 'locked') {
      // Notify the user that the seat is locked
      socket.emit('seat status', { seatId, status: 'locked' });
    } else if (seatStatus === 'booked') {
      // Notify the user that the seat is already booked
      socket.emit('seat status', { seatId, status: 'booked' });
    } else {
      // Temporarily lock the seat for 5 minutes
      await redisClient.set(`seat:${seatId}`, 'locked', { EX: 300 });
      // Notify all users that the seat is locked
      io.emit('seat status', { seatId, status: 'locked' });
    }
  });

  // Handle seat booking confirmation (permanent lock)
  socket.on('confirm booking', async (seatId) => {
    const seatStatus = await redisClient.get(`seat:${seatId}`);

    if (seatStatus === 'locked') {
      // Permanently book the seat by setting a new value
      await redisClient.set(`seat:${seatId}`, 'booked');
      // Notify all users that the seat has been booked
      io.emit('seat status', { seatId, status: 'booked' });
    } else {
      // Notify the user that the seat is unavailable (e.g., already booked or locked by someone else)
      socket.emit('seat status', { seatId, status: seatStatus });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
*/