import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
  Association,
  HasManyGetAssociationsMixin,
  HasManyAddAssociationMixin,
  HasManyCountAssociationsMixin,
} from 'sequelize';
import bcrypt from 'bcrypt';
import { sequelize } from '../config/database';

// Import types for associations (will be properly typed after all models are created)
import type { Profile } from './Profile';
import type { Project } from './Project';
import type { Platform } from './Platform';
import type { Post } from './Post';

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  // Primary key
  declare id: CreationOptional<string>;

  // Attributes
  declare email: string;
  declare passwordHash: string;

  // Timestamps
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;

  // Associations
  declare profiles?: NonAttribute<Profile[]>;
  declare projects?: NonAttribute<Project[]>;
  declare platforms?: NonAttribute<Platform[]>;
  declare posts?: NonAttribute<Post[]>;

  // Association methods
  declare getProfiles: HasManyGetAssociationsMixin<Profile>;
  declare addProfile: HasManyAddAssociationMixin<Profile, string>;
  declare countProfiles: HasManyCountAssociationsMixin;

  declare getProjects: HasManyGetAssociationsMixin<Project>;
  declare addProject: HasManyAddAssociationMixin<Project, string>;
  declare countProjects: HasManyCountAssociationsMixin;

  declare getPlatforms: HasManyGetAssociationsMixin<Platform>;
  declare addPlatform: HasManyAddAssociationMixin<Platform, string>;
  declare countPlatforms: HasManyCountAssociationsMixin;

  declare getPosts: HasManyGetAssociationsMixin<Post>;
  declare addPost: HasManyAddAssociationMixin<Post, string>;
  declare countPosts: HasManyCountAssociationsMixin;

  // Static associations object
  declare static associations: {
    profiles: Association<User, Profile>;
    projects: Association<User, Project>;
    platforms: Association<User, Platform>;
    posts: Association<User, Post>;
  };

  /**
   * Compare a plain text password with the hashed password
   */
  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.passwordHash);
  }

  /**
   * Override toJSON to exclude passwordHash from serialization
   */
  toJSON(): Omit<InferAttributes<User>, 'passwordHash'> {
    const values = { ...this.get() };
    const { passwordHash: _, ...safeValues } = values;
    return safeValues;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Must be a valid email address',
        },
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user: User) => {
        if (user.passwordHash) {
          user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
        }
      },
      beforeUpdate: async (user: User) => {
        if (user.changed('passwordHash')) {
          user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
        }
      },
    },
  },
);

export { User };
export default User;
