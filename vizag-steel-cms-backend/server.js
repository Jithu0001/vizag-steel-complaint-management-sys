require('dotenv').config();

const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/database');
const { initSocket } = require('./src/sockets/socketManager');
const { initQueues } = require('./src/jobs/queueManager');
const logger = require('./src/utils/logger');

const cors = require('cors');
const allowedOrigins = [
  'http://localhost:5173',                  // For local development
  'https://your-vercel-app-name.vercel.app' // Replace this with your exact live Vercel URL
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));


const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.IO
    initSocket(server);

    // Initialize BullMQ queues and workers
    await initQueues();

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
