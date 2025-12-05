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

import type { Post } from './Post';

class PostVersion extends Model<InferAttributes<PostVersion>, InferCreationAttributes<PostVersion>> {
  // Primary key
  declare id: CreationOptional<string>;

  // Foreign keys
  declare postId: ForeignKey<Post['id']>;

  // Attributes
  declare versionNumber: number;
  declare generatedText: string;
  declare iterationPrompt: CreationOptional<string | null>;
  declare isSelected: CreationOptional<boolean>;
  declare promptTokens: CreationOptional<number | null>;
  declare completionTokens: CreationOptional<number | null>;
  declare totalTokens: CreationOptional<number | null>;

  // Timestamps
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  // Associations
  declare post?: NonAttribute<Post>;

  // Association methods
  declare getPost: BelongsToGetAssociationMixin<Post>;

  // Static associations object
  declare static associations: {
    post: Association<PostVersion, Post>;
  };
}

PostVersion.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    postId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'posts',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    versionNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
    generatedText: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Generated text cannot be empty',
        },
      },
    },
    iterationPrompt: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isSelected: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    promptTokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    completionTokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    totalTokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'PostVersion',
    tableName: 'post_versions',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['postId', 'versionNumber'],
        name: 'post_versions_post_id_version_number_unique',
      },
    ],
  },
);

export { PostVersion };
export default PostVersion;
