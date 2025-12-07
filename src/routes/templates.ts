import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { templateValidators } from '../middleware/validators';
import * as TemplateController from '../controllers/TemplateController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/templates/suggestions
 * Get template suggestions based on category and context
 */
router.get('/suggestions', TemplateController.getSuggestions);

/**
 * POST /api/templates/find-similar
 * Find templates similar to provided content
 */
router.post(
  '/find-similar',
  templateValidators.findSimilar,
  TemplateController.findSimilar,
);

/**
 * GET /api/templates/statistics
 * Get template statistics for the current user
 */
router.get('/statistics', TemplateController.getStatistics);

/**
 * POST /api/templates
 * Create a new template
 */
router.post(
  '/',
  templateValidators.create,
  TemplateController.createTemplate,
);

/**
 * GET /api/templates
 * List templates with filters
 */
router.get(
  '/',
  templateValidators.list,
  TemplateController.listTemplates,
);

/**
 * GET /api/templates/:id
 * Get template by ID
 */
router.get(
  '/:id',
  templateValidators.getById,
  TemplateController.getTemplateById,
);

/**
 * PUT /api/templates/:id
 * PATCH /api/templates/:id
 * Update a template
 */
router.put(
  '/:id',
  templateValidators.update,
  TemplateController.updateTemplate,
);

router.patch(
  '/:id',
  templateValidators.update,
  TemplateController.updateTemplate,
);

/**
 * DELETE /api/templates/:id
 * Delete a template
 */
router.delete(
  '/:id',
  templateValidators.deleteTemplate,
  TemplateController.deleteTemplate,
);

/**
 * POST /api/templates/:id/render
 * Render a template with variables
 */
router.post(
  '/:id/render',
  templateValidators.render,
  TemplateController.renderTemplate,
);

/**
 * POST /api/templates/:id/duplicate
 * Duplicate a template
 */
router.post(
  '/:id/duplicate',
  templateValidators.duplicate,
  TemplateController.duplicateTemplate,
);

export default router;
