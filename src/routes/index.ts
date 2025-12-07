import { Router } from 'express';
import authRoutes from './auth';
import profileRoutes from './profiles';
import projectRoutes from './projects';
import platformRoutes from './platforms';
import postRoutes from './posts';
import postIterationRoutes from './postIterations';
import generateRoutes from './generate';
import historicalPostRoutes from './historicalPosts';
import ideaRoutes from './ideas';
import templateRoutes from './templates';

const router = Router();

// =====================================
// Public routes (no JWT required)
// =====================================
router.use('/auth', authRoutes);

// =====================================
// Protected routes (JWT required)
// Note: authMiddleware is applied in each route file
// =====================================
router.use('/profiles', profileRoutes);
router.use('/profiles/:profileId/historical-posts', historicalPostRoutes); // Historical posts nested under profiles
router.use('/projects', projectRoutes);
router.use('/platforms', platformRoutes);
router.use('/posts', postRoutes);
router.use('/posts', postIterationRoutes); // Post iteration routes (versions, iterate)
router.use('/generate', generateRoutes);
router.use('/ideas', ideaRoutes); // Post idea generation routes
router.use('/templates', templateRoutes); // Template routes

export default router;
