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

class Project extends Model<InferAttributes<Project>, InferCreationAttributes<Project>> {
  // Primary key
  declare id: CreationOptional<string>;

  // Foreign key
  declare userId: ForeignKey<User['id']>;

  // Attributes
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare audience: CreationOptional<string | null>;
  declare keyMessages: CreationOptional<string[]>;

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
    user: Association<Project, User>;
    posts: Association<Project, Post>;
  };
}

Project.init(
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
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Project name cannot be empty',
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    audience: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    keyMessages: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Project',
    tableName: 'projects',
    timestamps: true,
  },
);

export { Project };
export default Project;
