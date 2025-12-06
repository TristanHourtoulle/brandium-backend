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
import type { Platform } from './Platform';

/**
 * Engagement metrics for a historical post
 */
export interface HistoricalPostEngagement {
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
}

/**
 * Flexible metadata structure for additional data
 */
export interface HistoricalPostMetadata {
  [key: string]: unknown;
}

class HistoricalPost extends Model<
  InferAttributes<HistoricalPost>,
  InferCreationAttributes<HistoricalPost>
> {
  // Primary key
  declare id: CreationOptional<string>;

  // Foreign keys
  declare userId: ForeignKey<User['id']>;
  declare profileId: ForeignKey<Profile['id']>;
  declare platformId: CreationOptional<ForeignKey<Platform['id']> | null>;

  // Attributes
  declare content: string;
  declare publishedAt: CreationOptional<Date | null>;
  declare externalUrl: CreationOptional<string | null>;
  declare engagement: CreationOptional<HistoricalPostEngagement>;
  declare metadata: CreationOptional<HistoricalPostMetadata>;

  // Timestamps
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  // Associations
  declare user?: NonAttribute<User>;
  declare profile?: NonAttribute<Profile>;
  declare platform?: NonAttribute<Platform>;

  // Association methods
  declare getUser: BelongsToGetAssociationMixin<User>;
  declare getProfile: BelongsToGetAssociationMixin<Profile>;
  declare getPlatform: BelongsToGetAssociationMixin<Platform>;

  // Static associations object
  declare static associations: {
    user: Association<HistoricalPost, User>;
    profile: Association<HistoricalPost, Profile>;
    platform: Association<HistoricalPost, Platform>;
  };
}

HistoricalPost.init(
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
      allowNull: false,
      references: {
        model: 'profiles',
        key: 'id',
      },
      onDelete: 'CASCADE',
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
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Historical post content cannot be empty',
        },
        len: {
          args: [1, 50000],
          msg: 'Content must be between 1 and 50000 characters',
        },
      },
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    externalUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        isUrl: {
          msg: 'External URL must be a valid URL',
        },
      },
    },
    engagement: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'HistoricalPost',
    tableName: 'historical_posts',
    timestamps: true,
  },
);

export { HistoricalPost };
export default HistoricalPost;
