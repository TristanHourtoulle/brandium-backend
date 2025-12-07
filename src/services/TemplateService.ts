import { Op } from 'sequelize';
import { Template, TemplateVariable } from '../models/Template';
import { Profile, Platform } from '../models';
import { TemplateRenderContext, TemplateRenderResult, renderTemplate, extractVariables, validateTemplateVariables } from '../types/template';

/**
 * Service for managing templates
 */
export class TemplateService {
  /**
   * Create a new template
   */
  async createTemplate(data: {
    userId: string;
    profileId?: string;
    platformId?: string;
    name: string;
    description?: string;
    category: string;
    content: string;
    variables: TemplateVariable[];
    exampleVariables?: Record<string, string>;
    tags?: string[];
    isPublic?: boolean;
  }): Promise<Template> {
    // Validate variables against content
    const validationErrors = validateTemplateVariables(data.content, data.variables);
    if (validationErrors.length > 0) {
      throw new Error(`Template validation failed: ${validationErrors.join('; ')}`);
    }

    const template = await Template.create({
      userId: data.userId,
      profileId: data.profileId || null,
      platformId: data.platformId || null,
      name: data.name,
      description: data.description || null,
      category: data.category,
      content: data.content,
      variables: data.variables,
      exampleVariables: data.exampleVariables || null,
      isSystem: false,
      isPublic: data.isPublic || false,
      usageCount: 0,
      tags: data.tags || [],
    });

    return template;
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string, userId: string): Promise<Template | null> {
    const template = await Template.findOne({
      where: { id: templateId },
      include: [
        {
          model: Profile,
          as: 'profile',
          attributes: ['id', 'name'],
        },
        {
          model: Platform,
          as: 'platform',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!template) {
      return null;
    }

    // Check access permissions
    if (!template.isSystem && !template.isPublic && template.userId !== userId) {
      return null; // User doesn't have access to this private template
    }

    return template;
  }

  /**
   * List templates with filters
   */
  async listTemplates(options: {
    userId: string;
    category?: string;
    platformId?: string;
    profileId?: string;
    includeSystem?: boolean;
    includePublic?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ templates: Template[]; total: number; page: number; totalPages: number }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const offset = (page - 1) * limit;

    const where: any = {};

    // Build where clause
    // User's own templates OR system templates OR public templates
    const orConditions: any[] = [{ userId: options.userId }];

    if (options.includeSystem !== false) {
      orConditions.push({ isSystem: true });
    }

    if (options.includePublic !== false) {
      orConditions.push({ isPublic: true });
    }

    where[Op.or] = orConditions;

    // Additional filters
    if (options.category) {
      where.category = options.category;
    }

    if (options.platformId) {
      where.platformId = options.platformId;
    }

    if (options.profileId) {
      where.profileId = options.profileId;
    }

    const { count, rows } = await Template.findAndCountAll({
      where,
      include: [
        {
          model: Profile,
          as: 'profile',
          attributes: ['id', 'name'],
        },
        {
          model: Platform,
          as: 'platform',
          attributes: ['id', 'name'],
        },
      ],
      order: [
        ['isSystem', 'DESC'], // System templates first
        ['usageCount', 'DESC'], // Most used next
        ['createdAt', 'DESC'],
      ],
      limit,
      offset,
    });

    return {
      templates: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }

  /**
   * Update a template
   */
  async updateTemplate(
    templateId: string,
    userId: string,
    updates: {
      name?: string;
      description?: string;
      category?: string;
      content?: string;
      variables?: TemplateVariable[];
      exampleVariables?: Record<string, string>;
      tags?: string[];
      isPublic?: boolean;
    },
  ): Promise<Template | null> {
    const template = await Template.findOne({
      where: { id: templateId, userId }, // Only user's own templates
    });

    if (!template) {
      return null;
    }

    // If content or variables are being updated, validate them
    const newContent = updates.content || template.content;
    const newVariables = updates.variables || template.variables;

    const validationErrors = validateTemplateVariables(newContent, newVariables);
    if (validationErrors.length > 0) {
      throw new Error(`Template validation failed: ${validationErrors.join('; ')}`);
    }

    await template.update(updates);

    return template;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string, userId: string): Promise<boolean> {
    const template = await Template.findOne({
      where: { id: templateId, userId }, // Only user's own templates
    });

    if (!template) {
      return false;
    }

    await template.destroy();
    return true;
  }

  /**
   * Render a template with provided variables
   */
  async renderTemplateById(
    context: TemplateRenderContext,
    userId: string,
  ): Promise<TemplateRenderResult & { template: Template }> {
    const template = await this.getTemplateById(context.templateId, userId);

    if (!template) {
      throw new Error('Template not found or access denied');
    }

    const result = renderTemplate(template.content, context.variables, template.variables);

    // Increment usage count if render was successful
    if (result.missingVariables.length === 0) {
      await template.increment('usageCount');
    }

    return {
      ...result,
      template,
    };
  }

  /**
   * Duplicate a template (copy to user's templates)
   */
  async duplicateTemplate(
    templateId: string,
    userId: string,
    newName?: string,
  ): Promise<Template> {
    const original = await this.getTemplateById(templateId, userId);

    if (!original) {
      throw new Error('Template not found or access denied');
    }

    const duplicate = await Template.create({
      userId,
      profileId: null, // Don't copy profile/platform IDs as they belong to original user
      platformId: null,
      name: newName || `Copy of ${original.name}`,
      description: original.description,
      category: original.category,
      content: original.content,
      variables: original.variables,
      exampleVariables: original.exampleVariables,
      isSystem: false,
      isPublic: false,
      usageCount: 0,
      tags: original.tags || [],
    });

    return duplicate;
  }

  /**
   * Get template suggestions based on category and context
   */
  async getSuggestions(options: {
    userId: string;
    category?: string;
    platformId?: string;
    limit?: number;
  }): Promise<Template[]> {
    const where: any = {};

    // Only system templates and popular public templates for suggestions
    where[Op.or] = [{ isSystem: true }, { isPublic: true, usageCount: { [Op.gte]: 5 } }];

    if (options.category) {
      where.category = options.category;
    }

    if (options.platformId) {
      where.platformId = { [Op.in]: [options.platformId, null] }; // Match specific platform or platform-agnostic
    }

    const templates = await Template.findAll({
      where,
      include: [
        {
          model: Platform,
          as: 'platform',
          attributes: ['id', 'name'],
        },
      ],
      order: [
        ['usageCount', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit: options.limit || 10,
    });

    return templates;
  }

  /**
   * Analyze content and suggest a template if similar exists
   */
  async findSimilarTemplates(
    userId: string,
    content: string,
    limit: number = 5,
  ): Promise<Template[]> {
    // Extract variables from the content
    const variables = extractVariables(content);

    if (variables.length === 0) {
      return [];
    }

    // Find templates that have similar variables
    const templates = await Template.findAll({
      where: {
        [Op.or]: [{ userId }, { isSystem: true }, { isPublic: true }],
      },
      include: [
        {
          model: Platform,
          as: 'platform',
          attributes: ['id', 'name'],
        },
      ],
      limit: 50, // Get more for filtering
    });

    // Score templates based on variable overlap
    const scored = templates
      .map(template => {
        const templateVars = new Set(template.variables.map(v => v.name));
        const contentVars = new Set(variables);

        const intersection = new Set([...templateVars].filter(v => contentVars.has(v)));
        const union = new Set([...templateVars, ...contentVars]);

        const similarity = intersection.size / union.size;

        return { template, similarity };
      })
      .filter(item => item.similarity > 0.3) // At least 30% similar
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.template);

    return scored;
  }

  /**
   * Get template statistics
   */
  async getStatistics(userId: string): Promise<{
    total: number;
    byCategory: Record<string, number>;
    mostUsed: Template[];
    recentlyCreated: Template[];
  }> {
    const userTemplates = await Template.findAll({
      where: { userId },
      include: [
        {
          model: Platform,
          as: 'platform',
          attributes: ['id', 'name'],
        },
      ],
    });

    // Count by category
    const byCategory: Record<string, number> = {};
    for (const template of userTemplates) {
      byCategory[template.category] = (byCategory[template.category] || 0) + 1;
    }

    // Most used
    const mostUsed = [...userTemplates]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);

    // Recently created
    const recentlyCreated = [...userTemplates]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    return {
      total: userTemplates.length,
      byCategory,
      mostUsed,
      recentlyCreated,
    };
  }
}

// Export singleton instance
export const templateService = new TemplateService();
export default templateService;
