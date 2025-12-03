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
} from 'sequelize';
import { sequelize } from '../config/database';

import type { User } from './User';
import type { Post } from './Post';

class Platform extends Model<InferAttributes<Platform>, InferCreationAttributes<Platform>> {
  // Primary key
  declare id: CreationOptional<string>;

  // Foreign key
  declare userId: ForeignKey<User['id']>;

  // Attributes
  declare name: string;
  declare styleGuidelines: CreationOptional<string | null>;
  declare maxLength: CreationOptional<number | null>;

  // Timestamps
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  // Associations
  declare user?: NonAttribute<User>;
  declare posts?: NonAttribute<Post[]>;

  // Association methods
  declare getUser: BelongsToGetAssociationMixin<User>;
  declare getPosts: HasManyGetAssociationsMixin<Post>;

  // Static associations object
  declare static associations: {
    user: Association<Platform, User>;
    posts: Association<Platform, Post>;
  };
}

Platform.init(
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
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Platform name cannot be empty',
        },
      },
    },
    styleGuidelines: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    maxLength: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: {
          args: [1],
          msg: 'Max length must be at least 1',
        },
      },
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Platform',
    tableName: 'platforms',
    timestamps: true,
  },
);

export { Platform };
export default Platform;
