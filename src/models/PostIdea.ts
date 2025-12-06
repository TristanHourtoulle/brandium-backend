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
} from 'sequelize';
import { sequelize } from '../config/database';

import type { User } from './User';
import type { Profile } from './Profile';
import type { Project } from './Project';
import type { Platform } from './Platform';
import type { Post } from './Post';

/**
 * Context information about how the idea was generated
 */
export interface GenerationContext {
  mode: 'auto' | 'manual' | 'custom';
  customContext?: string;
  historicalPostsCount: number;
  recentTopicsExcluded: string[];
  timestamp: string;
}

class PostIdea extends Model<InferAttributes<PostIdea>, InferCreationAttributes<PostIdea>> {
  // Primary key
  declare id: CreationOptional<string>;

  // Foreign keys
  declare userId: ForeignKey<User['id']>;
  declare profileId: CreationOptional<ForeignKey<Profile['id']> | null>;
  declare projectId: CreationOptional<ForeignKey<Project['id']> | null>;
  declare platformId: CreationOptional<ForeignKey<Platform['id']> | null>;
  declare postId: CreationOptional<ForeignKey<Post['id']> | null>;

  // Attributes
  declare title: string;
  declare description: string;
  declare suggestedGoal: CreationOptional<string | null>;
  declare relevanceScore: CreationOptional<number | null>;
  declare tags: CreationOptional<string[]>;
  declare generationContext: CreationOptional<GenerationContext | null>;
  declare isUsed: CreationOptional<boolean>;
  declare usedAt: CreationOptional<Date | null>;

  // Timestamps
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  // Associations
  declare user?: NonAttribute<User>;
  declare profile?: NonAttribute<Profile | null>;
  declare project?: NonAttribute<Project | null>;
  declare platform?: NonAttribute<Platform | null>;
  declare post?: NonAttribute<Post | null>;

  // Association methods
  declare getUser: BelongsToGetAssociationMixin<User>;
  declare getProfile: BelongsToGetAssociationMixin<Profile>;
  declare getProject: BelongsToGetAssociationMixin<Project>;
  declare getPlatform: BelongsToGetAssociationMixin<Platform>;
  declare getPost: BelongsToGetAssociationMixin<Post>;

  // Static associations object
  declare static associations: {
    user: Association<PostIdea, User>;
    profile: Association<PostIdea, Profile>;
    project: Association<PostIdea, Project>;
    platform: Association<PostIdea, Platform>;
    post: Association<PostIdea, Post>;
  };
}

PostIdea.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    profileId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'profile_id',
      references: {
        model: 'profiles',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'project_id',
      references: {
        model: 'projects',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    platformId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'platform_id',
      references: {
        model: 'platforms',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    postId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'post_id',
      references: {
        model: 'posts',
        key: 'id',
      },
      onDelete: 'SET NULL',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Idea title cannot be empty',
        },
        len: {
          args: [1, 255],
          msg: 'Title must be between 1 and 255 characters',
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Idea description cannot be empty',
        },
      },
    },
    suggestedGoal: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'suggested_goal',
    },
    relevanceScore: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      field: 'relevance_score',
      validate: {
        min: {
          args: [0],
          msg: 'Relevance score must be at least 0',
        },
        max: {
          args: [1],
          msg: 'Relevance score must be at most 1',
        },
      },
    },
    tags: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    generationContext: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'generation_context',
    },
    isUsed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_used',
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'used_at',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    modelName: 'PostIdea',
    tableName: 'post_ideas',
    timestamps: true,
    underscored: true,
  },
);

export { PostIdea };
export default PostIdea;
