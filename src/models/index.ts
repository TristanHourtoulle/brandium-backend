import { sequelize } from '../config/database';
import { User } from './User';
import { Profile } from './Profile';
import { Project } from './Project';
import { Platform } from './Platform';
import { Post } from './Post';

// =====================================
// Define Associations
// =====================================

// User associations
User.hasMany(Profile, {
  foreignKey: 'userId',
  as: 'profiles',
  onDelete: 'CASCADE',
});

User.hasMany(Project, {
  foreignKey: 'userId',
  as: 'projects',
  onDelete: 'CASCADE',
});

User.hasMany(Platform, {
  foreignKey: 'userId',
  as: 'platforms',
  onDelete: 'CASCADE',
});

User.hasMany(Post, {
  foreignKey: 'userId',
  as: 'posts',
  onDelete: 'CASCADE',
});

// Profile associations
Profile.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Profile.hasMany(Post, {
  foreignKey: 'profileId',
  as: 'posts',
  onDelete: 'SET NULL',
});

// Project associations
Project.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Project.hasMany(Post, {
  foreignKey: 'projectId',
  as: 'posts',
  onDelete: 'SET NULL',
});

// Platform associations
Platform.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Platform.hasMany(Post, {
  foreignKey: 'platformId',
  as: 'posts',
  onDelete: 'SET NULL',
});

// Post associations
Post.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

Post.belongsTo(Profile, {
  foreignKey: 'profileId',
  as: 'profile',
});

Post.belongsTo(Project, {
  foreignKey: 'projectId',
  as: 'project',
});

Post.belongsTo(Platform, {
  foreignKey: 'platformId',
  as: 'platform',
});

// =====================================
// Export all models and sequelize instance
// =====================================
const db = {
  sequelize,
  User,
  Profile,
  Project,
  Platform,
  Post,
};

export { sequelize, User, Profile, Project, Platform, Post };
export default db;
