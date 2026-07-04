const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
  res.send('Rent & Flatmate Finder API is running');
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/listings', require('./routes/listingRoutes'));
app.use('/uploads', express.static('uploads'));
app.use('/api/tenant', require('./routes/tenantRoutes'));
app.use('/api/compatibility', require('./routes/compatibilityRoutes'));
app.use('/api/interests', require('./routes/interestRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

const ChatMessage = require('./models/ChatMessage');

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join a room specific to this interest request (chat thread)
  socket.on('joinRoom', (interestRequestId) => {
    socket.join(interestRequestId);
  });

  // Handle incoming messages
  socket.on('sendMessage', async ({ interestRequestId, senderId, message }) => {
    try {
      const chatMessage = await ChatMessage.create({
        interestRequest: interestRequestId,
        sender: senderId,
        message,
      });
      const populated = await chatMessage.populate('sender', 'name');

      io.to(interestRequestId).emit('receiveMessage', populated);
    } catch (err) {
      console.error('Error saving message:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});