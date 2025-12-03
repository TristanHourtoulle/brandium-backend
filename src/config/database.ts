import 'dotenv/config';
import { Sequelize, Options } from 'sequelize';

export type Environment = 'development' | 'test' | 'production';

interface DatabaseConfig {
  username: string;
  password: string;
  database: string;
  host: string;
  port: number;
  dialect: 'postgres';
  logging: boolean | ((sql: string) => void);
  define: {
    timestamps: boolean;
    underscored: boolean;
  };
  dialectOptions?: {
    ssl?: {
      require: boolean;
      rejectUnauthorized: boolean;
    };
  };
}

type DatabaseConfigs = Record<Environment, DatabaseConfig>;

const config: DatabaseConfigs = {
  development: {
    username: process.env.DB_USER || 'brandium_user',
    password: process.env.DB_PASSWORD || 'brandium_pass',
    database: process.env.DB_NAME || 'brandium_dev',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: console.log,
    define: {
      timestamps: true,
      underscored: false,
    },
  },
  test: {
    username: process.env.DB_USER || 'brandium_user',
    password: process.env.DB_PASSWORD || 'brandium_pass',
    database: 'brandium_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: false,
    define: {
      timestamps: true,
      underscored: false,
    },
  },
  production: {
    username: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
    host: process.env.DB_HOST || '',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: false,
    define: {
      timestamps: true,
      underscored: false,
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};

const env: Environment = (process.env.NODE_ENV as Environment) || 'development';
const currentConfig = config[env];

// Create Sequelize instance
const sequelize = new Sequelize(
  currentConfig.database,
  currentConfig.username,
  currentConfig.password,
  currentConfig as Options,
);

export { sequelize, config, currentConfig };
export default sequelize;
