require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const http     = require('http');
const { Server } = require('socket.io');

const { sequelize } = require('./models');
const authRoutes    = require('./routes/auth');
const scanRoutes    = require('./routes/scan');
const userRoutes    = require('./routes/users');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173' }
});

// ── Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json());

// Make io available inside routes
app.set('io', io);
// USB watcher
const startUsbWatcher = require('./services/usbWatcher');
startUsbWatcher(io);

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/scan',  scanRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => res.json({ message: 'AV-System API running' }));

// ── Socket.io ─────────────────────────────────────────────────
io.on('connection', socket => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

sequelize.sync({ alter: true })
  .then(() => {
    console.log('Database synced');
    server.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
    console.error('Make sure Laragon is running and antivirus_db exists');
  });