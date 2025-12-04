require('dotenv').config();

// Support DATABASE_URL (Railway, Heroku, etc.)
const databaseUrl = process.env.DATABASE_URL;

// If DATABASE_URL is set, use it for all environments
const urlConfig = databaseUrl
  ? {
      use_env_variable: 'DATABASE_URL',
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
    }
  : null;

module.exports = {
  development: urlConfig || {
    username: process.env.DB_USER || 'brandium_user',
    password: process.env.DB_PASSWORD || 'brandium_pass',
    database: process.env.DB_NAME || 'brandium_dev',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
    define: {
      timestamps: true,
      underscored: false,
    },
  },
  test: urlConfig || {
    username: process.env.DB_USER || 'brandium_user',
    password: process.env.DB_PASSWORD || 'brandium_pass',
    database: 'brandium_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    define: {
      timestamps: true,
      underscored: false,
    },
  },
  production: urlConfig || {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
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
