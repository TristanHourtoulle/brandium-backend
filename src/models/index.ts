import { sequelize } from '../config/database';
import { User } from './User';
import { Profile } from './Profile';
import { Project } from './Project';
import { Platform } from './Platform';
import { Post } from './Post';
import { PostVersion } from './PostVersion';
import { HistoricalPost } from './HistoricalPost';
import { PostIdea } from './PostIdea';

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

Profile.hasMany(HistoricalPost, {
  foreignKey: 'profileId',
  as: 'historicalPosts',
  onDelete: 'CASCADE',
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

// Post <-> PostVersion associations
Post.hasMany(PostVersion, {
  foreignKey: 'postId',
  as: 'versions',
  onDelete: 'CASCADE',
});

Post.belongsTo(PostVersion, {
  foreignKey: 'currentVersionId',
  as: 'currentVersion',
});

PostVersion.belongsTo(Post, {
  foreignKey: 'postId',
  as: 'post',
});

// HistoricalPost associations
HistoricalPost.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

HistoricalPost.belongsTo(Profile, {
  foreignKey: 'profileId',
  as: 'profile',
});

HistoricalPost.belongsTo(Platform, {
  foreignKey: 'platformId',
  as: 'platform',
});

// PostIdea associations
User.hasMany(PostIdea, {
  foreignKey: 'userId',
  as: 'postIdeas',
  onDelete: 'CASCADE',
});

PostIdea.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

PostIdea.belongsTo(Profile, {
  foreignKey: 'profileId',
  as: 'profile',
});

PostIdea.belongsTo(Project, {
  foreignKey: 'projectId',
  as: 'project',
});

PostIdea.belongsTo(Platform, {
  foreignKey: 'platformId',
  as: 'platform',
});

PostIdea.belongsTo(Post, {
  foreignKey: 'postId',
  as: 'post',
});

Profile.hasMany(PostIdea, {
  foreignKey: 'profileId',
  as: 'postIdeas',
  onDelete: 'SET NULL',
});

Project.hasMany(PostIdea, {
  foreignKey: 'projectId',
  as: 'postIdeas',
  onDelete: 'SET NULL',
});

Platform.hasMany(PostIdea, {
  foreignKey: 'platformId',
  as: 'postIdeas',
  onDelete: 'SET NULL',
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
  PostVersion,
  HistoricalPost,
  PostIdea,
};

export {
  sequelize,
  User,
  Profile,
  Project,
  Platform,
  Post,
  PostVersion,
  HistoricalPost,
  PostIdea,
};
export default db;
