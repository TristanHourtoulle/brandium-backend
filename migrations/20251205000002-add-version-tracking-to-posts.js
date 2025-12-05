'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add currentVersionId to track the selected/current version
    await queryInterface.addColumn('posts', 'currentVersionId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'post_versions',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Add totalVersions counter for quick access
    await queryInterface.addColumn('posts', 'totalVersions', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });

    // Add index for currentVersionId
    await queryInterface.addIndex('posts', ['currentVersionId'], {
      name: 'posts_current_version_id_idx',
    });
  },

  async down(queryInterface, _Sequelize) {
    await queryInterface.removeIndex('posts', 'posts_current_version_id_idx');
    await queryInterface.removeColumn('posts', 'totalVersions');
    await queryInterface.removeColumn('posts', 'currentVersionId');
  },
};
