'use strict';

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
        onDelete: 'CASCADE',
      },
      versionNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      generatedText: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      iterationPrompt: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Instructions used for this iteration (null for initial version)',
      },
      isSelected: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      promptTokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      completionTokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      totalTokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
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
