'use strict';

/**
 * Migration: Create Post Versions Table
 *
 * Implements version history and iteration tracking for generated posts.
 * Each post can have multiple versions created through:
 * - Initial generation
 * - Specialized iterations (shorter, stronger_hook, more_personal, add_data, simplify, custom)
 * - Variant generation (different approaches: direct, storytelling, data-driven, emotional)
 *
 * Key features:
 * - Sequential version numbering per post (v1, v2, v3...)
 * - Track iteration prompt used to create each version
 * - Selected version flag (isSelected=true) for the user's preferred version
 * - Token usage tracking for cost analysis and optimization
 * - Support for specialized iteration types (see docs/ITERATION_TYPES.md)
 * - Support for variant approaches (see docs/VARIANT_GENERATION.md)
 *
 * Constraints:
 * - Unique (postId, versionNumber) ensures no duplicate version numbers
 * - Cascade delete: deleting a post removes all its versions
 *
 * Indexes optimize:
 * - Version history queries by post
 * - Finding the selected version (isSelected=true)
 *
 * @see docs/ITERATION_TYPES.md for iteration documentation
 * @see docs/VARIANT_GENERATION.md for variant generation documentation
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('post_versions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      postId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'posts',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // Delete all versions when post is deleted
      },
      versionNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        // Sequential numbering: 1 (initial), 2 (first iteration), 3, 4...
      },
      generatedText: {
        type: Sequelize.TEXT,
        allowNull: false,
        // The actual post content for this version
      },
      iterationPrompt: {
        type: Sequelize.TEXT,
        allowNull: true,
        // NULL for initial generation, contains iteration instructions for subsequent versions
        // Example: "Make this post more concise. Target: ~350 characters..."
        comment: 'Instructions used for this iteration (null for initial version)',
      },
      isSelected: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        // Only ONE version per post should have isSelected=true
        // Indicates the version user chose as their final content
      },
      promptTokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
        // Tokens used in the LLM prompt (context + instructions)
      },
      completionTokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
        // Tokens used in the LLM response (generated text)
      },
      totalTokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
        // Total tokens = promptTokens + completionTokens
        // Used for cost tracking and analytics
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Unique constraint: only one version number per post
    await queryInterface.addConstraint('post_versions', {
      fields: ['postId', 'versionNumber'],
      type: 'unique',
      name: 'post_versions_post_id_version_number_unique',
    });

    // Index for faster lookups by postId
    await queryInterface.addIndex('post_versions', ['postId'], {
      name: 'post_versions_post_id_idx',
    });

    // Index for finding selected version
    await queryInterface.addIndex('post_versions', ['postId', 'isSelected'], {
      name: 'post_versions_post_id_is_selected_idx',
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable('post_versions');
  },
};
