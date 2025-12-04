import { Profile } from '../models/Profile';
import { Project } from '../models/Project';
import { Platform } from '../models/Platform';

/**
 * Context for building the generation prompt
 */
export interface PromptContext {
  profile?: Profile | null;
  project?: Project | null;
  platform?: Platform | null;
  goal?: string | null;
  rawIdea: string;
}

/**
 * Build a section for the prompt with a title and content
 */
function buildSection(title: string, content: string | null | undefined): string {
  if (!content || content.trim() === '') {
    return '';
  }
  return `## ${title}\n${content.trim()}\n\n`;
}

/**
 * Build a list section for the prompt
 */
function buildListSection(title: string, items: string[] | null | undefined): string {
  if (!items || items.length === 0) {
    return '';
  }
  const formattedItems = items.map((item) => `- ${item}`).join('\n');
  return `## ${title}\n${formattedItems}\n\n`;
}

/**
 * Build profile context section
 */
function buildProfileContext(profile: Profile | null | undefined): string {
  if (!profile) {
    return '';
  }

  let context = '# PROFILE CONTEXT\n\n';
  context += buildSection('Author Name', profile.name);
  context += buildSection('Bio', profile.bio);
  context += buildListSection('Tone & Style Tags', profile.toneTags);
  context += buildListSection('DO (Follow these rules)', profile.doRules);
  context += buildListSection("DON'T (Avoid these)", profile.dontRules);

  return context.trim() ? context : '';
}

/**
 * Build project context section
 */
function buildProjectContext(project: Project | null | undefined): string {
  if (!project) {
    return '';
  }

  let context = '# PROJECT CONTEXT\n\n';
  context += buildSection('Project Name', project.name);
  context += buildSection('Description', project.description);
  context += buildSection('Target Audience', project.audience);
  context += buildListSection('Key Messages', project.keyMessages);

  return context.trim() !== '# PROJECT CONTEXT\n' ? context : '';
}

/**
 * Build platform context section
 */
function buildPlatformContext(platform: Platform | null | undefined): string {
  if (!platform) {
    return '';
  }

  let context = '# PLATFORM REQUIREMENTS\n\n';
  context += buildSection('Platform', platform.name);
  context += buildSection('Style Guidelines', platform.styleGuidelines);

  if (platform.maxLength) {
    context += `## Character Limit\nMaximum ${platform.maxLength} characters.\n\n`;
  }

  return context.trim() !== '# PLATFORM REQUIREMENTS\n' ? context : '';
}

/**
 * Build the main task section
 */
function buildTaskSection(goal: string | null | undefined, rawIdea: string): string {
  let task = '# YOUR TASK\n\n';

  if (goal && goal.trim()) {
    task += `## Goal\n${goal.trim()}\n\n`;
  }

  task += `## Raw Idea to Transform\n${rawIdea.trim()}\n\n`;

  task += '## Instructions\n';
  task += '1. Transform the raw idea into an engaging social media post.\n';
  task += '2. Apply the profile\'s tone and style if provided.\n';
  task += '3. Consider the project\'s audience and key messages if provided.\n';
  task += '4. Follow the platform\'s guidelines and character limits if provided.\n';
  task += '5. Make the post authentic, engaging, and actionable.\n';
  task += '6. Output ONLY the final post text, nothing else.\n';

  return task;
}

/**
 * Build the complete prompt for post generation
 */
export function buildPrompt(context: PromptContext): string {
  const sections: string[] = [];

  // Add profile context if available
  const profileContext = buildProfileContext(context.profile);
  if (profileContext) {
    sections.push(profileContext);
  }

  // Add project context if available
  const projectContext = buildProjectContext(context.project);
  if (projectContext) {
    sections.push(projectContext);
  }

  // Add platform context if available
  const platformContext = buildPlatformContext(context.platform);
  if (platformContext) {
    sections.push(platformContext);
  }

  // Always add task section
  sections.push(buildTaskSection(context.goal, context.rawIdea));

  return sections.join('\n---\n\n');
}

/**
 * Estimate token count for a prompt (rough approximation)
 * Uses ~4 characters per token as a general rule
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Validate that the prompt context has minimum required data
 */
export function validatePromptContext(context: PromptContext): { valid: boolean; error?: string } {
  if (!context.rawIdea || context.rawIdea.trim() === '') {
    return { valid: false, error: 'rawIdea is required and cannot be empty' };
  }
  return { valid: true };
}

export default { buildPrompt, estimateTokenCount, validatePromptContext };
