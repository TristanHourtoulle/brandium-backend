import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
  NonAttribute,
  Association,
  BelongsToGetAssociationMixin,
  HasManyGetAssociationsMixin,
  HasManyCreateAssociationMixin,
  HasManyCountAssociationsMixin,
} from 'sequelize';
import { sequelize } from '../config/database';

import type { User } from './User';
import type { Profile } from './Profile';
import type { Project } from './Project';
import type { Platform } from './Platform';
import type { PostVersion } from './PostVersion';

class Post extends Model<InferAttributes<Post>, InferCreationAttributes<Post>> {
  // Primary key
  declare id: CreationOptional<string>;

  // Foreign keys
  declare userId: ForeignKey<User['id']>;
  declare profileId: CreationOptional<ForeignKey<Profile['id']> | null>;
  declare projectId: CreationOptional<ForeignKey<Project['id']> | null>;
  declare platformId: CreationOptional<ForeignKey<Platform['id']> | null>;
  declare currentVersionId: CreationOptional<ForeignKey<PostVersion['id']> | null>;

  // Attributes
  declare goal: CreationOptional<string | null>;
  declare rawIdea: string;
  declare generatedText: string;
  declare totalVersions: CreationOptional<number>;

  // Timestamps
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  // Associations
  declare user?: NonAttribute<User>;
  declare profile?: NonAttribute<Profile | null>;
  declare project?: NonAttribute<Project | null>;
  declare platform?: NonAttribute<Platform | null>;
  declare versions?: NonAttribute<PostVersion[]>;
  declare currentVersion?: NonAttribute<PostVersion | null>;

  // Association methods
  declare getUser: BelongsToGetAssociationMixin<User>;
  declare getProfile: BelongsToGetAssociationMixin<Profile>;
  declare getProject: BelongsToGetAssociationMixin<Project>;
  declare getPlatform: BelongsToGetAssociationMixin<Platform>;
  declare getVersions: HasManyGetAssociationsMixin<PostVersion>;
  declare createVersion: HasManyCreateAssociationMixin<PostVersion>;
  declare countVersions: HasManyCountAssociationsMixin;
  declare getCurrentVersion: BelongsToGetAssociationMixin<PostVersion>;

  // Static associations object
  declare static associations: {
    user: Association<Post, User>;
    profile: Association<Post, Profile>;
    project: Association<Post, Project>;
    platform: Association<Post, Platform>;
    versions: Association<Post, PostVersion>;
    currentVersion: Association<Post, PostVersion>;
  };
}

Post.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    profileId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'profiles',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'projects',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    platformId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'platforms',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    goal: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rawIdea: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Raw idea cannot be empty',
        },
      },
    },
    generatedText: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    currentVersionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'post_versions',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    totalVersions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Post',
    tableName: 'posts',
    timestamps: true,
  },
);

export { Post };
export default Post;
