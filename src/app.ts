import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 5000;

// =====================================
// Security middlewares
// =====================================
app.use(helmet());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }),
);

// =====================================
// Parsing middlewares
// =====================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================================
// Health check route (public)
// =====================================
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// =====================================
// Root route
// =====================================
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    name: 'Brandium Backend API',
    version: '1.0.0',
    description: 'API for personalized post generation',
    endpoints: {
      health: '/health',
      api: '/api (coming soon)',
    },
  });
});

// =====================================
// 404 handler
// =====================================
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// =====================================
// Error handling middleware
// =====================================
interface HttpError extends Error {
  status?: number;
}

app.use((err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// =====================================
// Server startup
// =====================================
const startServer = async (): Promise<void> => {
  try {
    // Note: Database connection will be added in Phase 1
    console.log('Database connection will be configured in Phase 1');

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

// Only start if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
