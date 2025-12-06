'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('post_ideas', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      profile_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'profiles',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      project_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'projects',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      platform_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'platforms',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      suggested_goal: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      relevance_score: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
      },
      tags: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      generation_context: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      is_used: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      used_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      post_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'posts',
          key: 'id',
        },
        onDelete: 'SET NULL',
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

    // Create indexes for better query performance
    await queryInterface.addIndex('post_ideas', ['user_id'], {
      name: 'idx_post_ideas_user_id',
    });
    await queryInterface.addIndex('post_ideas', ['profile_id'], {
      name: 'idx_post_ideas_profile_id',
    });
    await queryInterface.addIndex('post_ideas', ['project_id'], {
      name: 'idx_post_ideas_project_id',
    });
    await queryInterface.addIndex('post_ideas', ['platform_id'], {
      name: 'idx_post_ideas_platform_id',
    });
    await queryInterface.addIndex('post_ideas', ['is_used'], {
      name: 'idx_post_ideas_is_used',
    });
    await queryInterface.addIndex('post_ideas', ['created_at'], {
      name: 'idx_post_ideas_created_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('post_ideas');
  },
};
