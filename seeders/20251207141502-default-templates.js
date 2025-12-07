'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    
    const templates = [
      {
        id: uuidv4(),
        user_id: null,
        profile_id: null,
        platform_id: null,
        name: 'Product Announcement',
        description: 'Template for announcing a new product or feature',
        category: 'announcement',
        content: `Excited to announce {{product_name}}! 🚀

{{product_description}}

Key features:
- {{feature_1}}
- {{feature_2}}
- {{feature_3}}

{{call_to_action}}`,
        variables: JSON.stringify([
          { name: 'product_name', description: 'Name of the product', required: true },
          { name: 'product_description', description: 'Brief description of the product', required: true },
          { name: 'feature_1', description: 'First key feature', required: true },
          { name: 'feature_2', description: 'Second key feature', required: true },
          { name: 'feature_3', description: 'Third key feature', required: true },
          { name: 'call_to_action', description: 'Call to action (e.g., Try it now)', required: true },
        ]),
        example_variables: JSON.stringify({
          product_name: 'QuickTask Pro',
          product_description: 'A productivity tool that helps teams manage tasks efficiently',
          feature_1: 'AI-powered task prioritization',
          feature_2: 'Real-time collaboration',
          feature_3: 'Seamless integrations with popular tools',
          call_to_action: 'Try it free for 14 days!',
        }),
        is_system: true,
        is_public: true,
        usage_count: 0,
        tags: JSON.stringify(['product', 'launch', 'announcement']),
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        user_id: null,
        profile_id: null,
        platform_id: null,
        name: 'Tutorial Introduction',
        description: 'Template for introducing a tutorial or how-to post',
        category: 'tutorial',
        content: `How to {{topic}} in {{timeframe}}

Many struggle with {{problem}}. Here's a simple guide to master {{topic}}.

{{intro_hook}}

I'll walk you through:
1️⃣ {{step_1}}
2️⃣ {{step_2}}
3️⃣ {{step_3}}

{{closing}}`,
        variables: JSON.stringify([
          { name: 'topic', description: 'The tutorial topic', required: true },
          { name: 'timeframe', description: 'Time it takes (e.g., 5 minutes, 1 hour)', required: true },
          { name: 'problem', description: 'The problem this solves', required: true },
          { name: 'intro_hook', description: 'Hook to grab attention', required: true },
          { name: 'step_1', description: 'First step', required: true },
          { name: 'step_2', description: 'Second step', required: true },
          { name: 'step_3', description: 'Third step', required: true },
          { name: 'closing', description: 'Closing statement', required: true },
        ]),
        example_variables: JSON.stringify({
          topic: 'build a landing page',
          timeframe: '30 minutes',
          problem: 'creating effective landing pages',
          intro_hook: "Last month, I tested 10 different approaches. Here's what worked best.",
          step_1: 'Choose a clear value proposition',
          step_2: 'Design with mobile-first approach',
          step_3: 'Add one strong call-to-action',
          closing: 'Start with these basics, then optimize based on data.',
        }),
        is_system: true,
        is_public: true,
        usage_count: 0,
        tags: JSON.stringify(['tutorial', 'how-to', 'guide']),
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        user_id: null,
        profile_id: null,
        platform_id: null,
        name: 'Lesson Learned',
        description: 'Template for sharing a lesson learned from experience',
        category: 'experience',
        content: `{{mistake_intro}}

Here's what I learned:

{{lesson_1}}

{{lesson_2}}

{{lesson_3}}

{{conclusion}}

What's a lesson you learned the hard way?`,
        variables: JSON.stringify([
          { name: 'mistake_intro', description: 'Introduction to the mistake or experience', required: true },
          { name: 'lesson_1', description: 'First lesson learned', required: true },
          { name: 'lesson_2', description: 'Second lesson learned', required: true },
          { name: 'lesson_3', description: 'Third lesson learned', required: true },
          { name: 'conclusion', description: 'Concluding thought', required: true },
        ]),
        example_variables: JSON.stringify({
          mistake_intro: 'I spent $10,000 on a product launch that failed. Here\'s why:',
          lesson_1: '💡 Validate with real users, not friends and family',
          lesson_2: '💡 Start small, scale what works',
          lesson_3: '💡 Listen to feedback, not just compliments',
          conclusion: 'Failure taught me more than any success ever did.',
        }),
        is_system: true,
        is_public: true,
        usage_count: 0,
        tags: JSON.stringify(['experience', 'lessons', 'failure']),
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        user_id: null,
        profile_id: null,
        platform_id: null,
        name: 'Quick Tip',
        description: 'Template for sharing a quick, actionable tip',
        category: 'tip',
        content: `{{tip_number}} to {{goal}}

{{problem_statement}}

Try this instead:
{{solution}}

{{benefit}}

{{call_to_action}}`,
        variables: JSON.stringify([
          { name: 'tip_number', description: 'Number or identifier (e.g., "Pro tip", "Quick hack")', required: true },
          { name: 'goal', description: 'What this helps achieve', required: true },
          { name: 'problem_statement', description: 'The common problem', required: true },
          { name: 'solution', description: 'Your solution/tip', required: true },
          { name: 'benefit', description: 'Why this works', required: true },
          { name: 'call_to_action', description: 'What to do next', required: true },
        ]),
        example_variables: JSON.stringify({
          tip_number: 'Quick tip',
          goal: 'write better code reviews',
          problem_statement: 'Most code reviews focus on what\'s wrong.',
          solution: 'Start every review with one thing you liked. Then suggest improvements.',
          benefit: 'This builds trust and makes feedback feel collaborative, not confrontational.',
          call_to_action: 'Try it in your next review!',
        }),
        is_system: true,
        is_public: true,
        usage_count: 0,
        tags: JSON.stringify(['tip', 'advice', 'quick-win']),
        created_at: now,
        updated_at: now,
      },
      {
        id: uuidv4(),
        user_id: null,
        profile_id: null,
        platform_id: null,
        name: 'Milestone Celebration',
        description: 'Template for celebrating achievements and milestones',
        category: 'milestone',
        content: `🎉 We just hit {{milestone}}!

{{journey_context}}

This wouldn't be possible without:
- {{thanks_1}}
- {{thanks_2}}
- {{thanks_3}}

{{next_goal}}

Thank you for being part of this journey! 🙏`,
        variables: JSON.stringify([
          { name: 'milestone', description: 'The achievement (e.g., "10,000 users")', required: true },
          { name: 'journey_context', description: 'Context about the journey', required: true },
          { name: 'thanks_1', description: 'First thank you', required: true },
          { name: 'thanks_2', description: 'Second thank you', required: true },
          { name: 'thanks_3', description: 'Third thank you', required: true },
          { name: 'next_goal', description: 'What\'s next', required: true },
        ]),
        example_variables: JSON.stringify({
          milestone: '100,000 downloads',
          journey_context: 'Started 2 years ago in my garage. Today, we\'re here.',
          thanks_1: 'Our amazing community for the feedback',
          thanks_2: 'Early adopters who believed in the vision',
          thanks_3: 'The team who made it happen',
          next_goal: 'Next stop: 1 million users. Let\'s go! 🚀',
        }),
        is_system: true,
        is_public: true,
        usage_count: 0,
        tags: JSON.stringify(['milestone', 'celebration', 'achievement']),
        created_at: now,
        updated_at: now,
      },
    ];

    await queryInterface.bulkInsert('templates', templates);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('templates', { is_system: true }, {});
  },
};
