import { Router } from 'express';
import authRoutes from './auth';
import profileRoutes from './profiles';
import projectRoutes from './projects';
import platformRoutes from './platforms';
import postRoutes from './posts';
import generateRoutes from './generate';

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
router.use('/projects', projectRoutes);
router.use('/platforms', platformRoutes);
router.use('/posts', postRoutes);
router.use('/generate', generateRoutes);

export default router;
