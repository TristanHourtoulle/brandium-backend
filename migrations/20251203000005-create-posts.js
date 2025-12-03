'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('posts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      profileId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'profiles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      projectId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'projects',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      platformId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'platforms',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      goal: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      rawIdea: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      generatedText: {
        type: Sequelize.TEXT,
        allowNull: false,
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

    // Add indexes for faster lookups
    await queryInterface.addIndex('posts', ['userId'], {
      name: 'posts_user_id_idx',
    });
    await queryInterface.addIndex('posts', ['profileId'], {
      name: 'posts_profile_id_idx',
    });
    await queryInterface.addIndex('posts', ['projectId'], {
      name: 'posts_project_id_idx',
    });
    await queryInterface.addIndex('posts', ['platformId'], {
      name: 'posts_platform_id_idx',
    });
    await queryInterface.addIndex('posts', ['createdAt'], {
      name: 'posts_created_at_idx',
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable('posts');
  },
};
