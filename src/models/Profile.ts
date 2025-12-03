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

class Profile extends Model<InferAttributes<Profile>, InferCreationAttributes<Profile>> {
  // Primary key
  declare id: CreationOptional<string>;

  // Foreign key
  declare userId: ForeignKey<User['id']>;

  // Attributes
  declare name: string;
  declare bio: CreationOptional<string | null>;
  declare toneTags: CreationOptional<string[]>;
  declare doRules: CreationOptional<string[]>;
  declare dontRules: CreationOptional<string[]>;

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
    user: Association<Profile, User>;
    posts: Association<Profile, Post>;
  };
}

Profile.init(
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
          msg: 'Profile name cannot be empty',
        },
      },
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    toneTags: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    doRules: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    dontRules: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'Profile',
    tableName: 'profiles',
    timestamps: true,
  },
);

export { Profile };
export default Profile;
