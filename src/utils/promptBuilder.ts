import { Profile } from '../models/Profile';
import { Project } from '../models/Project';
import { Platform } from '../models/Platform';
import { HistoricalPost } from '../models/HistoricalPost';
import { buildHistoricalPostsContext } from './historicalPostSelector';

/**
 * Context for building the generation prompt
 */
export interface PromptContext {
  profile?: Profile | null;
  project?: Project | null;
  platform?: Platform | null;
  goal?: string | null;
  rawIdea: string;
  /**
   * Historical posts to include as writing style examples
   */
  historicalPosts?: HistoricalPost[];
}

/**
 * Context for building an iteration prompt
 */
export interface IterationPromptContext extends PromptContext {
  previousText: string;
  iterationPrompt: string;
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
 * Build the main task section with LinkedIn-optimized instructions
 */
function buildTaskSection(goal: string | null | undefined, rawIdea: string): string {
  let task = '# YOUR TASK\n\n';

  if (goal && goal.trim()) {
    task += `## Goal\n${goal.trim()}\n\n`;
  }

  task += `## Raw Idea to Transform\n${rawIdea.trim()}\n\n`;

  task += '## STRICT OUTPUT REQUIREMENTS\n\n';

  task += '### Structure (follow this order):\n';
  task += '1. **HOOK** (2-3 lines): Stop the scroll. Use question, stat, bold opinion, or story opener.\n';
  task += '2. **BODY** (main content): Develop your point with short paragraphs. One idea = one paragraph.\n';
  task += '3. **CTA** (last line): End with a question that invites comments.\n\n';

  task += '### Formatting Rules:\n';
  task += '- Line break after EVERY sentence (mobile readability)\n';
  task += '- Paragraphs of 1-3 lines maximum\n';
  task += '- Use → or - for lists, not bullets\n';
  task += '- Emojis: 0-3 max, only at line starts or before CTA\n';
  task += '- Hashtags: 3-5 at the very end, separated by spaces\n';
  task += '- Length: 1200-1800 characters ideal\n\n';

  task += '### Content Rules:\n';
  task += '- First person narrative\n';
  task += '- Conversational tone (reading age 6-9)\n';
  task += '- NO corporate jargon or buzzwords\n';
  task += '- NO external links in the post body\n';
  task += '- DO NOT start with "I" - vary your openings\n\n';

  task += '### Output:\n';
  task += 'Write ONLY the final LinkedIn post. No explanations, no alternatives, no meta-commentary.\n';

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

  // Add historical posts context if available (after profile, before project)
  if (context.historicalPosts && context.historicalPosts.length > 0) {
    const historicalContext = buildHistoricalPostsContext(context.historicalPosts);
    if (historicalContext) {
      sections.push(historicalContext);
    }
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

/**
 * Build the iteration task section with surgical precision rules
 */
function buildIterationTaskSection(previousText: string, iterationPrompt: string): string {
  let task = '# PREVIOUS VERSION (DO NOT REWRITE ENTIRELY)\n\n';
  task += '```\n';
  task += previousText.trim();
  task += '\n```\n\n';

  task += '# MODIFICATION REQUEST\n\n';
  task += iterationPrompt.trim();
  task += '\n\n';

  task += '# STRICT MODIFICATION RULES\n\n';

  task += '**CRITICAL: This is a SURGICAL edit, NOT a rewrite.**\n\n';

  task += '## Before modifying, identify:\n';
  task += '1. The EXACT sentences/words that need to change\n';
  task += '2. Whether the request is about: content, tone, structure, or length\n\n';

  task += '## Rules:\n';
  task += '1. **KEEP** all parts NOT mentioned in the request **WORD FOR WORD**\n';
  task += '2. **ONLY** modify what is explicitly requested\n';
  task += '3. If the request is ambiguous, make the **MINIMAL** change possible\n';
  task += '4. **DO NOT** "improve", "enhance", or "fix" other parts\n';
  task += '5. **DO NOT** change the hook unless specifically asked\n';
  task += '6. **DO NOT** change the CTA unless specifically asked\n';
  task += '7. **PRESERVE** emoji usage, line breaks, and formatting\n\n';

  task += '## Output:\n';
  task += 'Output ONLY the modified post. If you changed more than requested, you FAILED.\n';

  return task;
}

/**
 * Build a prompt for iterating on an existing post
 */
export function buildIterationPrompt(context: IterationPromptContext): string {
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

  // Add original task context for reference
  if (context.goal || context.rawIdea) {
    let originalContext = '# ORIGINAL REQUEST\n\n';
    if (context.goal) {
      originalContext += `**Goal:** ${context.goal.trim()}\n\n`;
    }
    originalContext += `**Raw Idea:** ${context.rawIdea.trim()}\n`;
    sections.push(originalContext);
  }

  // Add iteration task section
  sections.push(buildIterationTaskSection(context.previousText, context.iterationPrompt));

  return sections.join('\n---\n\n');
}

/**
 * Validate iteration prompt context
 */
export function validateIterationContext(
  context: Partial<IterationPromptContext>,
): { valid: boolean; error?: string } {
  if (!context.iterationPrompt || context.iterationPrompt.trim() === '') {
    return { valid: false, error: 'iterationPrompt is required and cannot be empty' };
  }
  if (!context.previousText || context.previousText.trim() === '') {
    return { valid: false, error: 'previousText is required for iteration' };
  }
  return { valid: true };
}

export default {
  buildPrompt,
  buildIterationPrompt,
  estimateTokenCount,
  validatePromptContext,
  validateIterationContext,
};
