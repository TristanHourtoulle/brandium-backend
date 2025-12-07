'use strict';

/**
 * Migration: Create Templates Table
 *
 * Creates the templates table for reusable post structures with variable placeholders.
 * Templates allow users to standardize recurring post types (announcements, tutorials, etc.)
 * while maintaining flexibility through JSONB-based variables.
 *
 * Key features:
 * - 10 template categories (announcement, tutorial, experience, question, tip, milestone, etc.)
 * - JSONB variables system for dynamic content ({{variable_name}} syntax)
 * - System templates (is_system=true) vs user-created templates
 * - Public/private sharing (is_public flag)
 * - Usage tracking (usage_count for analytics)
 * - Optional profile and platform associations
 *
 * Indexes optimize:
 * - User-specific template queries
 * - Category filtering
 * - System/public template discovery
 * - Platform-specific templates
 *
 * @see docs/API_TEMPLATES.md for detailed template documentation
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true, // NULL for system templates
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE', // Delete user's templates when user is deleted
      },
      profile_id: {
        type: Sequelize.UUID,
        allowNull: true, // Optional: templates can be profile-specific
        references: {
          model: 'profiles',
          key: 'id',
        },
        onDelete: 'SET NULL', // Keep template if profile is deleted
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
        // Categories: announcement, tutorial, experience, question, tip, milestone,
        // behind-the-scenes, testimonial, poll, event
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
        // Template content with {{variable_name}} placeholders
      },
      variables: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: '[]',
        // Array of { name, description, required, defaultValue? }
        // Defines the variables that can be used in the content
      },
      example_variables: {
        type: Sequelize.JSONB,
        allowNull: true,
        // Example values for variables to demonstrate usage
        // { variable_name: "example value", ... }
      },
      platform_id: {
        type: Sequelize.UUID,
        allowNull: true, // Optional: templates can be platform-specific
        references: {
          model: 'platforms',
          key: 'id',
        },
        onDelete: 'SET NULL', // Keep template if platform is deleted
      },
      is_system: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        // System templates are pre-built, non-modifiable, accessible to all users
      },
      is_public: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        // Public templates can be discovered and duplicated by other users
      },
      usage_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        // Incremented each time template is used to generate a post
        // Used for analytics and "most popular templates" features
      },
      tags: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: '[]',
        // Array of strings for categorization and search
        // e.g., ["product", "launch", "saas", "b2b"]
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Index: Fast user template queries (GET /api/templates?userId=...)
    await queryInterface.addIndex('templates', ['user_id'], {
      name: 'idx_templates_user_id',
    });

    // Index: Profile-specific template filtering
    await queryInterface.addIndex('templates', ['profile_id'], {
      name: 'idx_templates_profile_id',
    });

    // Index: Category filtering (GET /api/templates?category=announcement)
    await queryInterface.addIndex('templates', ['category'], {
      name: 'idx_templates_category',
    });

    // Index: System template discovery (all users can see is_system=true)
    await queryInterface.addIndex('templates', ['is_system'], {
      name: 'idx_templates_is_system',
    });

    // Index: Public template search (users can discover is_public=true)
    await queryInterface.addIndex('templates', ['is_public'], {
      name: 'idx_templates_is_public',
    });

    // Index: Platform-specific templates (GET /api/templates?platformId=...)
    await queryInterface.addIndex('templates', ['platform_id'], {
      name: 'idx_templates_platform_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('templates');
  },
};
