import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import errorHandler from './middleware/errorHandler';
import { sequelize } from './models';

const app = express();
const PORT = process.env.PORT || 5000;

// =====================================
// Validate required environment variables
// =====================================
const validateEnv = (): void => {
  const required = ['JWT_SECRET'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0 && process.env.NODE_ENV !== 'test') {
    console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('Some features may not work correctly.');
  }
};

validateEnv();

// =====================================
// Security middlewares
// =====================================
app.use(helmet());

// CORS configuration - handle trailing slash and multiple origins
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
// Remove trailing slash if present
const normalizedOrigin = corsOrigin.endsWith('/')
  ? corsOrigin.slice(0, -1)
  : corsOrigin;

app.use(
  cors({
    origin: normalizedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// =====================================
// Parsing middlewares
// =====================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =====================================
// Health check route (public)
// =====================================
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// =====================================
// Root route (public)
// =====================================
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    name: 'Brandium Backend API',
    version: '1.0.0',
    description: 'API for personalized post generation',
    endpoints: {
      health: 'GET /health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
      },
      profiles: 'GET|POST /api/profiles, GET|PUT|DELETE /api/profiles/:id',
      projects: 'GET|POST /api/projects, GET|PUT|DELETE /api/projects/:id',
      platforms: 'GET|POST /api/platforms, GET|PUT|DELETE /api/platforms/:id',
      posts: 'GET /api/posts, GET|DELETE /api/posts/:id',
      generate: 'POST /api/generate',
    },
  });
});

// =====================================
// API Routes
// =====================================
app.use('/api', routes);

// =====================================
// 404 handler (must be after all routes)
// =====================================
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// =====================================
// Error handling middleware (must be LAST)
// =====================================
app.use(errorHandler);

// =====================================
// Server startup
// =====================================
const startServer = async (): Promise<void> => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
