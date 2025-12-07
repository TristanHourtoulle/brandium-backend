/**
 * Template types and utilities
 */

import { TemplateVariable } from '../models/Template';

// Re-export TemplateVariable for convenience
export { TemplateVariable };

/**
 * Template categories
 */
export type TemplateCategory =
  | 'announcement'
  | 'tutorial'
  | 'experience'
  | 'question'
  | 'tip'
  | 'milestone'
  | 'behind-the-scenes'
  | 'testimonial'
  | 'poll'
  | 'event'
  | 'other';

/**
 * Metadata for template categories
 */
export interface TemplateCategoryMetadata {
  category: TemplateCategory;
  label: string;
  description: string;
  icon: string;
}

/**
 * All template categories with metadata
 */
export const TEMPLATE_CATEGORIES: Record<TemplateCategory, TemplateCategoryMetadata> = {
  announcement: {
    category: 'announcement',
    label: 'Announcement',
    description: 'Product launches, company news, feature releases',
    icon: '📢',
  },
  tutorial: {
    category: 'tutorial',
    label: 'Tutorial',
    description: 'How-to guides, step-by-step instructions',
    icon: '📚',
  },
  experience: {
    category: 'experience',
    label: 'Experience Sharing',
    description: 'Personal stories, lessons learned, insights',
    icon: '💭',
  },
  question: {
    category: 'question',
    label: 'Question',
    description: 'Asking for opinions, starting discussions',
    icon: '❓',
  },
  tip: {
    category: 'tip',
    label: 'Tip & Advice',
    description: 'Quick tips, best practices, productivity hacks',
    icon: '💡',
  },
  milestone: {
    category: 'milestone',
    label: 'Milestone',
    description: 'Celebrating achievements, anniversaries, goals reached',
    icon: '🎯',
  },
  'behind-the-scenes': {
    category: 'behind-the-scenes',
    label: 'Behind the Scenes',
    description: 'Process insights, team culture, day-in-the-life',
    icon: '🎬',
  },
  testimonial: {
    category: 'testimonial',
    label: 'Testimonial',
    description: 'Customer success stories, social proof',
    icon: '⭐',
  },
  poll: {
    category: 'poll',
    label: 'Poll',
    description: 'Surveys, voting, gathering opinions',
    icon: '📊',
  },
  event: {
    category: 'event',
    label: 'Event',
    description: 'Webinars, conferences, meetups',
    icon: '📅',
  },
  other: {
    category: 'other',
    label: 'Other',
    description: 'Misc content that doesn\'t fit other categories',
    icon: '📝',
  },
};

/**
 * Context for rendering a template
 */
export interface TemplateRenderContext {
  templateId: string;
  variables: Record<string, string>;
  profileId?: string;
  platformId?: string;
}

/**
 * Result of rendering a template
 */
export interface TemplateRenderResult {
  content: string;
  missingVariables: string[];
  warnings: string[];
}

/**
 * Validate that a string is a valid template category
 */
export function isValidCategory(category: string): category is TemplateCategory {
  return category in TEMPLATE_CATEGORIES;
}

/**
 * Get category metadata
 */
export function getCategoryMetadata(category: TemplateCategory): TemplateCategoryMetadata {
  return TEMPLATE_CATEGORIES[category];
}

/**
 * Get all available categories
 */
export function getAllCategories(): TemplateCategory[] {
  return Object.keys(TEMPLATE_CATEGORIES) as TemplateCategory[];
}

/**
 * Extract variable names from template content
 * Matches patterns like {{variable}}, {{variable_name}}, {{my-variable}}
 */
export function extractVariables(content: string): string[] {
  const regex = /\{\{([a-zA-Z0-9_-]+)\}\}/g;
  const matches = content.matchAll(regex);
  const variables = new Set<string>();

  for (const match of matches) {
    if (match[1]) {
      variables.add(match[1]);
    }
  }

  return Array.from(variables);
}

/**
 * Validate template variables against content
 * Returns array of errors if validation fails
 */
export function validateTemplateVariables(
  content: string,
  variables: TemplateVariable[],
): string[] {
  const errors: string[] = [];
  const contentVariables = extractVariables(content);
  const definedVariables = variables.map(v => v.name);

  // Check if all variables in content are defined
  for (const varName of contentVariables) {
    if (!definedVariables.includes(varName)) {
      errors.push(`Variable {{${varName}}} used in content but not defined`);
    }
  }

  // Note: We don't check if all defined variables are used, as optional
  // variables may be defined but not used in the current content variation

  // Validate variable names (alphanumeric, underscore, hyphen only)
  const validNameRegex = /^[a-zA-Z0-9_-]+$/;
  for (const variable of variables) {
    if (!validNameRegex.test(variable.name)) {
      errors.push(
        `Variable name "${variable.name}" is invalid. Use only letters, numbers, underscores, and hyphens.`,
      );
    }
  }

  return errors;
}

/**
 * Render a template with provided variables
 */
export function renderTemplate(
  content: string,
  variables: Record<string, string>,
  requiredVariables: TemplateVariable[],
): TemplateRenderResult {
  const missingVariables: string[] = [];
  const warnings: string[] = [];

  // Merge provided variables with default values for optional variables
  const finalVariables: Record<string, string> = { ...variables };
  for (const varDef of requiredVariables) {
    // If variable not provided and has a default value, use it
    if (!finalVariables[varDef.name] && varDef.defaultValue) {
      finalVariables[varDef.name] = varDef.defaultValue;
    }
  }

  // Check for missing required variables
  for (const varDef of requiredVariables) {
    if (varDef.required && !finalVariables[varDef.name]) {
      missingVariables.push(varDef.name);
    }
  }

  // If missing required variables, return early
  if (missingVariables.length > 0) {
    return {
      content: '',
      missingVariables,
      warnings: [`Missing required variables: ${missingVariables.join(', ')}`],
    };
  }

  // Replace variables in content
  let renderedContent = content;
  const usedVariables = new Set<string>();

  for (const [varName, varValue] of Object.entries(finalVariables)) {
    const pattern = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
    if (pattern.test(renderedContent)) {
      usedVariables.add(varName);
      renderedContent = renderedContent.replace(pattern, varValue);
    }
  }

  // Check for unused variables
  for (const varName of Object.keys(variables)) {
    if (!usedVariables.has(varName)) {
      warnings.push(`Variable "${varName}" provided but not used in template`);
    }
  }

  // Check for unreplaced variables
  const remainingVars = extractVariables(renderedContent);
  if (remainingVars.length > 0) {
    warnings.push(`Some variables were not replaced: ${remainingVars.map(v => `{{${v}}}`).join(', ')}`);
  }

  return {
    content: renderedContent,
    missingVariables: [],
    warnings,
  };
}
