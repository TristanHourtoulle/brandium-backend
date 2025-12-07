import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { projectValidators } from '../middleware/validators';
import * as ProjectController from '../controllers/ProjectController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/projects
 * Get all projects for authenticated user
 */
router.get('/', ProjectController.getAll);

/**
 * GET /api/projects/:id
 * Get a specific project by ID
 */
router.get('/:id', projectValidators.getOne, ProjectController.getById);

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/', projectValidators.create, ProjectController.create);

/**
 * PUT /api/projects/:id
 * PATCH /api/projects/:id
 * Update a project
 */
router.put('/:id', projectValidators.update, ProjectController.update);
router.patch('/:id', projectValidators.update, ProjectController.update);

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
router.delete('/:id', projectValidators.delete, ProjectController.remove);

export default router;
