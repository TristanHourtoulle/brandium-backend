'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('historical_posts', {
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
        allowNull: false,
        references: {
          model: 'profiles',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      publishedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      externalUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      engagement: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Structure: { likes: 0, comments: 0, shares: 0, views: 0 }',
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Flexible structure for additional data',
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

    // Add CHECK constraint for non-empty content
    await queryInterface.sequelize.query(`
      ALTER TABLE historical_posts
      ADD CONSTRAINT historical_posts_content_not_empty
      CHECK (char_length(content) > 0)
    `);

    // Performance indexes
    await queryInterface.addIndex('historical_posts', ['profileId'], {
      name: 'idx_historical_posts_profile_id',
    });

    await queryInterface.addIndex('historical_posts', ['platformId'], {
      name: 'idx_historical_posts_platform_id',
    });

    await queryInterface.addIndex('historical_posts', ['publishedAt'], {
      name: 'idx_historical_posts_published_at',
      order: [['publishedAt', 'DESC']],
    });

    await queryInterface.addIndex('historical_posts', ['profileId', 'platformId'], {
      name: 'idx_historical_posts_profile_platform',
    });

    await queryInterface.addIndex('historical_posts', ['userId'], {
      name: 'idx_historical_posts_user_id',
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.dropTable('historical_posts');
  },
};
