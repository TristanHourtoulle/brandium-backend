import { Model, DataTypes, Optional, CreationOptional } from 'sequelize';
import { sequelize } from '../config/database';

/**
 * Template variable definition
 */
export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

/**
 * Template attributes
 */
export interface TemplateAttributes {
  id: string;
  userId: string | null;
  profileId: string | null;
  name: string;
  description: string | null;
  category: string;
  content: string;
  variables: TemplateVariable[];
  exampleVariables: Record<string, string> | null;
  platformId: string | null;
  isSystem: boolean;
  isPublic: boolean;
  usageCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Optional fields when creating a template
 */
export type TemplateCreationAttributes = Optional<
  TemplateAttributes,
  | 'id'
  | 'userId'
  | 'profileId'
  | 'description'
  | 'exampleVariables'
  | 'platformId'
  | 'isSystem'
  | 'isPublic'
  | 'usageCount'
  | 'tags'
  | 'createdAt'
  | 'updatedAt'
>;

/**
 * Template model
 */
class Template extends Model<TemplateAttributes, TemplateCreationAttributes> {
  declare id: CreationOptional<string>;
  declare userId: string | null;
  declare profileId: string | null;
  declare name: string;
  declare description: CreationOptional<string | null>;
  declare category: string;
  declare content: string;
  declare variables: TemplateVariable[];
  declare exampleVariables: CreationOptional<Record<string, string> | null>;
  declare platformId: string | null;
  declare isSystem: CreationOptional<boolean>;
  declare isPublic: CreationOptional<boolean>;
  declare usageCount: CreationOptional<number>;
  declare tags: CreationOptional<string[]>;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

Template.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'user_id',
    },
    profileId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'profile_id',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    variables: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    exampleVariables: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'example_variables',
    },
    platformId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'platform_id',
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_system',
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_public',
    },
    usageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'usage_count',
    },
    tags: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'templates',
    underscored: true,
    timestamps: true,
  },
);

export { Template };
export default Template;
