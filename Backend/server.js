const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB, mongoose, getRedisClient } = require('./config/db');
const passport = require('./config/passport');

const authRoutes = require('./routes/auth');
const apiKeyRoutes = require('./routes/apiKeys');
const rateLimitRoutes = require('./routes/rateLimit');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (AWS Application Load Balancer) for accurate client IP detection
app.set('trust proxy server', 1);

connectDB();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://axionlimit-alb-693430163.ap-south-1.elb.amazonaws.com',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients (curl/Postman) or listed origins
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive fallback for testing/ALB health checks
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Health Check Endpoint (used by AWS ALB Target Group)
app.get('/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const redisClient = getRedisClient();
  const redisStatus = redisClient && redisClient.status === 'ready' ? 'ready' : 'disconnected';

  const isHealthy = mongoStatus === 'connected' && redisStatus === 'ready';
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'UP' : 'DOWN',
    server: process.env.EC2_SERVER_NAME || 'Local-Server',
    timestamp: new Date().toISOString(),
    services: {
      database: mongoStatus,
      redis: redisStatus
    }
  });
});

// Server Info Endpoint (used to demonstrate ALB load balancing between EC2-1 and EC2-2)
app.get('/server-info', (req, res) => {
  res.json({
    server: process.env.EC2_SERVER_NAME || 'EC2-Local',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

app.use('/auth', authRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api', rateLimitRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'AxionLimit Rate Limiting API',
    server: process.env.EC2_SERVER_NAME || 'EC2-Local',
    status: 'online'
  });


});


app.use((err, req, res, next) => {
  console.error('💥 Uncaught server error:', err);
  res.status(500).json({
    error: 'Internal server error.',
    message: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 AxionLimit rate limiter server running on port ${PORT} [Node: ${process.env.EC2_SERVER_NAME || 'Local'}]`);
});

module.exports = server;