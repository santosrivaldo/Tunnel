const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const tunnelRoutes = require('./routes/tunnel');
const agentRoutes = require('./routes/agent');
const billingRoutes = require('./routes/billing');
const adminRoutes = require('./routes/admin');

const TunnelManager = require('./services/TunnelManager');
const AgentManager = require('./services/AgentManager');
const BillingService = require('./services/BillingService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : ["http://localhost:3000", "http://localhost:3001"],
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tunnel-saas')
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Initialize services
const tunnelManager = new TunnelManager(io);
const agentManager = new AgentManager(io);
const billingService = new BillingService();

// Make services available to routes
app.use((req, res, next) => {
  req.tunnelManager = tunnelManager;
  req.agentManager = agentManager;
  req.billingService = billingService;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tunnel', tunnelRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin', adminRoutes);

// Serve static files from React app
app.use(express.static('client/build'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Handle agent registration
  socket.on('agent:register', async (data) => {
    try {
      const agent = await agentManager.registerAgent(socket, data);
      socket.emit('agent:registered', { success: true, agentId: agent._id });
    } catch (error) {
      socket.emit('agent:error', { message: error.message });
    }
  });

  // Handle tunnel creation
  socket.on('tunnel:create', async (data) => {
    try {
      const tunnel = await tunnelManager.createTunnel(socket, data);
      socket.emit('tunnel:created', { success: true, tunnel });
    } catch (error) {
      socket.emit('tunnel:error', { message: error.message });
    }
  });

  // Handle tunnel traffic
  socket.on('tunnel:data', (data) => {
    tunnelManager.handleTunnelData(socket, data);
  });

  // Handle heartbeat
  socket.on('heartbeat', () => {
    socket.emit('heartbeat:ack');
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
    agentManager.handleDisconnection(socket);
    tunnelManager.handleDisconnection(socket);
  });
});

// Catch-all handler for React app
app.get('*', (req, res) => {
  res.sendFile('client/build/index.html', { root: '.' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Tunnel SaaS Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
});
